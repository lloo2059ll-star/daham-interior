(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SITE_JOURNAL_MIGRATION = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var MAX_BATCH_SIZE = 10;
  var MAX_ERRORS = 100;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function hash32(value, seed) {
    var hash = (2166136261 ^ seed) >>> 0;
    for (var index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
      hash ^= hash >>> 13;
    }
    return hash >>> 0;
  }

  function mappedUuid(value) {
    value = clean(value);
    var hex = [0, 1, 2, 3].map(function(seed) {
      return hash32(value, 0x9e3779b9 * (seed + 1)).toString(16).padStart(8, '0');
    }).join('').split('');
    hex[12] = '5';
    hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
    return hex.slice(0, 8).join('') + '-' + hex.slice(8, 12).join('') + '-' + hex.slice(12, 16).join('') + '-' + hex.slice(16, 20).join('') + '-' + hex.slice(20).join('');
  }

  function fallbackIdentity(record, index) {
    var values = {
      date: record && record.date,
      projId: record && record.projId,
      projName: record && (record.projName || record.proj),
      worker: record && record.worker,
      visitType: record && record.visitType,
      content: record && record.content,
      createdAt: record && record.createdAt,
      index: index
    };
    return 'legacy-' + mappedUuid(JSON.stringify(values));
  }

  function legacyId(record, index) {
    return clean(record && record.id) || fallbackIdentity(record, index);
  }

  function photoValue(photo) {
    if (typeof photo === 'string') return photo;
    if (!photo || typeof photo !== 'object') return '';
    return photo.dataUrl || photo.dataURL || photo.base64 || photo.src || photo.url || photo.data || '';
  }

  function extensionFor(type) {
    type = clean(type).toLowerCase();
    if (type === 'image/png') return 'png';
    if (type === 'image/heic' || type === 'image/heif') return 'heic';
    if (type === 'image/webp') return 'webp';
    return 'jpg';
  }

  function safeNamePart(value) {
    return clean(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'record';
  }

  function photoName(photo, id, index, type) {
    var supplied = photo && typeof photo === 'object' && clean(photo.name || photo.originalName);
    return supplied || ('legacy-' + safeNamePart(id) + '-' + (index + 1) + '.' + extensionFor(type));
  }

  function byteSize(photo) {
    if (photo && Number.isFinite(Number(photo.size))) return Number(photo.size);
    if (photo && Number.isFinite(Number(photo.byteSize))) return Number(photo.byteSize);
    return 0;
  }

  function photoRows(result) {
    return result && Array.isArray(result.photos) ? result.photos : [];
  }

  function resultJournalExists(result) {
    return !!(result && (result.journalExists === true || result.journal || result.journalId));
  }

  function photoMatches(row, expected) {
    if (!row) return false;
    var rowId = clean(row.id == null ? row.photoId : row.id);
    var rowBytes = Number(row.byteSize == null ? row.byte_size : row.byteSize);
    return rowId === expected.photoId && rowBytes === expected.byteSize && clean(row.sha256).toLowerCase() === expected.sha256 && clean(row.status || 'ready') === 'ready';
  }

  function verificationMatches(result, expectedPhotos) {
    if (!resultJournalExists(result)) return false;
    var rows = photoRows(result).filter(function(row) { return clean(row.status || 'ready') === 'ready'; });
    if (rows.length !== expectedPhotos.length) return false;
    return expectedPhotos.every(function(expected) {
      return rows.some(function(row) { return photoMatches(row, expected); });
    });
  }

  function errorMessage(error) {
    return (clean(error && error.message ? error.message : error)
      .replace(/data:[^,\s]{1,100};base64,[A-Za-z0-9+/=]+/gi, '[photo payload omitted]')
      .replace(/[A-Za-z0-9+/]{160,}={0,2}/g, '[photo payload omitted]')
      .slice(0, 300) || 'migration failed');
  }

  function initialState(value) {
    value = value && typeof value === 'object' ? value : {};
    return {
      cursor: Math.max(0, Number.isInteger(Number(value.cursor)) ? Number(value.cursor) : 0),
      status: clean(value.status) || 'idle',
      ids: value.ids && typeof value.ids === 'object' && !Array.isArray(value.ids) ? Object.assign({}, value.ids) : {},
      errors: Array.isArray(value.errors) ? value.errors.slice(-MAX_ERRORS).map(function(item) {
        return { legacyId: clean(item && item.legacyId), journalId: clean(item && item.journalId), message: errorMessage(item && item.message) };
      }) : []
    };
  }

  function setStateResult(state, id, journalId, status, message) {
    state.ids[id] = { journalId: journalId, status: status };
    state.errors = state.errors.filter(function(item) { return item.legacyId !== id; });
    if (status === 'failed') {
      state.errors.push({ legacyId: id, journalId: journalId, message: errorMessage(message) });
      state.errors = state.errors.slice(-MAX_ERRORS);
    }
  }

  function stateStatus(state, total) {
    var hasFailures = Object.keys(state.ids).some(function(id) { return state.ids[id] && state.ids[id].status === 'failed'; });
    if (state.cursor < total) return hasFailures ? 'partial' : 'running';
    return hasFailures ? 'partial' : 'complete';
  }

  async function preparePhotos(record, id, journalId, adapters) {
    var photos = Array.isArray(record && record.photos) ? record.photos : [];
    var prepared = [];
    for (var index = 0; index < photos.length; index += 1) {
      var source = photoValue(photos[index]);
      if (!source) throw new Error('corrupt Base64 photo at index ' + index);
      var blob = await adapters.decodeBase64(source, { legacyId: id, journalId: journalId, photoIndex: index, photo: photos[index] });
      if (!blob || typeof blob.arrayBuffer !== 'function') throw new Error('Base64 decoder did not return a Blob');
      var size = Number(blob.size);
      if (!Number.isFinite(size) || size <= 0) size = byteSize(blob);
      if (!Number.isFinite(size) || size <= 0) throw new Error('decoded photo is empty');
      var checksum = clean(await adapters.sha256(blob)).toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(checksum)) throw new Error('decoded photo SHA-256 is invalid');
      var photoId = mappedUuid('site-journal-photo:' + id + ':' + index);
      var mimeType = clean(blob.type || (photos[index] && photos[index].type)) || 'image/jpeg';
      var originalName = photoName(photos[index], id, index, mimeType);
      prepared.push({
        blob: blob,
        photoId: photoId,
        journalId: journalId,
        legacyId: id,
        projectId: clean(record && record.projId),
        photoIndex: index,
        sortOrder: index,
        originalName: originalName,
        mimeType: mimeType,
        byteSize: size,
        sha256: checksum,
        storagePath: journalId + '/' + photoId + '/' + originalName
      });
    }
    return prepared;
  }

  async function migrateOne(record, index, adapters) {
    var id = legacyId(record, index);
    var journalId = mappedUuid('site-journal:' + id);
    var expectedPhotos = await preparePhotos(record, id, journalId, adapters);
    var verificationInput = { legacyId: id, journalId: journalId, expectedPhotos: expectedPhotos.map(withoutBlob) };
    var existing = await adapters.verifyJournal(Object.assign({ phase: 'existing' }, verificationInput));
    if (verificationMatches(existing, expectedPhotos)) return { status: 'skipped', legacyId: id, journalId: journalId };

    var existingRows = photoRows(existing);
    existingRows.forEach(function(row) {
      var expected = expectedPhotos.find(function(photo) { return photo.photoId === clean(row.id == null ? row.photoId : row.id); });
      if (expected && !photoMatches(row, expected)) throw new Error('existing photo verification conflict for ' + expected.photoId);
    });

    var journal = existing && existing.journal;
    if (!resultJournalExists(existing)) {
      journal = await adapters.createJournal({
        legacyId: id,
        journalId: journalId,
        projectId: clean(record && record.projId),
        projectName: clean(record && (record.projName || record.proj)),
        workDate: clean(record && record.date),
        worker: clean(record && record.worker),
        visitType: clean(record && record.visitType) || 'none',
        trade: clean(record && record.worker),
        content: clean(record && record.content),
        createdAt: clean(record && record.createdAt),
        updatedAt: clean(record && record.updatedAt)
      });
    }

    for (var photoIndex = 0; photoIndex < expectedPhotos.length; photoIndex += 1) {
      var photo = expectedPhotos[photoIndex];
      var row = existingRows.find(function(item) { return clean(item.id == null ? item.photoId : item.id) === photo.photoId; });
      if (row && photoMatches(row, photo)) continue;
      var uploadInput = Object.assign({ journal: journal }, withoutBlob(photo));
      await adapters.uploadPhoto(photo.blob, uploadInput);
      try {
        await adapters.savePhotoMetadata(uploadInput);
      } catch (error) {
        if (typeof adapters.removeObject === 'function') {
          try { await adapters.removeObject(uploadInput); } catch (cleanupError) { error.cleanupError = cleanupError; }
        }
        throw error;
      }
    }

    var finalVerification = await adapters.verifyJournal(Object.assign({ phase: 'final' }, verificationInput));
    if (!verificationMatches(finalVerification, expectedPhotos)) throw new Error('journal photo verification failed');
    return { status: 'migrated', legacyId: id, journalId: journalId };
  }

  function withoutBlob(photo) {
    return {
      photoId: photo.photoId,
      journalId: photo.journalId,
      legacyId: photo.legacyId,
      projectId: photo.projectId,
      photoIndex: photo.photoIndex,
      sortOrder: photo.sortOrder,
      originalName: photo.originalName,
      mimeType: photo.mimeType,
      byteSize: photo.byteSize,
      sha256: photo.sha256,
      storagePath: photo.storagePath
    };
  }

  function requireAdapters(adapters) {
    ['loadState', 'persistState', 'decodeBase64', 'sha256', 'createJournal', 'uploadPhoto', 'savePhotoMetadata', 'verifyJournal'].forEach(function(name) {
      if (!adapters || typeof adapters[name] !== 'function') throw new Error('migration adapter ' + name + ' is required');
    });
  }

  async function migrateLegacyRecords(records, adapters, options) {
    records = Array.isArray(records) ? records : [];
    options = options || {};
    requireAdapters(adapters);
    var state = initialState(await adapters.loadState());
    var batchSize = Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(Number(options.batchSize) || MAX_BATCH_SIZE)));
    var explicitCursor = options.cursor == null ? null : Math.max(0, Math.floor(Number(options.cursor) || 0));
    var start = explicitCursor == null ? Math.min(state.cursor, records.length) : Math.min(explicitCursor, records.length);
    var retryIds = Array.isArray(options.recordIds) ? options.recordIds.map(clean).filter(Boolean).slice(0, batchSize) : null;
    var selected = retryIds ? records.map(function(record, index) { return { record: record, index: index, id: legacyId(record, index) }; })
      .filter(function(item) { return retryIds.indexOf(item.id) !== -1; }).slice(0, batchSize)
      : records.slice(start, start + batchSize).map(function(record, offset) { return { record: record, index: start + offset, id: legacyId(record, start + offset) }; });
    var summary = { migrated: 0, skipped: 0, failed: 0, cursor: state.cursor, results: [] };

    for (var selectedIndex = 0; selectedIndex < selected.length; selectedIndex += 1) {
      var item = selected[selectedIndex];
      try {
        var result = await migrateOne(item.record, item.index, adapters);
        summary[result.status] += 1;
        summary.results.push(result);
        setStateResult(state, result.legacyId, result.journalId, result.status);
      } catch (error) {
        var journalId = mappedUuid('site-journal:' + item.id);
        var message = errorMessage(error);
        summary.failed += 1;
        summary.results.push({ status: 'failed', legacyId: item.id, journalId: journalId, error: message });
        setStateResult(state, item.id, journalId, 'failed', message);
      }
      if (!retryIds) state.cursor = Math.max(state.cursor, item.index + 1);
      state.status = stateStatus(state, records.length);
      await adapters.persistState(initialState(state));
    }

    summary.cursor = state.cursor;
    if (!selected.length) {
      state.status = stateStatus(state, records.length);
      await adapters.persistState(initialState(state));
    }
    if (!retryIds && state.cursor < records.length && typeof adapters.yield === 'function') await adapters.yield();
    return summary;
  }

  function rowId(row) {
    return clean(row && row.id);
  }

  function rowDate(row) {
    return clean(row && (row.work_date || row.date));
  }

  function rowCreated(row) {
    return clean(row && (row.created_at || row.createdAt));
  }

  function mergeLegacyAndNormalized(normalized, legacy, migrationState) {
    normalized = Array.isArray(normalized) ? normalized : [];
    legacy = Array.isArray(legacy) ? legacy : [];
    var ids = migrationState && migrationState.ids && typeof migrationState.ids === 'object' ? migrationState.ids : {};
    var mappedJournalIds = {};
    Object.keys(ids).forEach(function(id) {
      var mapping = ids[id] || {};
      if (mapping.journalId) mappedJournalIds[clean(mapping.journalId)] = { legacyId: id, verified: mapping.status === 'verified' || mapping.status === 'migrated' || mapping.status === 'skipped' };
    });
    var normalizedById = {};
    normalized.forEach(function(row) {
      var id = rowId(row);
      if (id && !normalizedById[id]) normalizedById[id] = row;
    });
    var output = [];
    Object.keys(normalizedById).forEach(function(id) {
      if (!mappedJournalIds[id]) output.push(normalizedById[id]);
    });
    var seenLegacy = {};
    legacy.forEach(function(row, index) {
      var id = legacyId(row, index);
      if (seenLegacy[id]) return;
      seenLegacy[id] = true;
      var mapping = ids[id] || {};
      var normalizedRow = mapping.journalId && normalizedById[clean(mapping.journalId)];
      if (normalizedRow && (mapping.status === 'verified' || mapping.status === 'migrated' || mapping.status === 'skipped')) {
        output.push(Object.assign({}, row, normalizedRow, { id: rowId(normalizedRow), legacyId: id, date: normalizedRow.work_date || row.date }));
      } else {
        output.push(row);
      }
    });
    output.sort(function(a, b) {
      return rowDate(b).localeCompare(rowDate(a)) || rowCreated(b).localeCompare(rowCreated(a)) || rowId(a).localeCompare(rowId(b));
    });
    return output;
  }

  return {
    migrateLegacyRecords: migrateLegacyRecords,
    mergeLegacyAndNormalized: mergeLegacyAndNormalized,
    canManageMigration: function(user) {
      return !!(user && user.isActive !== false && (user.role === 'owner' || user.role === 'admin'));
    },
    mapLegacyId: function(id) { return mappedUuid('site-journal:' + clean(id)); },
    MAX_BATCH_SIZE: MAX_BATCH_SIZE
  };
});

