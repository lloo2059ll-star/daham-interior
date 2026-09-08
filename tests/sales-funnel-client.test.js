const test = require('node:test');
const assert = require('node:assert/strict');

const Client = require('../sales-funnel-client.js');

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    snapshot() { return Object.fromEntries(values); }
  };
}

function makeClient(options = {}) {
  const storage = options.storage || memoryStorage();
  const calls = [];
  const transport = options.transport || {
    async getCompanyId() { calls.push(['company']); return 'company-1'; },
    async readSync(key) { calls.push(['sync', key]); return null; },
    async readGoal(companyId, month) { calls.push(['readGoal', companyId, month]); return null; },
    async upsertGoal(payload) { calls.push(['upsertGoal', payload]); return payload; }
  };
  const client = Client.createSalesFunnelClient({
    user: options.user || { id: 'user-1', role: 'owner', isActive: true },
    storage,
    transport,
    now: () => '2026-09-08T12:00:00+09:00'
  });
  return { client, storage, calls };
}

test('rejects staff before making any remote sales request', async () => {
  const fixture = makeClient({ user: { id: 'staff-1', role: 'staff', isActive: true } });
  await assert.rejects(() => fixture.client.loadDashboard(), /권한/);
  assert.deepEqual(fixture.calls, []);
});

test('keeps local consultation and project data when remote loading fails', async () => {
  const storage = memoryStorage({
    daham_consult_v1: JSON.stringify([{ id: 'local-consult' }]),
    daham_detail_v2: JSON.stringify([{ id: 'local-project' }])
  });
  const transport = {
    async getCompanyId() { return 'company-1'; },
    async readSync() { throw new Error('offline'); }
  };
  const result = await makeClient({ storage, transport }).client.loadDashboard();
  assert.deepEqual(result.records, [{ id: 'local-consult' }]);
  assert.deepEqual(result.projects, [{ id: 'local-project' }]);
  assert.match(result.error, /offline/);
  assert.equal(storage.snapshot().daham_consult_v1, JSON.stringify([{ id: 'local-consult' }]));
});

test('adopts newer valid remote sync data without dropping unknown fields', async () => {
  const storage = memoryStorage({
    daham_consult_v1: JSON.stringify([{ id: 'local' }]),
    daham_consult_v1_ts: '2026-09-01T00:00:00Z',
    daham_detail_v2: JSON.stringify([])
  });
  const remote = [{ id: 'remote', unknownFutureField: { keep: true } }];
  const transport = {
    async getCompanyId() { return 'company-1'; },
    async readSync(key) {
      if (key === 'daham_consult_v1') return { value: JSON.stringify(remote), updated_at: '2026-09-08T00:00:00Z' };
      return null;
    }
  };
  const result = await makeClient({ storage, transport }).client.loadDashboard();
  assert.deepEqual(result.records, remote);
  assert.deepEqual(JSON.parse(storage.snapshot().daham_consult_v1)[0].unknownFutureField, { keep: true });
});

test('returns labeled defaults when a monthly goal cannot be loaded', async () => {
  const transport = {
    async getCompanyId() { return 'company-1'; },
    async readGoal() { throw new Error('goal offline'); }
  };
  const result = await makeClient({ transport }).client.loadGoals('2026-09');
  assert.deepEqual(result.goals, { inquiry: 10, site_visit: 6, estimate_meeting: 4, contract: 2 });
  assert.equal(result.isDefault, true);
  assert.match(result.error, /goal offline/);
});

test('saves only the selected month and confirms values after remote success', async () => {
  const fixture = makeClient();
  const result = await fixture.client.saveGoals('2026-09', { inquiry: 12, site_visit: 8, estimate_meeting: 5, contract: 3 });
  const payload = fixture.calls.find(call => call[0] === 'upsertGoal')[1];
  assert.equal(payload.month, '2026-09-01');
  assert.equal(payload.company_id, 'company-1');
  assert.equal(payload.inquiry_target, 12);
  assert.equal(payload.created_by, 'user-1');
  assert.equal(result.isDefault, false);
});

test('does not cache or confirm a failed goal save', async () => {
  const storage = memoryStorage();
  const transport = {
    async getCompanyId() { return 'company-1'; },
    async upsertGoal() { throw new Error('save failed'); }
  };
  const fixture = makeClient({ storage, transport });
  await assert.rejects(() => fixture.client.saveGoals('2026-09', { inquiry: 12, site_visit: 8, estimate_meeting: 5, contract: 3 }), /save failed/);
  assert.equal(storage.getItem('daham_sales_funnel_goal_2026-09'), null);
});
