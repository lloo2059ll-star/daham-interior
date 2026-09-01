const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('dedicated commercial customer print uses distributed category totals', () => {
  const html = read('estimate-commercial-print.html');
  assert.match(html, /estimateType\s*!==\s*['"]commercial['"]/);
  assert.match(html, /customerCategoryTotals/);
  assert.match(html, /renderCommercialPrint/);
});

test('commercial print payload is explicitly customer-safe', () => {
  const html = read('estimate-commercial.html');
  assert.match(html, /estimateType:\s*['"]commercial['"]/);
  assert.match(html, /customerCategoryTotals/);
  assert.match(html, /estimate-commercial-print\.html/);
  const fn = html.match(/function buildCommercialPrintData\(\)[\s\S]*?function previewCommercialEstimate/)[0];
  assert.doesNotMatch(fn, /laborUnit|materialUnit|profitRate|profitAmount/);
});
