const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'consult.html'), 'utf8');

test('consult workspace follows the approved master-detail layout', () => {
  for (const marker of ['consult-nav', 'consult-list-panel', 'consult-detail-panel', 'consult-card', 'detail-grid', 'scope-section', 'survey-section']) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(html, /상담 \/ 현장실측/);
  assert.match(html, /새 상담 등록/);
  for (const marker of ['detail-row-primary','detail-row-secondary','schedule-card','budget-card','memo-card','detail-bottom-actions']) assert.match(html, new RegExp(marker));
  assert.match(html, /상담 취소/);
  assert.match(html, /견적서 작성으로 이동/);
  for (const marker of ['consult-notification','consult-card-avatar','detail-more','scope-details-viewport']) assert.match(html,new RegExp(marker));
  assert.match(html, /\.consult-card \.consult-delete-btn\{display:none\}/);
  assert.match(html, /aria-label="상담 삭제"/);
});

test('consult statuses and exact work categories remain available', () => {
  for (const status of ['진행상담', '현장실측', '견적미팅', '견적완료', '계약']) assert.match(html, new RegExp(status));
  const scopes = ['도배','바닥','욕실','전기·조명','샷시','가구','목작업','문·문틀','설비','타일','필름','탄성코트','시스템에어컨','중문','철거','기타'];
  for (const scope of scopes) assert.match(html, new RegExp(scope.replace('·', '[·]')));
  assert.doesNotMatch(html, /CONSULT_SCOPES[^\n]*['"]주방['"]/);
});

test('consult options match the compact estimating vocabulary', () => {
  for (const option of ['베스트','디아망','597×597','165×1200','325×805','98×805','650×650','2.2T','3.2T','5.0T','거실욕실','안방욕실','둘 다','전체 리모델링','300×600','600×600','싱크','붙박이장','신발장','화장대','작은방1','작은방2','+방추가']) assert.match(html, new RegExp(option.replace(/[+]/g, '\\+')));
});

test('detail values use Korean labels instead of storage keys', () => {
  assert.match(html, /function scopeDetailRows/);
  for (const label of ['벽지 등급','마루 규격','장판 두께','욕실 위치','공사 방식','타일 규격','교체 범위','붙박이장 위치']) assert.match(html,new RegExp(label));
  assert.doesNotMatch(html, /return Object\.keys\(value\).*k\+['"]:/);
});

test('survey summary renders photos and estimate handoff keeps consultation context', () => {
  assert.match(html, /survey-photo-list/);
  assert.match(html, /survey-photo-thumb/);
  assert.match(html, /daham_prefill_consult/);
  assert.match(html, /scopes:scopes/);
  assert.match(html, /scopeDetails:r\.scopeDetails/);
});

test('address lookup keeps direct input fallback and survey excludes manual dimensions', () => {
  assert.match(html, /t1\.daumcdn\.net\/mapjsapi\/bundle\/postcode/);
  assert.match(html, /function openAddressSearch\(\)/);
  assert.match(html, /직접 입력/);
  for (const field of ['f-visit-date','f-measured','f-polycam-done','f-polycam-url','f-photo-urls','f-survey-note']) assert.match(html, new RegExp(`id="${field}"`));
  assert.doesNotMatch(html, /수동 치수|가로 치수|세로 치수/);
});

test('extended consultation fields are merged without replacing the storage key', () => {
  assert.match(html, /var DB_KEY\s*=\s*'daham_consult_v1'/);
  assert.match(html, /Object\.assign\(\{\},db\[idx\],\{/);
  assert.match(html, /scopeDetails:scopeDetails/);
  assert.match(html, /survey:survey/);
  assert.match(html, /_sb\.from\('sync_data'\)\.upsert/);
});

test('tablet workspace reflows without hiding the detail editor', () => {
  assert.match(html, /@media\(max-width:1100px\)/);
  assert.match(html, /\.consult-workspace\{grid-template-columns:320px minmax\(0,1fr\)\}/);
  assert.doesNotMatch(html, /(?:html|body)\s*\{[^}]*overflow-x\s*:\s*hidden/i);
  assert.match(html, /@media\(max-width:1100px\)\{\.consult-shell\{grid-template-columns:76px minmax\(0,1fr\)\}/);
  assert.match(html, /\.scope-details\{[^}]*grid-auto-flow:column[^}]*overflow-x:auto/);
});

