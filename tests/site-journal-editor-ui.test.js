const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../worklog.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../operations-ui.css'),'utf8');

test('site journal editor matches the approved full workspace structure',()=>{
  ['journal-editor-nav','journal-editor-main','journal-form-card','journal-save-summary','journal-editor-actions'].forEach(token=>assert.match(html,new RegExp(token)));
  ['작업일자','방문 유형','작성자','공종','공사 내용','원본 사진','저장 정보','현장일지 저장'].forEach(label=>assert.match(html,new RegExp(label)));
});

test('site journal editor preserves project, upload, draft and save hooks',()=>{
  ['m-proj-sel','photo-input','photo-preview','saveJournalDraft','saveRecord','deleteRecord'].forEach(token=>assert.match(html,new RegExp(token)));
  assert.match(html,/name="trade"/);
  assert.match(html,/trade:trade/);
  assert.match(html,/var vt=\(r&&r\.visitType\)\|\|'visit'/);
});

test('site journal editor has desktop and mobile layouts scoped to worklog',()=>{
  assert.match(css,/\.operations-worklog \.journal-editor-shell/);
  assert.match(css,/grid-template-columns:220px 1fr/);
  assert.match(css,/@media\(max-width:720px\)[\s\S]*journal-editor-nav\{display:none\}/);
  assert.match(css,/#modal-bg \.journal-editor-shell[\s\S]*flex:\s*0 0 100vw !important/);
  assert.match(html,/id="journal-editor-critical-css"/);
  assert.match(html,/journal-editor-modal>\.journal-editor-shell[\s\S]*position:absolute!important[\s\S]*min-width:100vw!important/);
});

test('site journal index only exposes schedule sites linked to an existing estimate',()=>{
  assert.match(html,/function activeEstimateSites\(value\)/);
  assert.match(html,/DAHAM_ACTIVE_SITES\.filterSchedules/);
  assert.match(html,/schedProjects=activeEstimateSites\(parsed\)/);
  assert.match(css,/\.operations-worklog \.worklog-app-nav/);
});

test('approved journal index includes overview, filters, progress, and three-column cards',()=>{
  ['journal-overview','journal-index-filters','overview-sites','overview-logs','overview-photos','overview-size','project-search','project-status','project-trade','project-period'].forEach(token=>assert.match(html,new RegExp(token)));
  assert.match(html,/pc-progress/);
  assert.match(html,/현장일지 보기/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(260px,1fr\)\)/);
});

test('approved project journal detail uses summary cards, timeline, trade and photo gallery',()=>{
  ['stat-icon','stat-copy','date-group','trade-badge','log-card-body','log-detail','log-photos'].forEach(token=>assert.match(html,new RegExp(token)));
  ['전체','이번달','현장 방문','사진','상세 보기'].forEach(label=>assert.match(html,new RegExp(label)));
  assert.match(html,/cnt\.photo\+=r\.photos\.length/);
  assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('every visible worklog sidebar item navigates to a real page',()=>{
  const navs=[...html.matchAll(/<(?:aside)[^>]+class="(?:worklog-app-nav|journal-editor-nav)"[\s\S]*?<nav>([\s\S]*?)<\/nav>/g)].map(match=>match[1]);
  assert.equal(navs.length,2);
  for(const nav of navs){
    assert.doesNotMatch(nav,/<(?:span|small|b)(?:\s|>)/,'visible sidebar labels must not be inert');
    for(const target of ['index.html','estimate.html','contract.html','schedule.html','worklog.html','photos.html','order.html','consult.html','contacts.html']){
      assert.match(nav,new RegExp('href="'+target.replace('.','\\.')+'"'));
    }
  }
});
