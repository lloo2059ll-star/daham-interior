const test = require('node:test');
const assert = require('node:assert/strict');
const prices = require('../price-management.js');
require('../price-catalog.js');
const catalog = globalThis.DAHAM_PRICE_CATALOG;
const section = catalog.find(s => s.name === '목작업');
const tv = section.items.find(i => i.det === '반매립');
const ac = section.items.find(i => i.det === '에어컨 단내림');
const version = globalThis.DAHAM_PRICE_CATALOG_VERSION;
const key = prices.itemKey(section, tv);
const qtyKey = prices.quantityKey(section, tv);

test('all pre-revision estimates retain old TV price even with missing snapshots', () => {
  for (const status of ['estimate', 'contracted', 'construction', 'completed']) {
    const project = { id: status, status, qtys: { [qtyKey]: 1 } };
    const before = JSON.stringify(project);
    assert.deepEqual(prices.priceForProject(project, section, tv, {}), { labor: 150000, material: 270000 });
    assert.equal(prices.projectTotal(project, catalog, {}), 483000);
    assert.equal(JSON.stringify(project), before);
    prices.snapshotExistingSelections(project, catalog);
    assert.deepEqual(project.priceSnapshots[key], { labor: 150000, material: 270000 });
  }
});

test('existing negotiated snapshots and explicit project prices are preserved', () => {
  const project = { id: 'old', qtys: { [qtyKey]: 1 }, priceSnapshots: { [key]: { labor: 190000, material: 210000 } } };
  prices.snapshotExistingSelections(project, catalog);
  assert.deepEqual(prices.priceForProject(project, section, tv, {}), { labor: 190000, material: 210000 });
  assert.deepEqual(prices.priceForProject(project, section, tv, {}, { old: { [key]: { labor: 200000, material: 220000 } } }), { labor: 200000, material: 220000 });
});

test('only newly versioned estimates get approved prices and aircon item', () => {
  const project = { id: 'new', priceCatalogVersion: version, qtys: { [qtyKey]: 1, [prices.quantityKey(section, ac)]: 1 } };
  assert.deepEqual(prices.priceForProject(project, section, tv, {}), { labor: 250000, material: 180000 });
  assert.deepEqual(prices.priceForProject(project, section, ac, {}), { labor: 150000, material: 80000 });
  assert.equal(ac.unit, '개소');
  assert.equal(prices.itemAvailable(project, ac), true);
  assert.equal(prices.itemAvailable({ id: 'old' }, ac), false);
  assert.equal(prices.projectTotal(project, catalog, {}), 759000);
  prices.snapshotExistingSelections(project, catalog);
  assert.deepEqual(project.priceSnapshots[key], { labor: 250000, material: 180000 });
});

test('selecting TV later on an old estimate still snapshots the old rate', () => {
  const project = { id: 'old', qtys: {} };
  assert.deepEqual(prices.snapshotSelection(project, section, tv, {}), { labor: 150000, material: 270000 });
});

test('new estimates ignore old organization TV defaults and accept revision-scoped defaults', async () => {
  const project = { id: 'new', priceCatalogVersion: version };
  const oldDefaults = { [key]: { labor: 150000, material: 270000 } };
  assert.deepEqual(prices.priceForProject(project, section, tv, oldDefaults), { labor: 250000, material: 180000 });
  const saved = await prices.saveOverrides({
    user: { role: 'owner', isActive: true }, catalog,
    draft: { [key]: { labor: 260000, material: 190000 } },
    readSettings: () => ({}), writeRemote: async () => {}, writeLocal: () => {}
  });
  assert.deepEqual(prices.priceForProject(project, section, tv, saved.priceOverrides), { labor: 260000, material: 190000 });
  assert.deepEqual(prices.priceForProject({ id: 'old' }, section, tv, saved.priceOverrides), { labor: 150000, material: 270000 });
});
