(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SITE_JOURNAL = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var MAX_PHOTO_BYTES = 25 * 1024 * 1024;
  var MAX_PHOTOS = 20;
  var VISIT_TYPES = new Set(['visit', 'remote', 'none']);
  var MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function pick(input, camel, snake) {
    return input[camel] == null ? input[snake] : input[camel];
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2];
  }

  function hasPhotoIntent(draft) {
    return Boolean(draft.photoIntent || draft.hasPhotos || Number(draft.photoCount) > 0 || (Array.isArray(draft.photos) && draft.photos.length));
  }

  function validateDraft(input) {
    var draft = input || {};
    var projectId = clean(pick(draft, 'projectId', 'project_id'));
    var workDate = clean(pick(draft, 'workDate', 'work_date'));
    var visitType = clean(pick(draft, 'visitType', 'visit_type') || 'none').toLowerCase();
    var content = clean(draft.content);
    var photoIntent = hasPhotoIntent(draft);

    if (!projectId) throw new Error('projectId is required');
    if (!validDate(workDate)) throw new Error('workDate must be a valid ISO date');
    if (!VISIT_TYPES.has(visitType)) throw new Error('visitType is invalid');
    if (!content && !photoIntent) throw new Error('content or photo intent is required');

    return {
      id: clean(draft.id) || null,
      projectId: projectId,
      workDate: workDate,
      visitType: visitType,
      trade: clean(draft.trade),
      content: content,
      photoIntent: photoIntent
    };
  }

  function validatePhoto(file, currentCount) {
    var type = clean(file && file.type).toLowerCase();
    var size = Number(file && file.size);
    var count = Number(currentCount || 0);
    if (!MIME_TYPES.has(type)) throw new Error('photo MIME type is not allowed');
    if (!Number.isFinite(size) || size <= 0) throw new Error('photo size must be positive');
    if (size > MAX_PHOTO_BYTES) throw new Error('photo size exceeds 25MB');
    if (!Number.isFinite(count) || count < 0) throw new Error('current photo count is invalid');
    if (count >= MAX_PHOTOS) throw new Error('a journal may contain at most 20 photos');
    return { type: type, size: size };
  }

  function uuid(value, name) {
    var result = clean(value);
    if (!UUID.test(result)) throw new Error(name + ' must be a UUID');
    return result.toLowerCase();
  }

  function safeSegments(value) {
    return clean(value).replace(/\\/g, '/').split('/').filter(function(segment) {
      return segment && segment !== '.' && segment !== '..';
    }).join('-');
  }

  function safeName(value) {
    var name = safeSegments(value).replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g, '-').replace(/-+\./g, '.').replace(/^[-.]+|[-.]+$/g, '');
    if (!name) throw new Error('originalName is required');
    return name.slice(0, 180);
  }

  function buildObjectPath(input) {
    input = input || {};
    var companyId = uuid(input.companyId, 'companyId');
    var journalId = uuid(input.journalId, 'journalId');
    var photoId = uuid(input.photoId, 'photoId');
    var projectId = safeSegments(input.projectId).replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
    if (!projectId) throw new Error('projectId is required');
    return [companyId, projectId.slice(0, 120), journalId, photoId, safeName(input.originalName)].join('/');
  }

  function rowValue(row, camel, snake) {
    return row && (row[snake] == null ? row[camel] : row[snake]) || '';
  }

  function mergePage(existing, incoming) {
    var byId = new Map();
    (Array.isArray(incoming) ? incoming : []).forEach(function(row) {
      if (row && clean(row.id)) byId.set(clean(row.id), row);
    });
    (Array.isArray(existing) ? existing : []).forEach(function(row) {
      if (row && clean(row.id) && !byId.has(clean(row.id))) byId.set(clean(row.id), row);
    });
    return Array.from(byId.values()).sort(function(left, right) {
      var leftDate = clean(rowValue(left, 'workDate', 'work_date'));
      var rightDate = clean(rowValue(right, 'workDate', 'work_date'));
      if (leftDate !== rightDate) return leftDate < rightDate ? 1 : -1;
      var leftCreated = clean(rowValue(left, 'createdAt', 'created_at'));
      var rightCreated = clean(rowValue(right, 'createdAt', 'created_at'));
      if (leftCreated !== rightCreated) return leftCreated < rightCreated ? 1 : -1;
      return clean(left.id) < clean(right.id) ? 1 : clean(left.id) > clean(right.id) ? -1 : 0;
    });
  }

  return {
    validateDraft: validateDraft,
    validatePhoto: validatePhoto,
    buildObjectPath: buildObjectPath,
    mergePage: mergePage
  };
});

