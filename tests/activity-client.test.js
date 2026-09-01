const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'daham-activity.js'), 'utf8');

function harness(fetchImpl) {
  const values = new Map();
  const localStorage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const root = {
    localStorage, fetch: fetchImpl, addEventListener() {},
    DAHAM_AUTH: {
      ready: Promise.resolve(true), currentUser: () => ({ id: 'u1', name: '홍길동' }),
      getSupabaseConfig: () => ({ url: 'https://project.supabase.co' }),
      getAuthHeaders: () => ({ apikey: 'publishable', Authorization: 'Bearer jwt', 'Content-Type': 'application/json' })
    },
    DAHAM_ACTIVITY_DOMAIN: {
      normalizeActivity: input => ({ ...input, actorId: 'u1', actorName: '홍길동', changedFields: input.changedFields || {}, targetUrl: input.targetUrl || 'index.html' }),
      activityDedupeKey: () => 'activity:estimate:e1:update:1'
    }
  };
  const sandbox = { module: { exports: {} }, exports: {}, globalThis: root, Promise, JSON, Date, setTimeout, clearTimeout };
  vm.runInNewContext(source, sandbox);
  return { activity: sandbox.module.exports, localStorage, values };
}

test('publishes normalized activity through authenticated RPC', async () => {
  const requests = [];
  const h = harness(async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => 'event-1' }; });
  const result = await h.activity.publish({ entityType: 'estimate', entityId: 'e1', action: 'update', title: '견적 수정' });
  assert.equal(result.eventId, 'event-1');
  assert.match(requests[0].url, /\/rest\/v1\/rpc\/publish_activity$/);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer jwt');
  assert.equal(JSON.parse(requests[0].options.body).p_dedupe_key, 'activity:estimate:e1:update:1');
});

test('failed publishing queues activity without rejecting the completed business save', async () => {
  const h = harness(async () => { throw new Error('offline'); });
  const result = await h.activity.publish({ entityType: 'estimate', entityId: 'e1', action: 'update', title: '견적 수정' });
  assert.equal(result.queued, true);
  const queued = JSON.parse(h.localStorage.getItem('daham_activity_retry_v1'));
  assert.equal(queued.length, 1);
  assert.equal(queued[0].entityId, 'e1');
});

test('retry removes only activities accepted by the server', async () => {
  let fail = true;
  const h = harness(async () => fail ? { ok: false, json: async () => ({ message: 'fail' }) } : { ok: true, json: async () => 'event-2' });
  await h.activity.publish({ entityType: 'consult', entityId: 'c1', action: 'create', title: '상담 등록' });
  fail = false;
  const result = await h.activity.retryPending();
  assert.equal(result.sent, 1);
  assert.equal(JSON.parse(h.localStorage.getItem('daham_activity_retry_v1')).length, 0);
});

test('auth loads activity domain before activity client on protected pages', () => {
  const auth = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
  assert.match(auth, /daham-activity-domain\.js/);
  assert.match(auth, /daham-activity\.js/);
  assert.ok(auth.indexOf('daham-activity-domain.js') < auth.indexOf('daham-activity.js'));
});

