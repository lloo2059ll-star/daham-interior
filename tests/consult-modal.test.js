const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('new consultation panel renders the approved cards without dropping stored fields', () => {
  const modal = require('../consult-modal.js');
  const html = modal.buildBody({
    name: '홍길동',
    consultTitle: '아파트 전체 상담',
    consultContent: '현장 확인 후 견적 요청',
    addr: '서울시 강남구',
    scopes: ['도배'],
    survey: { note: '엘리베이터 사용 가능' }
  }, {
    scopePicker: '<label>도배</label>',
    scopeOptions: '<div data-scope="도배">베스트</div>'
  });

  for (const marker of [
    'consult-modal-layout',
    'consult-registration-card',
    'consult-schedule-card',
    'consult-customer-card',
    'consult-project-card',
    'consult-memo-card',
    'consult-history-card',
    'consult-existing-details'
  ]) assert.match(html, new RegExp(marker));

  for (const id of [
    'f-consult-title', 'f-consult-content', 'f-name', 'f-tel', 'f-alt-tel',
    'f-email', 'f-postcode', 'f-addr', 'f-addr-detail', 'f-area', 'f-manager',
    'f-site-name', 'f-build-year', 'f-housing-type', 'f-sdate', 'f-stime',
    'f-splace', 'f-works', 'f-budget', 'f-movedate', 'f-memo', 'f-source',
    'f-visit-date', 'f-measured', 'f-polycam-done', 'f-polycam-url',
    'f-photo-urls', 'f-survey-note', 'f-source-type', 'f-contact-channel',
    'f-outcome-status', 'f-lost-reason', 'hist-section'
  ]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /아파트 전체 상담/);
  assert.match(html, /현장 확인 후 견적 요청/);
  assert.match(html, /엘리베이터 사용 가능/);
  assert.match(html, /onclick="openAddressSearch\(\)"/);
});

test('consultation sales fields keep source contact and outcome meanings separate', () => {
  const modal = require('../consult-modal.js');
  const html = modal.buildBody({
    source: '지역카페', sourceType: 'paid', contactChannel: '카카오채널',
    outcomeStatus: 'lost', lostReason: '예산'
  }, {});
  for (const value of ['네이버 블로그', '인스타그램', '소개', '기존 고객 / 재문의', '지역카페']) assert.match(html, new RegExp(value));
  for (const value of ['organic', 'paid', 'referral', 'unknown']) assert.match(html, new RegExp(`value="${value}"`));
  for (const value of ['네이버폼', '카카오채널', '인스타 DM', '전화', '문자']) assert.match(html, new RegExp(value));
  for (const value of ['예산', '타 업체 계약', '일정 불일치', '공사 범위 불일치', '연락두절', '고객 보류', '지역 문제']) assert.match(html, new RegExp(value));
  assert.match(html, /value="지역카페" selected/);
});

test('new consultations receive one inquiry milestone while existing history stays intact', () => {
  const modal = require('../consult-modal.js');
  const history = [{ type: 'note', text: 'preserve', at: '2026-09-08T09:00' }];
  const initialized = modal.ensureInquiryMilestone(history, '2026-09-08T10:00');
  assert.equal(initialized.filter(item => item.type === 'milestone' && item.status === 'inquiry').length, 1);
  assert.equal(initialized[0].text, 'preserve');
  const unchanged = modal.ensureInquiryMilestone([{ type: 'milestone', status: 'inquiry', at: '2026-09-01T09:00' }], '2026-09-08T10:00');
  assert.equal(unchanged.length, 1);
  assert.equal(unchanged[0].at, '2026-09-01T09:00');
});

test('new consultation panel escapes stored text before rendering', () => {
  const modal = require('../consult-modal.js');
  const html = modal.buildBody({ name: '<script>alert(1)</script>' }, {});
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('consult page wires the wide modal to existing save and address flows', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'consult.html'), 'utf8');
  assert.match(page, /consult-modal\.js/);
  assert.match(page, /DAHAM_CONSULT_MODAL\.buildBody/);
  assert.match(page, /\.operations-consult \.modal-overlay\{left:178px/);
  assert.match(page, /\.operations-consult \.modal-box\{width:100%!important;max-width:none!important;height:100dvh/);
  assert.match(page, /@media\(max-width:1100px\)\{\.operations-consult \.modal-overlay\{left:76px/);
  assert.match(page, /@media\(max-width:900px\)\{\.consult-modal-main-grid\{grid-template-columns:1fr/);
  assert.match(page, /consultTitle:consultTitle/);
  assert.match(page, /consultContent:consultContent/);
  assert.match(page, /unit:unit/);
  assert.match(page, /f-addr-detail'\)\.focus/);
  assert.match(page, /body\.modal-open\{overflow-y:hidden\}/);
  assert.match(page, /document\.body\.classList\.add\('modal-open'\)/);
  assert.match(page, /document\.body\.classList\.remove\('modal-open'\)/);
  assert.match(page, /modalBody\.scrollTop\s*=\s*0/);
});

