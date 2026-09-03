(function(root, factory) {
  var domain = typeof module === 'object' && module.exports ? require('./site-journal-domain.js') : root.DAHAM_SITE_JOURNAL;
  var api = factory(domain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SITE_JOURNAL_CLIENT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(domain) {
  'use strict';

  var JOURNAL_COLUMNS = 'id,company_id,project_id,work_date,trade,content,visit_type,author_id,created_at,updated_at,version,deleted_at';
  var PHOTO_COLUMNS = 'id,company_id,journal_id,storage_path,thumbnail_path,original_name,mime_type,byte_size,sha256,width,height,status,sort_order,created_by,created_at,deleted_at';

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function requireValue(value, name) {
    value = clean(value);
    if (!value) throw new Error(name + ' is required');
    return value;
  }

  function requestResult(result) {
    if (result && result.error) throw new Error(result.error.message || 'site journal request failed');
    return result || { data: [] };
  }

  function firstRow(result) {
    var data = requestResult(result).data;
    return Array.isArray(data) ? data[0] : data;
  }

  function normalizedDraft(draft) {
    if (!domain || typeof domain.validateDraft !== 'function') throw new Error('site journal domain is unavailable');
    return domain.validateDraft(draft);
  }

  function create(config) {
    config = config || {};
    var supabase = config.supabase;
    var companyId = requireValue(config.companyId, 'companyId');
    if (!supabase || typeof supabase.from !== 'function') throw new Error('supabase client is required');

    async function list(options) {
      options = options || {};
      var projectId = requireValue(options.projectId == null ? options.project_id : options.projectId, 'projectId');
      var page = Number(options.page == null ? 0 : options.page);
      var pageSize = Number(options.pageSize == null ? 25 : options.pageSize);
      if (!Number.isInteger(page) || page < 0) throw new Error('page must be a non-negative integer');
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('pageSize must be between 1 and 100');
      var from = page * pageSize;
      var result = await supabase.from('site_journals')
        .select(JOURNAL_COLUMNS, { count: 'exact' })
        .eq('company_id', companyId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      result = requestResult(result);
      return { rows: Array.isArray(result.data) ? result.data : [], count: Number(result.count || 0) };
    }

    async function save(draft, expectedVersion) {
      var normalized = normalizedDraft(draft);
      var authorId = clean(draft && (draft.authorId == null ? draft.author_id : draft.authorId));
      var payload = {
        project_id: normalized.projectId,
        work_date: normalized.workDate,
        visit_type: normalized.visitType,
        trade: normalized.trade,
        content: normalized.content
      };
      if (!normalized.id) {
        payload.company_id = companyId;
        payload.author_id = requireValue(authorId, 'authorId');
        var inserted = await supabase.from('site_journals').insert(payload).select(JOURNAL_COLUMNS);
        var insertedRow = firstRow(inserted);
        if (!insertedRow) throw new Error('site journal insert returned no row');
        return insertedRow;
      }

      var version = Number(expectedVersion);
      if (!Number.isInteger(version) || version < 1) throw new Error('expectedVersion is required for updates');
      payload.version = version + 1;
      payload.updated_at = new Date().toISOString();
      var updated = await supabase.from('site_journals').update(payload)
        .eq('id', normalized.id)
        .eq('company_id', companyId)
        .eq('version', version)
        .select(JOURNAL_COLUMNS);
      var updatedRow = firstRow(updated);
      if (!updatedRow) throw new Error('site journal version conflict');
      return updatedRow;
    }

    async function remove(id) {
      id = requireValue(id, 'id');
      var result = await supabase.from('site_journals').update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .select('id,deleted_at');
      var row = firstRow(result);
      if (!row) throw new Error('site journal was not found');
      return row;
    }

    async function listPhotos(journalId) {
      journalId = requireValue(journalId, 'journalId');
      var result = await supabase.from('site_journal_photos')
        .select(PHOTO_COLUMNS)
        .eq('company_id', companyId)
        .eq('journal_id', journalId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      result = requestResult(result);
      return Array.isArray(result.data) ? result.data : [];
    }

    return { list: list, save: save, remove: remove, listPhotos: listPhotos };
  }

  return { create: create, JOURNAL_COLUMNS: JOURNAL_COLUMNS, PHOTO_COLUMNS: PHOTO_COLUMNS };
});

