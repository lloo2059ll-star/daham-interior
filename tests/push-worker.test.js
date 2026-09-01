const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workerPath = path.join(__dirname, '..', 'supabase', 'functions', 'send-push', 'index.ts');

test('push worker securely delivers pending outbox messages', () => {
  const source = fs.readFileSync(workerPath, 'utf8');
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /VAPID_PRIVATE_KEY/);
  assert.match(source, /notification_outbox/);
  assert.match(source, /push_subscriptions/);
  assert.match(source, /delivered === total \? ['"]sent['"]/);
  assert.match(source, /status:\s*['"]failed['"]/);
  assert.match(source, /410|404/);
});
