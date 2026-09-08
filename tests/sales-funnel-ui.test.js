const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'erp.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'sales-funnel-dashboard.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'sales-funnel-dashboard.css'), 'utf8');

test('ERP loads protected funnel assets after authentication', () => {
  assert.ok(html.indexOf('auth.js') < html.indexOf('sales-funnel-domain.js'));
  assert.ok(html.indexOf('sales-funnel-domain.js') < html.indexOf('sales-funnel-dashboard.js'));
  assert.match(html, /id="salesFunnelShell"[^>]*customer-sensitive/);
  assert.match(js, /DAHAM_AUTH\.ready/);
  assert.match(js, /Funnel\.canView\(user\)/);
});

test('funnel UI distinguishes activity goals from cohort conversion', () => {
  for (const label of ['신규 문의', '현장방문', '견적미팅', '계약']) assert.match(js, new RegExp(label));
  assert.match(js, /월간 활동 실적/);
  assert.match(js, /목표 달성/);
  assert.match(js, /cohort 전환율/);
  assert.match(js, /계약 총액/);
  assert.match(js, /평균 계약금액/);
  assert.match(js, /미계약\/보류/);
});

test('dashboard exposes filters goal editing drill-down and separate analysis axes', () => {
  for (const marker of ['this_month', 'last_month', 'last_3_months', 'year', 'salesFunnelMonth', 'salesFunnelGoalButton', 'salesFunnelDetails']) assert.match(html + js, new RegExp(marker));
  for (const label of ['유입경로 성과', '유입유형', '문의수단', '이탈·미계약 분석', '월별 히스토리']) assert.match(js, new RegExp(label));
  for (const field of ['고객명', '현장명', '최초 문의일', '현장방문일', '견적미팅일', '계약일', '유입유형', '문의수단', '미계약 사유', '계약금액']) assert.match(js, new RegExp(field));
  assert.match(js, /daham_open_consult/);
  assert.match(js, /불러오는 중/);
  assert.match(js, /저장된 목표를 불러오지 못했습니다|기본 목표/);
});

test('staff and customer mode cannot see funnel content', () => {
  assert.match(css, /\.customer-view\s+\.sales-funnel-shell\s*\{[^}]*display:none!important/);
  assert.match(js, /if\s*\(!Funnel\.canView\(user\)\)\s*\{/);
  assert.doesNotMatch(js, /contains\('customer-view'\)\) shell\.hidden = true/);
});

test('funnel layout is four columns on PC two on tablet and one on mobile', () => {
  assert.match(css, /\.sales-funnel-stage-grid\s*\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1180px\)[\s\S]*\.sales-funnel-stage-grid\s*\{[^}]*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.sales-funnel-stage-grid\s*\{[^}]*grid-template-columns:1fr/);
});
