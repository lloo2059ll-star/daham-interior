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

test('project price adjustment replaces snapshots only for items already used in the selected estimate', () => {
  const section = { name: '전기/조명', items: [
    { sub: '거실등', det: '기본형', unit: '개', lu: 12000, mu: 130000 },
    { sub: '현관등', det: '센서형', unit: '개', lu: 8000, mu: 45000 }
  ] };
  const project = {
    id: 'estimate-1',
    qtys: {
      '전기/조명|거실등|기본형': 2,
      '전기/조명|현관등|센서형': 0
    },
    priceSnapshots: {}
  };
  const livingKey = prices.itemKey(section, section.items[0]);
  const hallKey = prices.itemKey(section, section.items[1]);

  prices.applyDraftToProject(project, [section], {
    [livingKey]: { labor: '13,500', material: '145,000' },
    [hallKey]: { labor: '9,000', material: '50,000' }
  });

  assert.deepEqual(project.priceSnapshots, {
    [livingKey]: { labor: 13500, material: 145000 }
  });
});

test('project-specific overrides take priority without changing another estimate snapshot', () => {
  const section = catalog[0], item = section.items[0], key = prices.itemKey(section, item);
  const selected = { id: 'estimate-1', priceSnapshots: { [key]: { labor: 12000, material: 130000 } } };
  const other = { id: 'estimate-2', priceSnapshots: { [key]: { labor: 12000, material: 130000 } } };
  const scoped = { 'estimate-1': { [key]: { labor: 13500, material: 145000 } } };

  assert.deepEqual(prices.priceForProject(selected, section, item, {}, scoped), { labor: 13500, material: 145000 });
  assert.deepEqual(prices.priceForProject(other, section, item, {}, scoped), { labor: 12000, material: 130000 });
});

test('commercial defaults validate stable ids and remain namespaced', () => {
  const catalog = [{ id:'tile', items:[{ id:'tile-floor-pressure' }] }];
  const saved = prices.saveCommercialDefaults({
    catalog,
    currentSettings:{ priceOverrides:{ residential:'kept' } },
    changes:{ 'tile-floor-pressure':{ laborUnit:'90,000', materialUnit:'35,000' } }
  });
  assert.deepEqual(saved.commercialEstimateDefaults['tile-floor-pressure'], { laborUnit:90000, materialUnit:35000 });
  assert.deepEqual(saved.priceOverrides, { residential:'kept' });
  assert.throws(() => prices.saveCommercialDefaults({ catalog, currentSettings:{}, changes:{ missing:{ laborUnit:1, materialUnit:2 } } }), /존재하지 않는/);
});

test('commercial default loader merges approved organization values only', () => {
  const catalog = [{ id:'tile', items:[{ id:'tile-floor-pressure', laborUnit:90000, materialUnit:35000 }] }];
  const result = prices.loadCommercialDefaults(catalog, { commercialEstimateDefaults:{ 'tile-floor-pressure':{ laborUnit:95000, materialUnit:40000 } } });
  assert.equal(result[0].items[0].laborUnit, 95000);
  assert.equal(result[0].items[0].materialUnit, 40000);
});

test('commercial settings restore server prices before using stale local values', async () => {
  let restored = null;
  const result = await prices.loadCommercialSettings({
    readLocal: () => ({ commercialEstimateDefaults: {
      'temp-wall-single': { laborUnit: 0, materialUnit: 0 }
    }}),
    readRemote: async () => ({ commercialEstimateDefaults: {
      'temp-wall-single': { laborUnit: 45000, materialUnit: 28000 }
    }}),
    writeLocal: value => { restored = value; }
  });

  assert.deepEqual(result.commercialEstimateDefaults['temp-wall-single'], {
    laborUnit: 45000, materialUnit: 28000
  });
  assert.deepEqual(restored, result);
});

test('commercial settings fall back to local prices when the server is unavailable', async () => {
  const local = { commercialEstimateDefaults: {
    'temp-wall-single': { laborUnit: 45000, materialUnit: 28000 }
  }};
  const result = await prices.loadCommercialSettings({
    readLocal: () => local,
    readRemote: async () => { throw new Error('offline'); },
    writeLocal: () => { throw new Error('must not overwrite local fallback'); }
  });

  assert.equal(result, local);
});

test('project price save uses protected settings and keeps only items used by that estimate', async () => {
  const section = catalog[0], used = section.items[0], unused = section.items[1];
  const usedKey = prices.itemKey(section, used), unusedKey = prices.itemKey(section, unused);
  const project = { id: 'estimate-1', qtys: {
    '전기/조명|거실등|[1]파인3등(380*710)': 2,
    '전기/조명|매입등 2인치|': 0
  }};
  let remote, local;
  await prices.saveProjectOverrides({
    user: { role: 'owner', isActive: true }, project, catalog,
    draft: {
      [usedKey]: { labor: '13,500', material: '145,000' },
      [unusedKey]: { labor: '17,000', material: '6,000' }
    },
    readSettings: () => ({ priceOverrides: {} }),
    writeRemote: async (projectId, scoped) => {
      remote = { priceOverrides: {}, projectPriceOverrides: { [projectId]: scoped } };
      return remote;
    },
    writeLocal: value => { local = value; }
  });
  assert.deepEqual(remote.projectPriceOverrides['estimate-1'], {
    [usedKey]: { labor: 13500, material: 145000 }
  });
  assert.deepEqual(local, remote);
});

test('selected project total is recalculated from its scoped labor and material prices', () => {
  const section = catalog[0], item = section.items[0], key = prices.itemKey(section, item);
  const project = {
    id: 'estimate-1',
    qtys: { '전기/조명|거실등|[1]파인3등(380*710)': 2 },
    margins: { profit: '15' },
    priceSnapshots: { [key]: { labor: 12000, material: 130000 } }
  };
  const scoped = { 'estimate-1': { [key]: { labor: 13500, material: 145000 } } };
  assert.equal(prices.projectTotal(project, [section], {}, scoped), 364600);
});

