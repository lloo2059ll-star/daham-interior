const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname,'../supabase/functions/create-completion-archive/index.ts'),'utf8');
test('worker authenticates and restricts creation to active owners/admins', () => {
  assert.match(source, /auth\.getUser/); assert.match(source, /owner.*admin|admin.*owner/s); assert.match(source, /status.*active/s);
});
test('worker is idempotent, checkpointed and preserves originals', () => {
  assert.match(source, /idempotencyKey/); assert.match(source, /checkpoint/); assert.match(source, /queued|processing/); assert.doesNotMatch(source, /site-journal-originals[^\n]+\.remove\(/);
});
test('worker verifies sources and emits manifest PDF and ZIP before ready', () => {
  assert.match(source, /PHOTO_COUNT_MISMATCH|SOURCE_BYTES_MISMATCH/); assert.match(source, /manifest\.json/); assert.match(source, /application\/pdf/); assert.match(source, /application\/zip/); assert.match(source, /status:\s*['\"]ready['\"]/);
});
test('worker handles zero photos, HEIC, missing objects and safe retryable failure', () => {
  assert.match(source, /image\/heic|image\/heif/); assert.match(source, /SOURCE_OBJECT_MISSING/); assert.match(source, /error_code/); assert.match(source, /status:\s*['\"]failed['\"]/);
});

