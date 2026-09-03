const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../completion-archive-domain.js');

const photo = (overrides = {}) => ({ journalId:'j1', photoId:'p1', storagePath:'c/p/j/p1.jpg', originalName:'현장:전경.jpg', mimeType:'image/jpeg', byteSize:12, sha256:'a'.repeat(64), workDate:'2026-09-03', trade:'목공', sortOrder:0, ...overrides });

test('creates safe deterministic date/trade paths and resolves duplicate filenames', () => {
  const manifest = domain.buildManifest([photo({photoId:'p2', sortOrder:1}), photo()]);
  assert.equal(manifest[0].archivePath, '사진/2026-09-03/목공/현장_전경.jpg');
  assert.equal(manifest[1].archivePath, '사진/2026-09-03/목공/현장_전경-p2.jpg');
  assert.deepEqual(domain.buildManifest([photo()]), domain.buildManifest([photo()]));
});

test('orders manifest by work date, trade, journal, photo order', () => {
  const rows = [photo({photoId:'late',workDate:'2026-09-04'}), photo({photoId:'early',workDate:'2026-09-02'})];
  assert.deepEqual(domain.buildManifest(rows).map(x => x.photoId), ['early','late']);
});

test('verifies count, bytes and hashes and rejects every mismatch', () => {
  const manifest = domain.buildManifest([photo()]);
  assert.deepEqual(domain.verifyManifest(manifest,{photoCount:1,sourceBytes:12,sha256:['a'.repeat(64)]}).photoCount,1);
  assert.throws(() => domain.verifyManifest(manifest,{photoCount:2,sourceBytes:12}), /PHOTO_COUNT_MISMATCH/);
  assert.throws(() => domain.verifyManifest(manifest,{photoCount:1,sourceBytes:99}), /SOURCE_BYTES_MISMATCH/);
  assert.throws(() => domain.verifyManifest(manifest,{photoCount:1,sourceBytes:12,sha256:['b'.repeat(64)]}), /SOURCE_HASH_MISMATCH/);
});

test('uses immutable archive id paths and sanitizes unsafe filenames', () => {
  assert.deepEqual(domain.archivePaths('company','삼구/트리니엔','archive'), {pdf:'company/삼구_트리니엔/archive/준공-현장일지.pdf',zip:'company/삼구_트리니엔/archive/준공-현장일지.zip',manifest:'company/삼구_트리니엔/archive/manifest.json'});
  assert.equal(domain.safeFilename('../../a?.jpg'), '__._a_.jpg');
});

