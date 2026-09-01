const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadDomain() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'commercial-estimate-domain.js'), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.DAHAM_COMMERCIAL_ESTIMATE;
}

test('catalog exposes the approved category order and excludes furniture and signage', () => {
  const { CATALOG } = loadDomain();
  assert.deepEqual(Array.from(CATALOG, x => x.name), [
    '가설·보양','철거·폐기물','설비','전기·조명','냉난방·환기','금속·유리','목공','타일',
    '도장','필름','도배','바닥','문·도어','소방','청소','기타·현장경비'
  ]);
  assert.equal(CATALOG.some(x => /가구|집기|간판/.test(x.name)), false);
});

test('approved defaults are exact', () => {
  const { CATALOG } = loadDomain();
  const item = id => CATALOG.flatMap(x => x.items).find(x => x.id === id);
  assert.equal(item('carpentry-mdf-panel').materialSheetPrice, 9000);
  assert.equal(item('carpentry-wall-single').studSpacingMm, 300);
  assert.equal(item('tile-floor-pressure').laborUnit, 90000);
  assert.equal(item('tile-floor-pressure').materialUnit, 35000);
  assert.equal(item('electrical-base').totalUnit, 220000);
  assert.equal(item('cleaning-progress').laborUnit, 180000);
  assert.equal(item('cleaning-progress').materialUnit, 50000);
});

test('area conversion and project-level package rounding are stable', () => {
  const d = loadDomain();
  assert.equal(d.toSquareMeters(10), 33.058);
  assert.equal(d.toPyeong(33.058), 10);
  assert.equal(d.calculateOrderQuantity({ areaM2: 33.058, coveragePerPackageM2: 1.44, wasteRate: 0.15 }), 27);
});

test('tile package calculation preserves whole-box purchase amount', () => {
  const d = loadDomain();
  const result = d.calculateLine({
    id: 'tile-600x600-product', quantity: 10, unit: '평',
    packagePrice: 26000, packageCoverageM2: 1.44, wasteRate: 0.15
  });
  assert.equal(result.orderQuantity, 27);
  assert.equal(result.material, 702000);
  assert.equal(result.labor, 0);
});

test('manual carpenter day adds only the approved labor and 70 percent material', () => {
  const d = loadDomain();
  const result = d.calculateLine({ id: 'carpentry-wall-single', quantity: 10, extraDays: 1 });
  assert.equal(result.extraLabor, 350000);
  assert.equal(result.extraMaterial, 245000);
});

test('ten pyeong single-sided gypsum wall calculates generous labor and separated materials', () => {
  const d = loadDomain();
  const result = d.calculateLine({ id: 'carpentry-wall-single', quantity: 10 });
  assert.equal(result.labor, 1050000);
  assert.equal(result.material, 434500);
  assert.equal(result.details.workerDays, 3);
  assert.equal(result.details.boardSheets, 47);
  assert.equal(result.details.studBundles, 5);
});

test('minimum labor is applied once per category', () => {
  const d = loadDomain();
  const result = d.calculateEstimate({ lines: [
    { id: 'film-flat', categoryId: 'film', labor: 180000, material: 160000 },
    { id: 'film-door-frame', categoryId: 'film', labor: 120000, material: 100000 }
  ]});
  assert.equal(result.categories.film.labor, 400000);
  assert.equal(result.categories.film.minimumLaborAdjustment, 100000);
});

test('demolition waste suggestion combines coefficients and rounds once', () => {
  const d = loadDomain();
  assert.equal(d.suggestWasteLoads([
    { type: 'deco-tile', quantity: 20 },
    { type: 'tile-mortar', quantity: 7 },
    { type: 'restroom', quantity: 1 }
  ]), 3);
});

test('negative and non numeric values are rejected', () => {
  const d = loadDomain();
  const errors = d.validateEstimate({ lines: [
    { id: 'a', quantity: -1 },
    { id: 'b', materialUnit: 'abc' }
  ]});
  assert.deepEqual(Array.from(errors, x => x.field), ['quantity', 'materialUnit']);
});

test('commercial totals support percentage and fixed profit modes', () => {
  const d = loadDomain();
  const percent = d.calculateCommercialTotals(
    { labor: 1000000, material: 500000, expense: 100000 },
    { managementRate: 5, profitMode: 'rate', profitRate: 10, vatRate: 10 }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(percent)), {
    labor:1000000, material:500000, expense:100000, subtotal:1600000,
    management:80000, profit:168000, supplyTotal:1848000, vat:184800, grandTotal:2032800
  });
  const fixed = d.calculateCommercialTotals(
    { labor: 1000000, material: 500000, expense: 100000 },
    { managementRate: 5, profitMode: 'fixed', profitAmount: 250000, vatRate: 10 }
  );
  assert.equal(fixed.profit, 250000);
});
