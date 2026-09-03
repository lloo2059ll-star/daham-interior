const test = require('node:test');
const assert = require('node:assert/strict');
const UploadClient = require('../site-journal-upload-client.js');

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const JOURNAL_ID = '22222222-2222-4222-8222-222222222222';
const AUTHOR_ID = '33333333-3333-4333-8333-333333333333';

function response(payload) {
  return { ok: true, status: 201, json: async () => payload, text: async () => '' };
}

test('creates the normalized journal before uploading an original and inserting ready metadata', async () => {
  const calls = [];
  const client = UploadClient.create({
    url: 'https://example.supabase.co', key: 'publishable-key',
    getAccessToken: () => 'employee-token', currentUser: () => ({ id: AUTHOR_ID }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('company_memberships')) return response([{ company_id: COMPANY_ID }]);
      if (url.endsWith('/site_journals')) return response([{ id: JOURNAL_ID, version: 1 }]);
      if (url.includes('/storage/v1/object/')) return response({});
      if (url.endsWith('/site_journal_photos')) return response([{ id: 'photo-row' }]);
      throw new Error('unexpected request '+url);
    },
    crypto: { subtle: { digest: async () => new Uint8Array(32).buffer } }
  });

  const context = await client.loadContext({ journalId: JOURNAL_ID, projectId: 'project-1' });
  await client.createJournal({ ...context, workDate: '2026-09-03', visitType: 'visit', trade: '', content: 'work' });
  const file = new Blob(['original'], { type: 'image/jpeg' });
  Object.defineProperty(file, 'name', { value: 'original.jpg' });
  await client.uploadStandard(file, 'company/project/journal/photo/original.jpg', () => {});
  await client.saveMetadata({
    id: '44444444-4444-4444-8444-444444444444', companyId: COMPANY_ID, journalId: JOURNAL_ID,
    storagePath: 'company/project/journal/photo/original.jpg', originalName: 'original.jpg', mimeType: 'image/jpeg',
    byteSize: file.size, sha256: await client.sha256(file), sortOrder: 0, createdBy: AUTHOR_ID, status: 'ready'
  });

  assert.equal(calls[0].url.includes('company_memberships'), true);
  assert.equal(calls[1].url.endsWith('/site_journals'), true);
  assert.equal(calls[2].url.includes('/storage/v1/object/site-journal-originals/'), true);
  assert.equal(calls[3].url.endsWith('/site_journal_photos'), true);
  assert.strictEqual(calls[2].options.body, file);
  const journal = JSON.parse(calls[1].options.body);
  assert.deepEqual(journal, { id: JOURNAL_ID, company_id: COMPANY_ID, project_id: 'project-1', work_date: '2026-09-03', visit_type: 'visit', trade: '', content: 'work', author_id: AUTHOR_ID });
  const metadata = JSON.parse(calls[3].options.body);
  assert.equal(metadata.status, 'ready');
  assert.equal(metadata.sha256, '0'.repeat(64));
  assert.equal(metadata.journal_id, JOURNAL_ID);
});

test('uses authenticated requests and never needs a service credential', async () => {
  const client = UploadClient.create({
    url: 'https://example.supabase.co', key: 'publishable-key', getAccessToken: () => 'employee-token', currentUser: () => ({ id: AUTHOR_ID }),
    fetch: async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer employee-token');
      assert.equal(options.headers.apikey, 'publishable-key');
      return response([{ company_id: COMPANY_ID }]);
    }
  });
  const context = await client.loadContext({ journalId: JOURNAL_ID, projectId: 'project-1' });
  assert.equal(context.companyId, COMPANY_ID);
  assert.equal(context.authorId, AUTHOR_ID);
});

test('removes only the caller-owned stale metadata row before object cleanup', async () => {
  let request;
  const client = UploadClient.create({
    url: 'https://example.supabase.co', key: 'publishable-key', getAccessToken: () => 'employee-token', currentUser: () => ({ id: AUTHOR_ID }),
    fetch: async (url, options) => { request = { url, options }; return response([{ id: '44444444-4444-4444-8444-444444444444' }]); }
  });
  await client.removeMetadata({
    id: '44444444-4444-4444-8444-444444444444', companyId: COMPANY_ID, journalId: JOURNAL_ID, createdBy: AUTHOR_ID
  });
  assert.equal(request.options.method, 'DELETE');
  assert.match(request.url, /id=eq\.44444444-4444-4444-8444-444444444444/);
  assert.match(request.url, new RegExp('company_id=eq\\.'+COMPANY_ID));
  assert.match(request.url, new RegExp('journal_id=eq\\.'+JOURNAL_ID));
  assert.match(request.url, new RegExp('created_by=eq\\.'+AUTHOR_ID));
  assert.equal(request.options.headers.Authorization, 'Bearer employee-token');
});

