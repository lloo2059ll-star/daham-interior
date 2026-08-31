const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'notice.html'), 'utf8');
const printCss = (html.match(/@media print\s*\{([\s\S]*?)\n\}/) || [])[1] || '';

test('printed greeting and construction details remain legible on A4', () => {
  assert.match(printCss, /\.doc-greeting\s*\{[^}]*padding\s*:\s*12px 16px[^}]*font-size\s*:\s*14px[^}]*line-height\s*:\s*1\.7/s);
  assert.match(printCss, /\.info-table th\s*\{[^}]*font-size\s*:\s*13px/s);
  assert.match(printCss, /\.info-table td\s*\{[^}]*font-size\s*:\s*15px[^}]*font-weight\s*:\s*700/s);
  assert.match(printCss, /\.info-table th,\.info-table td\s*\{[^}]*padding\s*:\s*8px 12px/s);
});

