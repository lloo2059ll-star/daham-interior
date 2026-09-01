const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');

function loadCatalog() {
  const source = fs.readFileSync(path.join(root, 'price-catalog.js'), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.DAHAM_PRICE_CATALOG;
}

test('shared price catalog contains every real estimate category and electric item prices', () => {
  const catalog = loadCatalog();
  assert.ok(catalog.length >= 20);
  const electric = catalog.find(section => section.name === '전기/조명');
  assert.ok(electric);
  assert.ok(electric.items.length >= 40);
  assert.deepEqual(JSON.parse(JSON.stringify(electric.items[0])), {
    sub: '거실등', det: '[1]파인3등(380*710)', unit: '개', lu: 12000, mu: 130000,
  });
});

test('dashboard price control is a modal trigger and hides completely from staff', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="priceManagerButton"/);
  assert.match(html, /id="priceManagerModal"/);
  assert.match(html, /DAHAM_PRICES\.canManage/);
  assert.doesNotMatch(html, /href="price-editor\.html"[^>]*>단가 조정표/);
});

test('estimate loads the shared catalog and preserves per-project unit price snapshots', () => {
  const html = fs.readFileSync(path.join(root, 'estimate.html'), 'utf8');
  assert.match(html, /price-catalog\.js/);
  assert.match(html, /price-management\.js/);
  assert.match(html, /snapshotExistingSelections/);
  assert.match(html, /priceForProject/);
  assert.match(html, /priceSnapshots/);
  assert.match(html, /const r100\s*=\s*n\s*=>/);
});

test('price modal can target one existing estimate and persists its updated price snapshot', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="priceProject"/);
  assert.match(html, /DAHAM_PRICES\.saveProjectOverrides/);
  assert.match(html, /key:'daham_settings_v1'/);
});

test('price editor exposes commercial defaults through manager authorization', () => {
  const html = fs.readFileSync(path.join(root, 'price-commercial.html'), 'utf8');
  assert.match(html, /상가 견적 기본단가/);
  assert.match(html, /commercialEstimateDefaults/);
  assert.match(html, /DAHAM_PRICES\.canManage/);
  assert.match(html, /key:\s*['"]daham_settings_v1['"]/);
  assert.match(html, /from\(['"]sync_data['"]\)\.upsert/);
});

