const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'estimate-commercial.html'), 'utf8');

test('commercial estimate uses the dedicated domain and approved layout', () => {
  assert.match(html, /commercial-estimate-domain\.js/);
  assert.match(html, /id="commercial-categories"/);
  assert.match(html, /id="commercial-summary"/);
  assert.match(html, /상가 견적서 작성/);
  assert.match(html, /공종별 수량과 단가를 입력하면 인건비와 자재비가 자동 계산됩니다/);
  assert.match(html, /function\s+renderCommercialCategories/);
});

test('commercial estimate keeps isolated persistence keys', () => {
  assert.match(html, /PROJ_DB\s*=\s*['"]daham_commercial_v1['"]/);
  assert.match(html, /PROJ_INDEX_KEY\s*=\s*['"]daham_commercial_index_v1['"]/);
  assert.doesNotMatch(html, /PROJ_DB\s*=\s*['"]daham_projects_v3['"]/);
});

test('commercial estimate supports editable rates, autosave, and automatic restore', () => {
  assert.match(html, /function\s+setCommercialOverride/);
  assert.match(html, /function\s+restoreCommercialAutomaticValue/);
  assert.match(html, /catalogSnapshot/);
  assert.match(html, /function\s+scheduleCommercialSave/);
  assert.match(html, /profitMode/);
});

test('commercial estimates synchronize with the authenticated employee session', () => {
  assert.match(html, /DAHAM_AUTH\.getSupabaseConfig\(\)/);
  assert.match(html, /DAHAM_AUTH\.getAccessToken\(\)/);
  assert.match(html, /from\(['"]sync_data['"]\)\.upsert/);
  assert.match(html, /function\s+cloudPullCommercial/);
  assert.match(html, /loadCommercialSettings/);
  assert.match(html, /function\s+readCommercialSettingsFromCloud/);
});

test('commercial estimate is responsive without clipping the application shell', () => {
  assert.match(html, /@media\s+screen\s+and\s*\(max-width:\s*1100px\)[\s\S]*?\.commercial-shell/);
  assert.match(html, /@media\s+screen\s+and\s*\(max-width:\s*767px\)[\s\S]*?\.commercial-line/);
  assert.match(html, /@media\s+print[\s\S]*?\.commercial-summary/);
  assert.doesNotMatch(html, /\.commercial-shell\s*\{[^}]*overflow-x\s*:\s*auto/s);
});
