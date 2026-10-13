const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');

test('every production page using dahamConfirm loads the shared helper before its first call', () => {
  for (const name of ['estimate.html','as.html','contacts.html','order.html','payment.html','photos.html','worklog.html']) {
    const html=read(name),loader=html.indexOf('src="ui-helpers.js"'),call=html.indexOf('dahamConfirm(');
    assert.ok(loader>=0&&loader<call,`${name} must load ui-helpers.js before using dahamConfirm`);
  }
});

test('estimate completion uses the guarded completion transaction', () => {
  const html=read('estimate.html');
  assert.match(html,/src="completion-transition\.js"/);
  assert.match(html,/DAHAM_COMPLETION_TRANSITION\.commitCompletionTransition/);
  assert.doesNotMatch(html,/ia\.indexOf\(addr\)/);
});

test('schedule photo navigation targets the real photos page', () => {
  const html=read('schedule.html');
  assert.doesNotMatch(html,/href="photo\.html"/);
  assert.match(html,/href="photos\.html"/);
});

test('schedule sharing and contacts use the current authenticated backend', () => {
  const schedule=read('schedule.html'),view=read('schedule-view.html'),contacts=read('contacts.html');
  for (const source of [schedule,view,contacts]) assert.doesNotMatch(source,/ozgiihtixsjwoxbtotfi/);
  assert.match(schedule,/schedule_shares/);
  assert.match(view,/schedule_shares/);
  assert.match(contacts,/sync_data/);
  assert.match(contacts,/DAHAM_AUTH\.getSupabaseConfig/);
});

test('schedule handles reminder deep links by event id', () => {
  const html=read('schedule.html');
  assert.match(html,/new URLSearchParams\(location\.search\)\.get\('id'\)/);
  assert.match(html,/findScheduleTarget/);
});

test('completion certificate uses the authenticated key and includes completed project snapshots', () => {
  const html=read('completion.html');
  assert.doesNotMatch(html,/cfg\.anonKey/);
  assert.match(html,/cfg\.key/);
  assert.match(html,/completionScheduleOptions/);
});

test('production help number is real and commercial preview has one implementation', () => {
  assert.doesNotMatch(read('spec.html'),/02-1234-5678/);
  assert.match(read('spec.html'),/010-2059-0347/);
  const matches=read('estimate-commercial.html').match(/function previewCommercialEstimate\(/g)||[];
  assert.equal(matches.length,1);
});

test('legacy summary toggle has a callable implementation', () => {
  assert.match(read('estimate.html'),/function toggleSummaryBar\(\)/);
});

test('order sync uses the authenticated key and reports remote failures', () => {
  const source=read('order-v2.js');
  assert.doesNotMatch(source,/cfg\.anonKey/);
  assert.match(source,/apikey:cfg\.key/);
  assert.match(source,/클라우드 동기화 실패/);
});
