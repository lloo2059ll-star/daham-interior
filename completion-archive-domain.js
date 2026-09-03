(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_COMPLETION_ARCHIVE_DOMAIN = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function safeFilename(value, fallback) {
    var name = clean(value).normalize('NFC').replace(/[\\/:*?\"<>|\u0000-\u001f]/g, '_').replace(/\.{2,}/g, '.').replace(/^\.+/, '_').replace(/[. ]+$/g, '');
    if (!name || name === '.' || name === '..') name = fallback || 'file';
    var parts = name.split('.'), ext = parts.length > 1 ? '.' + parts.pop().slice(0, 16) : '';
    var stem = parts.join('.').slice(0, Math.max(1, 120 - ext.length));
    return stem + ext;
  }
  function dateFolder(date) {
    var value = clean(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_WORK_DATE');
    return value;
  }
  function tradeFolder(trade) { return safeFilename(clean(trade) || '기타', '기타'); }
  function compareEntry(a, b) {
    return dateFolder(a.workDate).localeCompare(dateFolder(b.workDate)) || tradeFolder(a.trade).localeCompare(tradeFolder(b.trade), 'ko') || clean(a.journalId).localeCompare(clean(b.journalId)) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || clean(a.photoId).localeCompare(clean(b.photoId));
  }
  function buildManifest(rows) {
    var used = Object.create(null);
    var normalized = (rows || []).map(function (row) {
      var required = ['journalId', 'photoId', 'storagePath', 'originalName', 'mimeType', 'sha256'];
      required.forEach(function (key) { if (!clean(row[key])) throw new Error('INVALID_MANIFEST_' + key.toUpperCase()); });
      var bytes = Number(row.byteSize);
      if (!Number.isSafeInteger(bytes) || bytes <= 0 || !/^[0-9a-f]{64}$/i.test(row.sha256)) throw new Error('INVALID_MANIFEST_INTEGRITY');
      var base = safeFilename(row.originalName, row.photoId + '.bin');
      return { journalId: clean(row.journalId), photoId: clean(row.photoId), storagePath: clean(row.storagePath), originalName: base, mimeType: clean(row.mimeType).toLowerCase(), byteSize: bytes, sha256: clean(row.sha256).toLowerCase(), workDate: dateFolder(row.workDate), trade: clean(row.trade) || '기타', sortOrder: Number(row.sortOrder || 0) };
    }).sort(compareEntry);
    return normalized.map(function (row) {
      var key = row.workDate + '/' + tradeFolder(row.trade) + '/' + row.originalName;
      if (used[key]) key = key.replace(/(\.[^.]+)?$/, '-' + clean(row.photoId).slice(0, 8) + '$1');
      used[key] = true;
      row.archivePath = '사진/' + key;
      return row;
    });
  }
  function verifyManifest(manifest, expected) {
    var count = manifest.length, bytes = manifest.reduce(function (sum, item) { return sum + item.byteSize; }, 0);
    var hashes = manifest.map(function (item) { return item.sha256; }).sort();
    if (expected && Number(expected.photoCount) !== count) throw new Error('PHOTO_COUNT_MISMATCH');
    if (expected && Number(expected.sourceBytes) !== bytes) throw new Error('SOURCE_BYTES_MISMATCH');
    if (expected && expected.sha256 && JSON.stringify((expected.sha256 || []).map(String).sort()) !== JSON.stringify(hashes)) throw new Error('SOURCE_HASH_MISMATCH');
    return { photoCount: count, sourceBytes: bytes, sha256: hashes };
  }
  function archivePaths(companyId, projectId, archiveId) {
    var base = [clean(companyId), safeFilename(projectId, 'project'), clean(archiveId)].join('/');
    if (!clean(companyId) || !clean(archiveId)) throw new Error('INVALID_ARCHIVE_PATH');
    return { pdf: base + '/준공-현장일지.pdf', zip: base + '/준공-현장일지.zip', manifest: base + '/manifest.json' };
  }
  function safeErrorCode(error) {
    var code = clean(error && (error.code || error.message)).toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 64);
    return code || 'ARCHIVE_GENERATION_FAILED';
  }

  return { safeFilename: safeFilename, dateFolder: dateFolder, tradeFolder: tradeFolder, buildManifest: buildManifest, verifyManifest: verifyManifest, archivePaths: archivePaths, safeErrorCode: safeErrorCode };
});

