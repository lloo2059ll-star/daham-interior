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

test('printed construction table uses strong fills borders and text contrast', () => {
  assert.match(printCss, /\.info-table\s*\{[^}]*border\s*:\s*2px solid #9CA3AF/s);
  assert.match(printCss, /\.info-table th\s*\{[^}]*background\s*:\s*#4B5563\s*!important[^}]*color\s*:\s*#fff[^}]*border-color\s*:\s*#4B5563/s);
  assert.match(printCss, /\.info-table td\s*\{[^}]*background\s*:\s*#ECEFF3\s*!important[^}]*color\s*:\s*#111[^}]*border-color\s*:\s*#9CA3AF/s);
  assert.match(printCss, /\.info-table tr:nth-child\(odd\) td\s*\{[^}]*background\s*:\s*#E5E7EB\s*!important/s);
});

