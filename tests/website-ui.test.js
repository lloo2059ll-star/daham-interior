const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const htmlPath = path.join(__dirname, '..', 'website.html');
function html(){ return fs.readFileSync(htmlPath, 'utf8'); }

test('public homepage keeps the approved DAHAM sections and copy', () => {
  const src = html();
  assert.match(src, /DAHAM INTERIOR/);
  assert.match(src, /공간에 가치를 더하고,/);
  assert.match(src, /일상에 편안함을 더합니다\./);
  assert.match(src, /PORTFOLIO/);
  assert.match(src, /OUR PROCESS/);
  assert.match(src, /ABOUT DAHAM/);
  assert.match(src, /CUSTOMER CENTER/);
  assert.match(src, /INSTAGRAM/);
  assert.match(src, /QUICK MENU/);
  assert.match(src, /id="inquiry-modal"/);
  assert.match(src, /견적 문의하기/);
});

test('approved desktop mockup structure replaces the old generic homepage styling', () => {
  const src = html();
  assert.match(src, /class="reference-home"/);
  assert.match(src, /--page-width:940px/);
  assert.match(src, /--header-height:78px/);
  assert.match(src, /class="hero-trust"/);
  assert.match(src, /class="portfolio-grid"/);
  assert.match(src, /grid-template-columns:repeat\(4,1fr\)/);
  assert.match(src, /class="process-grid"/);
  assert.match(src, /grid-template-columns:repeat\(6,1fr\)/);
  assert.match(src, /class="footer-panels"/);
  assert.doesNotMatch(src, /class="cta-band"/);
  assert.doesNotMatch(src, /ERP에서 공개 승인된 현장만 표시됩니다/);
});

test('homepage uses image assets or svg-like graphics rather than emoji process icons', () => {
  const src = html();
  assert.match(src, /data:image\/jpeg;base64,/);
  assert.match(src, /data:image\/png;base64,/);
  assert.doesNotMatch(src, /✦|⌖|▤|✓|◫/);
  assert.match(src, /trust-sprite/);
  assert.match(src, /process-sprite/);
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
