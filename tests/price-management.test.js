const test = require('node:test');
const assert = require('node:assert/strict');

const prices = require('../price-management.js');

const catalog = [{
  name: '전기/조명', cat: '설비공사', items: [
    { sub: '거실등', det: '[1]파인3등(380*710)', unit: '개', lu: 12000, mu: 130000 },
    { sub: '매입등 2인치', det: '', unit: '개', lu: 16000, mu: 5500 },
  ],
}];

test('stable item keys survive catalog reordering and do not use array indexes', () => {
  const first = prices.itemKey(catalog[0], catalog[0].items[0]);
  const reordered = [{ ...catalog[0], items: [...catalog[0].items].reverse() }];
  const sameItem = reordered[0].items[1];
  assert.equal(prices.itemKey(reordered[0], sameItem), first);
  assert.equal(first, '%EC%A0%84%EA%B8%B0%2F%EC%A1%B0%EB%AA%85|%EA%B1%B0%EC%8B%A4%EB%93%B1|%5B1%5D%ED%8C%8C%EC%9D%B83%EB%93%B1(380*710)|%EA%B0%9C');
  assert.doesNotMatch(first, /^\d+[_|]\d+$/);
});

test('money parser accepts zero and formatted digits but rejects empty invalid and negative input', () => {
  assert.equal(prices.parseMoney('0'), 0);
  assert.equal(prices.parseMoney('1,234,500'), 1234500);
  for (const invalid of ['', ' ', '-1', '12원', '1.2', null, undefined]) {
    assert.equal(prices.parseMoney(invalid), null, String(invalid));
  }
});

test('only active owner and admin users may manage prices', () => {
  assert.equal(prices.canManage({ role: 'owner', isActive: true }), true);
  assert.equal(prices.canManage({ role: 'admin', isActive: true }), true);
  assert.equal(prices.canManage({ role: 'staff', isActive: true }), false);
  assert.equal(prices.canManage({ role: 'owner', isActive: false }), false);
});

test('validated overrides preserve exact labor and material values including zero', () => {
  const key = prices.itemKey(catalog[0], catalog[0].items[0]);
  assert.deepEqual(prices.validateOverrides(catalog, {
    [key]: { labor: '0', material: '145,000' },
  }), { [key]: { labor: 0, material: 145000 } });
  assert.throws(() => prices.validateOverrides(catalog, {
    [key]: { labor: '-1', material: '145000' },
  }), /올바른 금액/);
});

test('existing selected items keep snapshots while newly selected items use current overrides', () => {
  const living = catalog[0].items[0];
  const downlight = catalog[0].items[1];
  const livingKey = prices.itemKey(catalog[0], living);
  const downlightKey = prices.itemKey(catalog[0], downlight);
  const project = {
    qtys: { '전기/조명|거실등|[1]파인3등(380*710)': '2' },
  };

  prices.snapshotExistingSelections(project, catalog);
  const overrides = {
    [livingKey]: { labor: 20000, material: 150000 },
    [downlightKey]: { labor: 18000, material: 7000 },
  };

  assert.deepEqual(prices.priceForProject(project, catalog[0], living, overrides), {
    labor: 12000, material: 130000,
  });
  assert.deepEqual(prices.priceForProject(project, catalog[0], downlight, overrides), {
    labor: 18000, material: 7000,
  });
  prices.snapshotSelection(project, catalog[0], downlight, overrides);
  assert.deepEqual(project.priceSnapshots[downlightKey], { labor: 18000, material: 7000 });
});

test('staff save is rejected before either local or remote storage is changed', async () => {
  let localWrites = 0;
  let remoteWrites = 0;
  await assert.rejects(() => prices.saveOverrides({
    user: { role: 'staff', isActive: true },
    catalog,
    draft: {},
    readSettings: () => ({}),
    writeLocal: () => { localWrites += 1; },
    writeRemote: async () => { remoteWrites += 1; },
  }), /권한/);
  assert.equal(localWrites, 0);
  assert.equal(remoteWrites, 0);
});

