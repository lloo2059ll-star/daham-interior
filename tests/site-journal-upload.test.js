const test = require('node:test');
const assert = require('node:assert/strict');
const Upload = require('../site-journal-upload.js');

const IDS = {
  companyId: '11111111-1111-4111-8111-111111111111',
  journalId: '22222222-2222-4222-8222-222222222222',
  projectId: 'project-1',
  authorId: '33333333-3333-4333-8333-333333333333'
};

function photo(name, size) {
  return { name, size: size == null ? 1024 : size, type: 'image/jpeg' };
}

function waitFor(check, message) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    (function poll() {
      if (check()) return resolve();
      if (Date.now() > deadline) return reject(new Error(message || 'timed out'));
      setTimeout(poll, 5);
    })();
  });
}

test('runs no more than the configured three uploads at a time', async () => {
  let active = 0;
  let peak = 0;
  const release = [];
  const queue = Upload.createUploadQueue({
    uploadStandard(file) {
      active += 1;
      peak = Math.max(peak, active);
      return new Promise(resolve => release.push(() => { active -= 1; resolve(); }));
    },
    uploadResumable: async () => {}, saveMetadata: async () => {}, removeObject: async () => {}
  });

  queue.add([photo('1.jpg'), photo('2.jpg'), photo('3.jpg'), photo('4.jpg')], IDS);
  queue.start();
  await waitFor(() => release.length === 3, 'three initial uploads should start');
  assert.equal(peak, 3);
  release.shift()();
  await waitFor(() => release.length === 3, 'the fourth upload should wait for an available slot');
  while (release.length) release.shift()();
  await waitFor(() => queue.snapshot().every(job => job.status === 'ready'));
  assert.equal(peak, 3);
});

test('uses resumable upload only above 6MB and passes the original file plus immutable path', async () => {
  const small = photo('small.jpg', 6 * 1024 * 1024);
  const large = photo('large.jpg', (6 * 1024 * 1024) + 1);
  const calls = [];
  const queue = Upload.createUploadQueue({
    uploadStandard(file, path, progress) { calls.push(['standard', file, path]); progress(50); return Promise.resolve(); },
    uploadResumable(file, path, progress) { calls.push(['resumable', file, path]); progress(75); return Promise.resolve(); },
    saveMetadata: async () => {}, removeObject: async () => {}
  });

  queue.add([small, large], IDS);
  queue.start();
  await waitFor(() => queue.snapshot().every(job => job.status === 'ready'));
  assert.deepEqual(calls.map(call => call[0]), ['standard', 'resumable']);
  assert.strictEqual(calls[0][1], small);
  assert.strictEqual(calls[1][1], large);
  assert.match(calls[0][2], /^11111111-1111-4111-8111-111111111111\/project-1\/22222222-2222-4222-8222-222222222222\//);
  assert.notEqual(calls[0][2], calls[1][2]);
});

test('rejects an over-limit selection before enqueueing any of its files', () => {
  const queue = Upload.createUploadQueue({ uploadStandard: async () => {}, uploadResumable: async () => {}, saveMetadata: async () => {}, removeObject: async () => {} });
  assert.throws(() => queue.add([photo('19.jpg'), photo('20.jpg')], { ...IDS, currentPhotoCount: 19 }), /20 photos/);
  assert.deepEqual(queue.snapshot(), []);
});

test('keeps sibling uploads running when one upload fails', async () => {
  const queue = Upload.createUploadQueue({
    uploadStandard(file) { return file.name === 'bad.jpg' ? Promise.reject(Object.assign(new Error('offline'), { code: 'network_failed' })) : Promise.resolve(); },
    uploadResumable: async () => {}, saveMetadata: async () => {}, removeObject: async () => {}
  });
  queue.add([photo('bad.jpg'), photo('good.jpg')], IDS);
  queue.start();
  await waitFor(() => queue.snapshot().every(job => job.status === 'failed' || job.status === 'ready'));
  assert.deepEqual(queue.snapshot().map(job => [job.file.name, job.status, job.errorCode]), [
    ['bad.jpg', 'failed', 'network_failed'], ['good.jpg', 'ready', null]
  ]);
});

test('cancels one upload and retries only that cancelled job', async () => {
  let firstAbort;
  let calls = 0;
  const queue = Upload.createUploadQueue({
    uploadStandard(file, path, progress, signal) {
      calls += 1;
      if (calls === 1) return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { firstAbort = true; reject(Object.assign(new Error('aborted'), { code: 'aborted' })); });
      });
      progress(100);
      return Promise.resolve();
    },
    uploadResumable: async () => {}, saveMetadata: async () => {}, removeObject: async () => {}
  });
  const [job] = queue.add([photo('retry.jpg')], IDS);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'uploading');
  assert.equal(queue.cancel(job.id), true);
  await waitFor(() => firstAbort === true);
  assert.equal(queue.snapshot()[0].status, 'cancelled');
  assert.equal(queue.retry(job.id), true);
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  assert.equal(queue.snapshot()[0].attempts, 2);
  assert.equal(calls, 2);
});

test('persists metadata only after storage upload and removes storage when metadata fails', async () => {
  const removed = [];
  const queue = Upload.createUploadQueue({
    uploadStandard: async () => {}, uploadResumable: async () => {},
    saveMetadata: async () => { throw new Error('database unavailable'); },
    removeObject: async path => { removed.push(path); }
  });
  queue.add([photo('metadata.jpg')], IDS);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'failed');
  const job = queue.snapshot()[0];
  assert.equal(job.errorCode, 'metadata_failed');
  assert.deepEqual(removed, [job.storagePath]);
  assert.equal(job.metadata.storagePath, job.storagePath);
});

test('retains cleanup details when metadata cleanup also fails', async () => {
  const queue = Upload.createUploadQueue({
    uploadStandard: async () => {}, uploadResumable: async () => {},
    saveMetadata: async () => { throw new Error('metadata down'); },
    removeObject: async () => { throw new Error('cleanup down'); }
  });
  queue.add([photo('orphan.jpg')], IDS);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'failed');
  const job = queue.snapshot()[0];
  assert.equal(job.errorCode, 'metadata_failed');
  assert.match(job.error.cleanup.message, /cleanup down/);
});

test('ignores a late cancelled attempt after retry and only persists the fresh attempt', async () => {
  let resolveFirst;
  let calls = 0;
  let metadataCalls = 0;
  const queue = Upload.createUploadQueue({
    uploadStandard() {
      calls += 1;
      if (calls === 1) return new Promise(resolve => { resolveFirst = resolve; });
      return Promise.resolve();
    },
    uploadResumable: async () => {},
    saveMetadata: async () => { metadataCalls += 1; },
    removeObject: async () => {}
  });
  const [job] = queue.add([photo('late.jpg')], IDS);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'uploading');
  queue.cancel(job.id);
  queue.retry(job.id);
  resolveFirst();
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  assert.equal(calls, 2);
  assert.equal(metadataCalls, 1);
  assert.equal(queue.snapshot()[0].attempts, 2);
});

test('cleans an object when cancellation lands after storage succeeds before metadata resolves', async () => {
  let resolveMetadata;
  const removed = [];
  const queue = Upload.createUploadQueue({
    uploadStandard: async () => {}, uploadResumable: async () => {},
    saveMetadata: () => new Promise(resolve => { resolveMetadata = resolve; }),
    removeMetadata: async () => {},
    removeObject: async path => { removed.push(path); }
  });
  const [job] = queue.add([photo('cancel-after-storage.jpg')], IDS);
  queue.start();
  await waitFor(() => typeof resolveMetadata === 'function');
  queue.cancel(job.id);
  resolveMetadata({ id: 'metadata-row' });
  await waitFor(() => removed.length === 1);
  assert.deepEqual(removed, [queue.snapshot()[0].storagePath]);
  assert.equal(queue.snapshot()[0].status, 'cancelled');
});

test('allows finalization only when every intended upload is ready', async () => {
  let release;
  const queue = Upload.createUploadQueue({
    uploadStandard: () => new Promise(resolve => { release = resolve; }), uploadResumable: async () => {},
    saveMetadata: async () => {}, removeObject: async () => {}
  });
  const [job] = queue.add([photo('finalize.jpg')], IDS);
  assert.equal(queue.canFinalize(), false);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'uploading');
  assert.equal(queue.canFinalize(), false);
  release();
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  assert.equal(queue.canFinalize(), true);
  queue.cancel(job.id);
  assert.equal(queue.canFinalize(), true);
});

test('adds a direct-file SHA-256 and ready status before metadata persistence', async () => {
  let metadata;
  const original = photo('hashed.jpg');
  const queue = Upload.createUploadQueue({
    uploadStandard: async received => { assert.strictEqual(received, original); }, uploadResumable: async () => {},
    hashFile: async received => { assert.strictEqual(received, original); return 'a'.repeat(64); },
    saveMetadata: async value => { metadata = value; }, removeObject: async () => {}
  });
  queue.add([original], IDS);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  assert.equal(metadata.sha256, 'a'.repeat(64));
  assert.equal(metadata.status, 'ready');
});

test('gives a retried job a fresh path and cleans only the cancelled attempt path', async () => {
  let resolveFirst;
  const uploaded = [];
  const removed = [];
  const queue = Upload.createUploadQueue({
    uploadStandard(file, path) {
      uploaded.push(path);
      return uploaded.length === 1 ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve();
    },
    uploadResumable: async () => {}, saveMetadata: async () => {}, removeObject: async path => { removed.push(path); }
  });
  const [job] = queue.add([photo('isolated-retry.jpg')], IDS);
  queue.start();
  await waitFor(() => uploaded.length === 1);
  const firstPath = uploaded[0];
  queue.cancel(job.id);
  queue.retry(job.id);
  const retryPath = queue.snapshot()[0].storagePath;
  assert.notEqual(retryPath, firstPath);
  resolveFirst();
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  assert.equal(uploaded[1], retryPath);
  assert.deepEqual(removed, [firstPath]);
  assert.notEqual(removed[0], queue.snapshot()[0].storagePath);
});

test('cleans the uploaded object and retains a hash failure', async () => {
  const removed = [];
  const queue = Upload.createUploadQueue({
    uploadStandard: async () => {}, uploadResumable: async () => {},
    hashFile: async () => { throw Object.assign(new Error('hash unavailable'), { code: 'hash_failed' }); },
    saveMetadata: async () => { throw new Error('metadata must not run'); },
    removeObject: async path => { removed.push(path); }
  });
  queue.add([photo('hash-failure.jpg')], IDS);
  queue.start();
  await waitFor(() => queue.snapshot()[0].status === 'failed');
  const job = queue.snapshot()[0];
  assert.equal(job.errorCode, 'hash_failed');
  assert.match(job.error.message, /hash unavailable/);
  assert.deepEqual(removed, [job.storagePath]);
});

test('removes stale metadata before its object when retry becomes ready during an in-flight metadata save', async () => {
  let resolveOldMetadata;
  let uploadSignal;
  let cleanupSignal;
  let objectCleanupSignal;
  const activeMetadata = new Map();
  const removedMetadata = [];
  const removedObjects = [];
  let uploadCalls = 0;
  const queue = Upload.createUploadQueue({
    uploadStandard: async (file, path, progress, signal) => {
      uploadCalls += 1;
      if (uploadCalls === 1) uploadSignal = signal;
    },
    uploadResumable: async () => {},
    saveMetadata: metadata => {
      if (uploadCalls === 1) return new Promise(resolve => { resolveOldMetadata = () => { activeMetadata.set(metadata.id, metadata.storagePath); resolve({ id: metadata.id }); }; });
      activeMetadata.set(metadata.id, metadata.storagePath);
      return Promise.resolve({ id: metadata.id });
    },
    removeMetadata: async (metadata, signal) => {
      cleanupSignal = signal;
      if (signal && signal.aborted) throw Object.assign(new Error('cleanup received an aborted signal'), { code: 'aborted' });
      removedMetadata.push(metadata.id);
      activeMetadata.delete(metadata.id);
    },
    removeObject: async (path, signal) => { objectCleanupSignal = signal; removedObjects.push(path); }
  });
  const [job] = queue.add([photo('metadata-race.jpg')], IDS);
  const firstPhotoId = job.metadata.id;
  const firstPath = job.storagePath;
  queue.start();
  await waitFor(() => typeof resolveOldMetadata === 'function');
  queue.cancel(job.id);
  queue.retry(job.id);
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  const retry = queue.snapshot()[0];
  resolveOldMetadata();
  await waitFor(() => cleanupSignal !== undefined);
  assert.equal(uploadSignal.aborted, true);
  assert.equal(cleanupSignal.aborted, false);
  assert.notStrictEqual(cleanupSignal, uploadSignal);
  await waitFor(() => removedMetadata.length === 1);
  assert.strictEqual(objectCleanupSignal, cleanupSignal);
  assert.deepEqual(removedMetadata, [firstPhotoId]);
  assert.deepEqual(removedObjects, [firstPath]);
  assert.deepEqual([...activeMetadata.values()], [retry.storagePath]);
  assert.notEqual(retry.metadata.id, firstPhotoId);
});

test('retains stale-attempt reconciliation details when cleanup fails after retry is ready', async () => {
  let resolveOldMetadata;
  let uploadCalls = 0;
  const queue = Upload.createUploadQueue({
    uploadStandard: async () => { uploadCalls += 1; }, uploadResumable: async () => {},
    saveMetadata: metadata => {
      if (uploadCalls === 1) return new Promise(resolve => { resolveOldMetadata = () => resolve({ id: metadata.id }); });
      return Promise.resolve({ id: metadata.id });
    },
    removeMetadata: async () => { throw Object.assign(new Error('metadata cleanup unavailable'), { code: 'network_failed' }); },
    removeObject: async () => { throw new Error('object cleanup must wait until metadata is removed'); }
  });
  const [job] = queue.add([photo('reconciliation.jpg')], IDS);
  const staleMetadataId = job.metadata.id;
  const staleStoragePath = job.storagePath;
  queue.start();
  await waitFor(() => typeof resolveOldMetadata === 'function');
  queue.cancel(job.id);
  queue.retry(job.id);
  await waitFor(() => queue.snapshot()[0].status === 'ready');
  resolveOldMetadata();
  await waitFor(() => queue.snapshot()[0].errorCode === 'reconciliation_required');
  const ready = queue.snapshot()[0];
  assert.equal(ready.status, 'ready');
  assert.equal(ready.error.code, 'reconciliation_required');
  assert.equal(ready.error.metadataId, staleMetadataId);
  assert.equal(ready.error.storagePath, staleStoragePath);
  assert.equal(ready.error.cleanup.code, 'network_failed');
  assert.match(ready.error.cleanup.message, /metadata cleanup unavailable/);
});

