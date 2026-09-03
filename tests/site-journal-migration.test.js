const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Migration = require('../site-journal-migration.js');

function legacy(id, photos = []) {
  return {
    id,
    date: '2026-09-03',
    projId: 'project-1',
    projName: '강남 현장',
    worker: '김다함',
    visitType: 'visit',
    content: '타일 시공',
    photos,
    createdAt: '2026-09-03T01:00:00.000Z'
  };
}

function dataUrl(text, type = 'image/jpeg') {
  return `data:${type};base64,${Buffer.from(text).toString('base64')}`;
}

function fakeAdapters(options = {}) {
  let state = options.state || { cursor: 0, status: 'idle', ids: {}, errors: [] };
  const journals = new Map();
  const photos = new Map();
  const calls = { create: [], decode: [], upload: [], metadata: [], verify: [], persisted: [], yielded: 0 };

  return {
    calls,
    journals,
    photos,
    loadState: async () => state,
    persistState: async next => {
      state = structuredClone(next);
      calls.persisted.push(structuredClone(next));
    },
    decodeBase64: async (source, context) => {
      calls.decode.push({ source, context });
      if (String(source).includes('corrupt')) throw new Error('corrupt Base64');
      const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(source);
      if (!match) throw new Error('corrupt Base64');
      return new Blob([Buffer.from(match[2], 'base64')], { type: match[1] });
    },
    sha256: async blob => crypto.createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex'),
    createJournal: async input => {
      calls.create.push(input);
      if (options.failJournalId === input.legacyId) throw new Error('normalized journal failed');
      journals.set(input.journalId, input);
      return { id: input.journalId };
    },
    uploadPhoto: async (blob, input) => {
      calls.upload.push({ blob, input });
      if (options.failPhotoName === input.originalName) throw new Error('photo upload failed');
    },
    savePhotoMetadata: async input => {
      calls.metadata.push(input);
      photos.set(input.photoId, input);
      return { id: input.photoId };
    },
    verifyJournal: async input => {
      calls.verify.push(input);
      if (options.forceVerificationFailure && input.phase === 'final') return { journalExists: true, photos: [] };
      return {
        journalExists: journals.has(input.journalId),
        photos: [...photos.values()].filter(photo => photo.journalId === input.journalId).map(photo => ({
          id: photo.photoId,
          byteSize: photo.byteSize,
          sha256: photo.sha256,
          status: 'ready'
        }))
      };
    },
    yield: async () => { calls.yielded += 1; }
  };
}

test('processes no more than ten journals and resumes from the persisted cursor', async () => {
  const records = Array.from({ length: 12 }, (_, index) => legacy(`legacy-${index}`));
  const adapters = fakeAdapters();

  const first = await Migration.migrateLegacyRecords(records, adapters, { batchSize: 99 });
  assert.deepEqual({ migrated: first.migrated, skipped: first.skipped, failed: first.failed, cursor: first.cursor },
    { migrated: 10, skipped: 0, failed: 0, cursor: 10 });
  assert.equal(adapters.calls.create.length, 10);
  assert.equal(adapters.calls.yielded, 1);

  const second = await Migration.migrateLegacyRecords(records, adapters);
  assert.deepEqual({ migrated: second.migrated, skipped: second.skipped, failed: second.failed, cursor: second.cursor },
    { migrated: 2, skipped: 0, failed: 0, cursor: 12 });
  assert.equal(adapters.calls.create.length, 12);
  assert.equal(adapters.calls.persisted.at(-1).status, 'complete');
  assert.equal(JSON.stringify(adapters.calls.persisted).includes('base64'), false);
});

test('uses deterministic mapped IDs and skips an already verified journal and photos on rerun', async () => {
  const record = legacy('stable-legacy-id', [dataUrl('one'), dataUrl('two')]);
  const adapters = fakeAdapters();

  const first = await Migration.migrateLegacyRecords([record], adapters);
  const firstJournalId = first.results[0].journalId;
  const firstPhotoIds = adapters.calls.metadata.map(row => row.photoId);
  const rerun = await Migration.migrateLegacyRecords([record], adapters, { cursor: 0 });

  assert.equal(rerun.skipped, 1);
  assert.equal(rerun.results[0].journalId, firstJournalId);
  assert.deepEqual(adapters.calls.metadata.map(row => row.photoId), firstPhotoIds);
  assert.equal(adapters.calls.upload.length, 2);
  assert.match(firstJournalId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('uploads decoded Blob bytes directly and verifies literal byte sizes and SHA-256 values', async () => {
  const adapters = fakeAdapters();
  const record = legacy('binary', [dataUrl('original-bytes', 'image/png')]);
  const expectedHash = crypto.createHash('sha256').update('original-bytes').digest('hex');

  const result = await Migration.migrateLegacyRecords([record], adapters);

  assert.equal(result.migrated, 1);
  assert.equal(adapters.calls.upload.length, 1);
  assert.equal(adapters.calls.upload[0].blob instanceof Blob, true);
  assert.equal(adapters.calls.upload[0].blob.size, 14);
  assert.equal(adapters.calls.metadata[0].byteSize, 14);
  assert.equal(adapters.calls.metadata[0].sha256, expectedHash);
  assert.deepEqual(adapters.calls.verify.at(-1).expectedPhotos.map(photo => ({ byteSize: photo.byteSize, sha256: photo.sha256 })),
    [{ byteSize: 14, sha256: expectedHash }]);
});

test('keeps partial photo failures retryable without duplicating the already saved photo', async () => {
  const records = [legacy('partial', [dataUrl('first'), dataUrl('second')])];
  const adapters = fakeAdapters({ failPhotoName: 'legacy-partial-2.jpg' });
  const snapshot = structuredClone(records);

  const failed = await Migration.migrateLegacyRecords(records, adapters);
  assert.equal(failed.failed, 1);
  assert.deepEqual(records, snapshot);
  assert.equal(adapters.photos.size, 1);

  const failedUploads = adapters.calls.upload.length;
  const failedAdapter = adapters.uploadPhoto;
  adapters.uploadPhoto = async (blob, input) => {
    if (input.originalName === 'legacy-partial-2.jpg') {
      adapters.calls.upload.push({ blob, input });
      return;
    }
    return failedAdapter(blob, input);
  };
  const retried = await Migration.migrateLegacyRecords(records, adapters, { recordIds: ['partial'] });
  assert.equal(retried.migrated, 1);
  assert.equal(adapters.calls.upload.length, failedUploads + 1);
  assert.equal(adapters.calls.upload.filter(call => call.input.originalName === 'legacy-partial-1.jpg').length, 1);
});

test('corrupt Base64 and normalized journal failures preserve every legacy value and report failures', async () => {
  const records = [
    legacy('bad-base64', ['corrupt-payload-secret']),
    legacy('journal-error', [dataUrl('valid')])
  ];
  const snapshot = structuredClone(records);
  const adapters = fakeAdapters({ failJournalId: 'journal-error' });

  const result = await Migration.migrateLegacyRecords(records, adapters);

  assert.equal(result.failed, 2);
  assert.deepEqual(records, snapshot);
  assert.match(result.results[0].error, /corrupt Base64/);
  assert.match(result.results[1].error, /normalized journal failed/);
  assert.equal(adapters.calls.upload.length, 0);
  assert.equal(JSON.stringify(adapters.calls.persisted.at(-1)).includes(records[0].photos[0]), false);
});

test('never persists a photo payload even when a decoder includes it in an error', async () => {
  const secretPayload = dataUrl('secret-photo-payload');
  const adapters = fakeAdapters();
  adapters.decodeBase64 = async source => { throw new Error(`invalid input ${source}`); };

  await Migration.migrateLegacyRecords([legacy('secret', [secretPayload])], adapters);

  const persisted = JSON.stringify(adapters.calls.persisted.at(-1));
  assert.equal(persisted.includes(secretPayload), false);
  assert.match(persisted, /photo payload omitted/);
});

test('does not mark a legacy record migrated when final count, bytes, or checksums fail verification', async () => {
  const record = legacy('verify-fail', [dataUrl('photo')]);
  const adapters = fakeAdapters({ forceVerificationFailure: true });

  const result = await Migration.migrateLegacyRecords([record], adapters);

  assert.equal(result.migrated, 0);
  assert.equal(result.failed, 1);
  assert.match(result.results[0].error, /verification/i);
  assert.equal(adapters.calls.persisted.at(-1).ids['verify-fail'].status, 'failed');
});

test('dual read prefers a verified normalized mapping, keeps unverified legacy rows, and removes duplicates deterministically', () => {
  const normalized = [
    { id: 'journal-b', work_date: '2026-09-02', content: 'normalized B' },
    { id: 'journal-a', work_date: '2026-09-03', content: 'normalized A' },
    { id: 'journal-a', work_date: '2026-09-03', content: 'duplicate A' }
  ];
  const legacyRows = [
    legacy('legacy-a'),
    { ...legacy('legacy-b'), date: '2026-09-04', content: 'legacy B' },
    { ...legacy('legacy-c'), date: '2026-09-01', content: 'legacy C' }
  ];
  const state = {
    ids: {
      'legacy-a': { journalId: 'journal-a', status: 'verified' },
      'legacy-b': { journalId: 'journal-b', status: 'failed' }
    }
  };

  const merged = Migration.mergeLegacyAndNormalized(normalized, legacyRows, state);

  assert.deepEqual(merged.map(row => row.id), ['legacy-b', 'journal-a', 'legacy-c']);
  assert.equal(merged.filter(row => row.id === 'journal-a').length, 1);
  assert.equal(merged.some(row => row.id === 'legacy-a'), false);
  assert.equal(merged.find(row => row.id === 'journal-a').worker, '김다함');
  assert.equal(merged.find(row => row.id === 'journal-a').content, 'normalized A');
});

test('only active owners and admins can launch legacy migration', () => {
  assert.equal(Migration.canManageMigration({ role: 'owner', isActive: true }), true);
  assert.equal(Migration.canManageMigration({ role: 'admin', isActive: true }), true);
  assert.equal(Migration.canManageMigration({ role: 'staff', isActive: true }), false);
  assert.equal(Migration.canManageMigration({ role: 'owner', isActive: false }), false);
});

test('worklog wires a separate migration state panel and leaves the legacy key as the read fallback', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'worklog.html'), 'utf8');
  assert.match(html, /<script src="site-journal-migration\.js"><\/script>/);
  assert.match(html, /id="migration-panel"/);
  assert.match(html, /DAHAM_SITE_JOURNAL_MIGRATION\.mergeLegacyAndNormalized/);
  assert.match(html, /daham_worklog_migration_v1/);
  assert.match(html, /var LOG_KEY\s*=\s*'daham_worklog_v1'/);
});

