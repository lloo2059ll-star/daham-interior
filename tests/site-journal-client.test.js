const test = require('node:test');
const assert = require('node:assert/strict');
const Client = require('../site-journal-client.js');

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const JOURNAL_COLUMNS = 'id,company_id,project_id,work_date,trade,content,visit_type,author_id,created_at,updated_at,version,deleted_at';
const PHOTO_COLUMNS = 'id,company_id,journal_id,storage_path,thumbnail_path,original_name,mime_type,byte_size,sha256,width,height,status,sort_order,created_by,created_at,deleted_at';

function createSupabase(results) {
  const calls = [];
  function Query(table) {
    this.call = { table, method: 'select', columns: null, filters: [], orders: [], range: null, payload: null };
  }
  Query.prototype.select = function(columns, options) { this.call.columns = columns; this.call.selectOptions = options || null; return this; };
  Query.prototype.eq = function(column, value) { this.call.filters.push(['eq', column, value]); return this; };
  Query.prototype.is = function(column, value) { this.call.filters.push(['is', column, value]); return this; };
  Query.prototype.order = function(column, options) { this.call.orders.push([column, options || {}]); return this; };
  Query.prototype.range = function(from, to) { this.call.range = [from, to]; return this; };
  Query.prototype.insert = function(payload) { this.call.method = 'insert'; this.call.payload = payload; return this; };
  Query.prototype.update = function(payload) { this.call.method = 'update'; this.call.payload = payload; return this; };
  Query.prototype.then = function(resolve, reject) {
    calls.push(this.call);
    return Promise.resolve(results.shift() || { data: [], error: null, count: null }).then(resolve, reject);
  };
  return { supabase: { from: table => new Query(table) }, calls };
}

test('list builds an explicit company/project page ordered by newest work date', async () => {
  const fake = createSupabase([{ data: [{ id: 'j2' }], error: null, count: 31 }]);
  const client = Client.create({ supabase: fake.supabase, companyId: COMPANY_ID });
  const result = await client.list({ projectId: 'project-1', page: 1, pageSize: 10 });

  assert.deepEqual(result, { rows: [{ id: 'j2' }], count: 31 });
  assert.deepEqual(fake.calls, [{
    table: 'site_journals', method: 'select', columns: JOURNAL_COLUMNS, selectOptions: { count: 'exact' },
    filters: [['eq', 'company_id', COMPANY_ID], ['eq', 'project_id', 'project-1'], ['is', 'deleted_at', null]],
    orders: [['work_date', { ascending: false }], ['created_at', { ascending: false }]], range: [10, 19], payload: null
  }]);
});

test('save inserts a normalized journal with explicit returning columns', async () => {
  const fake = createSupabase([{ data: [{ id: 'j1', version: 1 }], error: null }]);
  const client = Client.create({ supabase: fake.supabase, companyId: COMPANY_ID });
  const saved = await client.save({ projectId: 'project-1', workDate: '2026-09-03', visitType: 'visit', trade: '목공', content: '작업 완료', authorId: 'author-1' });

  assert.equal(saved.id, 'j1');
  assert.deepEqual(fake.calls[0].call || fake.calls[0], {
    table: 'site_journals', method: 'insert', columns: JOURNAL_COLUMNS, selectOptions: null, filters: [], orders: [], range: null,
    payload: { company_id: COMPANY_ID, project_id: 'project-1', work_date: '2026-09-03', visit_type: 'visit', trade: '목공', content: '작업 완료', author_id: 'author-1' }
  });
});

test('save updates only the matching company journal version and increments it', async () => {
  const fake = createSupabase([{ data: [{ id: 'j1', version: 4 }], error: null }]);
  const client = Client.create({ supabase: fake.supabase, companyId: COMPANY_ID });
  await client.save({ id: 'j1', projectId: 'project-1', workDate: '2026-09-03', visitType: 'remote', content: '원격 확인' }, 3);

  const call = fake.calls[0];
  assert.equal(call.method, 'update');
  assert.equal(call.columns, JOURNAL_COLUMNS);
  assert.deepEqual(call.filters, [['eq', 'id', 'j1'], ['eq', 'company_id', COMPANY_ID], ['eq', 'version', 3]]);
  assert.equal(call.payload.version, 4);
  assert.equal(call.payload.author_id, undefined);
  assert.equal(call.payload.company_id, undefined);
});

test('save reports a version conflict when the guarded update returns zero rows', async () => {
  const fake = createSupabase([{ data: [], error: null }]);
  const client = Client.create({ supabase: fake.supabase, companyId: COMPANY_ID });
  await assert.rejects(
    client.save({ id: 'j1', projectId: 'project-1', workDate: '2026-09-03', visitType: 'none', content: '수정' }, 3),
    /version conflict/
  );
});

test('remove only soft-deletes the matching company journal', async () => {
  const fake = createSupabase([{ data: [{ id: 'j1', deleted_at: '2026-09-03T01:00:00Z' }], error: null }]);
  const client = Client.create({ supabase: fake.supabase, companyId: COMPANY_ID });
  await client.remove('j1');

  const call = fake.calls[0];
  assert.equal(call.table, 'site_journals');
  assert.equal(call.method, 'update');
  assert.deepEqual(call.filters, [['eq', 'id', 'j1'], ['eq', 'company_id', COMPANY_ID], ['is', 'deleted_at', null]]);
  assert.deepEqual(Object.keys(call.payload), ['deleted_at']);
  assert.equal(call.columns, 'id,deleted_at');
});

test('listPhotos reads only active metadata scoped to its company journal', async () => {
  const fake = createSupabase([{ data: [{ id: 'photo-1', storage_path: 'company/project/journal/photo/name.jpg' }], error: null }]);
  const client = Client.create({ supabase: fake.supabase, companyId: COMPANY_ID });
  const rows = await client.listPhotos('journal-1');

  assert.equal(rows.length, 1);
  assert.deepEqual(fake.calls[0], {
    table: 'site_journal_photos', method: 'select', columns: PHOTO_COLUMNS, selectOptions: null,
    filters: [['eq', 'company_id', COMPANY_ID], ['eq', 'journal_id', 'journal-1'], ['is', 'deleted_at', null]],
    orders: [['sort_order', { ascending: true }], ['created_at', { ascending: true }]], range: null, payload: null
  });
});

