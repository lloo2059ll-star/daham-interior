const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const htmlPath = path.join(__dirname, '..', 'website.html');
function html(){ return fs.readFileSync(htmlPath, 'utf8'); }

test('public homepage keeps the approved DAHAM sections', () => {
  const src = html();
  assert.match(src, /DAHAM INTERIOR/);
  assert.match(src, /id="portfolio"/);
  assert.match(src, /OUR PROCESS/);
  assert.match(src, /id="inquiry-modal"/);
  assert.match(src, /견적 문의하기/);
  assert.match(src, /신뢰/);
});

test('public homepage talks only to public website tables', () => {
  const src = html();
  assert.match(src, /website-public-domain\.js/);
  assert.match(src, /from\('website_portfolio'\)/);
  assert.match(src, /from\('website_inquiries'\)/);
  assert.doesNotMatch(src, /auth\.js/);
  assert.doesNotMatch(src, /sync_data/);
  assert.doesNotMatch(src, /consult\.html/);
});

test('public inquiry stays on the website and shows in-place result state', () => {
  const src = html();
  assert.match(src, /id="inquiry-form"/);
  assert.match(src, /id="inquiry-result"/);
  assert.match(src, /문의가 접수되었습니다/);
});
