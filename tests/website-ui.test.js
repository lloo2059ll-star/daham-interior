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
  assert.match(src, /ABOUT DAHAM/);
  assert.match(src, /CUSTOMER CENTER/);
  assert.match(src, /INSTAGRAM/);
  assert.match(src, /QUICK MENU/);
});

test('first mockup geometry is pinned to the 1024px reference', () => {
  const src = html();
  assert.match(src, /--reference-width:\s*1024px/);
  assert.match(src, /\.site-frame\s*\{[^}]*max-width:\s*var\(--reference-width\)/s);
  assert.match(src, /\.site-header\s*\{[^}]*height:\s*78px/s);
  assert.match(src, /\.hero\s*\{[^}]*height:\s*484px/s);
  assert.match(src, /\.trust-strip\s*\{[^}]*height:\s*80px/s);
  assert.match(src, /\.portfolio-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,1fr\)/s);
  assert.match(src, /\.process-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6,1fr\)/s);
  assert.match(src, /\.footer-panels\s*\{[^}]*grid-template-columns:\s*repeat\(4,1fr\)/s);
});

test('reference visual assets include the four exact portfolio crops and line icon sets', () => {
  const src = html();
  assert.match(src, /data-ref-asset="hero"/);
  assert.equal((src.match(/data-ref-asset="portfolio"/g) || []).length, 4);
  assert.equal((src.match(/data-ref-asset="trust-icon"/g) || []).length, 4);
  assert.equal((src.match(/data-ref-asset="process-icon"/g) || []).length, 6);
  assert.equal((src.match(/data-ref-asset="instagram"/g) || []).length, 6);
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
