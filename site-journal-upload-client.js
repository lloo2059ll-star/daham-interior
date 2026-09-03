(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SITE_JOURNAL_UPLOAD_CLIENT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requireValue(value, name) {
    value = clean(value);
    if (!value) throw new Error(name + ' is required');
    return value;
  }

  function objectUrl(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function(byte) { return byte.toString(16).padStart(2, '0'); }).join('');
  }

  function create(config) {
    config = config || {};
    var baseUrl = requireValue(config.url, 'url').replace(/\/$/, '');
    var key = requireValue(config.key, 'key');
    var getAccessToken = typeof config.getAccessToken === 'function' ? config.getAccessToken : function() { return ''; };
    var currentUser = typeof config.currentUser === 'function' ? config.currentUser : function() { return null; };
    var request = config.fetch || (typeof fetch === 'function' && fetch.bind(typeof window === 'undefined' ? globalThis : window));
    var cryptoApi = config.crypto || (typeof crypto !== 'undefined' ? crypto : null);
    if (typeof request !== 'function') throw new Error('fetch is required');

    function headers(extra) {
      var token = requireValue(getAccessToken(), 'access token');
      return Object.assign({ apikey: key, Authorization: 'Bearer '+token }, extra || {});
    }

    async function checked(path, options) {
      var response = await request(baseUrl+path, options);
      if (!response || !response.ok) {
        var text = response && response.text ? await response.text() : '';
        throw Object.assign(new Error(text || 'site journal request failed'), { code: 'request_failed', status: response && response.status });
      }
      return response;
    }

    async function json(path, options) {
      var response = await checked(path, options);
      return response.json ? response.json() : null;
    }

    async function loadContext(input) {
      input = input || {};
      var user = currentUser() || {};
      var authorId = requireValue(user.id, 'authorId');
      var rows = await json('/rest/v1/company_memberships?profile_id=eq.'+encodeURIComponent(authorId)+'&status=eq.active&select=company_id&limit=1', {
        method: 'GET', headers: headers()
      });
      var companyId = requireValue(rows && rows[0] && rows[0].company_id, 'active companyId');
      return {
        companyId: companyId,
        projectId: requireValue(input.projectId, 'projectId'),
        journalId: requireValue(input.journalId, 'journalId'),
        authorId: authorId,
        currentPhotoCount: Number(input.currentPhotoCount || 0)
      };
    }

    async function createJournal(input) {
      input = input || {};
      var payload = {
        id: requireValue(input.journalId, 'journalId'),
        company_id: requireValue(input.companyId, 'companyId'),
        project_id: requireValue(input.projectId, 'projectId'),
        work_date: requireValue(input.workDate, 'workDate'),
        visit_type: requireValue(input.visitType, 'visitType'),
        trade: clean(input.trade),
        content: clean(input.content),
        author_id: requireValue(input.authorId, 'authorId')
      };
      var rows = await json('/rest/v1/site_journals', {
        method: 'POST', headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify(payload)
      });
      if (!rows || !rows[0]) throw new Error('site journal insert returned no row');
      return rows[0];
    }

    async function sha256(file) {
      if (!cryptoApi || !cryptoApi.subtle || typeof cryptoApi.subtle.digest !== 'function') throw new Error('Web Crypto SHA-256 is unavailable');
      var bytes = await file.arrayBuffer();
      return toHex(await cryptoApi.subtle.digest('SHA-256', bytes));
    }

    async function uploadStandard(file, storagePath, progress, signal) {
      await checked('/storage/v1/object/site-journal-originals/'+objectUrl(storagePath), {
        method: 'POST', headers: headers({ 'Content-Type': file.type, 'x-upsert': 'false' }), body: file, signal: signal
      });
      if (typeof progress === 'function') progress(100);
    }

    async function uploadResumable(file, storagePath, progress, signal) {
      var metadata = [
        'bucketName '+btoa('site-journal-originals'),
        'objectName '+btoa(storagePath),
        'contentType '+btoa(file.type || 'application/octet-stream')
      ].join(',');
      var start = await checked('/storage/v1/upload/resumable', {
        method: 'POST', headers: headers({ 'Tus-Resumable': '1.0.0', 'Upload-Length': String(file.size), 'Upload-Metadata': metadata, 'x-upsert': 'false' }), signal: signal
      });
      var location = start.headers && start.headers.get && start.headers.get('Location');
      if (!location) throw new Error('resumable upload did not return a location');
      await checked(location.indexOf('http') === 0 ? location.replace(baseUrl, '') : location, {
        method: 'PATCH', headers: headers({ 'Tus-Resumable': '1.0.0', 'Upload-Offset': '0', 'Content-Type': 'application/offset+octet-stream' }), body: file, signal: signal
      });
      if (typeof progress === 'function') progress(100);
    }

    async function saveMetadata(metadata, signal) {
      metadata = metadata || {};
      var payload = {
        id: requireValue(metadata.id, 'photo id'),
        company_id: requireValue(metadata.companyId, 'companyId'),
        journal_id: requireValue(metadata.journalId, 'journalId'),
        storage_path: requireValue(metadata.storagePath, 'storagePath'),
        original_name: requireValue(metadata.originalName, 'originalName'),
        mime_type: requireValue(metadata.mimeType, 'mimeType'),
        byte_size: Number(metadata.byteSize),
        sha256: requireValue(metadata.sha256, 'sha256'),
        status: 'ready',
        sort_order: Number(metadata.sortOrder),
        created_by: requireValue(metadata.createdBy, 'createdBy')
      };
      var rows = await json('/rest/v1/site_journal_photos', {
        method: 'POST', headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify(payload), signal: signal
      });
      if (!rows || !rows[0]) throw new Error('site journal photo insert returned no row');
      return rows[0];
    }

    async function removeObject(storagePath, signal) {
      await checked('/storage/v1/object/site-journal-originals/'+objectUrl(storagePath), { method: 'DELETE', headers: headers(), signal: signal });
    }

    async function removeMetadata(metadata, signal) {
      metadata = metadata || {};
      var id = requireValue(metadata.id, 'photo id');
      var companyId = requireValue(metadata.companyId, 'companyId');
      var journalId = requireValue(metadata.journalId, 'journalId');
      var createdBy = requireValue(metadata.createdBy, 'createdBy');
      await json('/rest/v1/site_journal_photos?id=eq.'+encodeURIComponent(id)
        +'&company_id=eq.'+encodeURIComponent(companyId)
        +'&journal_id=eq.'+encodeURIComponent(journalId)
        +'&created_by=eq.'+encodeURIComponent(createdBy), {
        method: 'DELETE', headers: headers({ Prefer: 'return=representation' }), signal: signal
      });
    }

    return { loadContext: loadContext, createJournal: createJournal, sha256: sha256, uploadStandard: uploadStandard, uploadResumable: uploadResumable, saveMetadata: saveMetadata, removeMetadata: removeMetadata, removeObject: removeObject };
  }

  return { create: create };
});

