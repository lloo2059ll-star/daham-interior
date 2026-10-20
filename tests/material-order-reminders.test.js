const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../supabase/functions/schedule-reminders/domain.js');
const site=(tasks,extra={})=>({id:'site-1',info:{addr:'한빛타운',status:'시공중'},tasks,...extra});
const task=(extra={})=>({id:'tile-1',name:'타일(시공자님)',start:'2026-10-20',end:'2026-10-23',status:'planned',...extra});
function extract(sites){return D.extractMaterialEvents({construction:JSON.stringify(sites)});}
function rows(events,now='2026-10-13T09:00:00+09:00'){return D.buildMaterialReminderRows({events,now,companyId:'company-1'});}
test('existing saved schedules need no migration or new flag to receive D-7 material reminders',()=>{
  const events=extract([site([task()])]);
  assert.equal(events.length,1);assert.equal(events[0].reminderDate,'2026-10-13');
  const r=rows(events);assert.equal(r.length,1);
  assert.equal(r[0].kind,'material_order_week');
  assert.equal(r[0].title,'[한빛타운] 타일 시공 D-7 · 자재 발주 확인');
  assert.equal(r[0].body,'10월 20일 시공 예정입니다. 타일 품목·수량과 납기 일정을 확인해 주세요.');
  assert.equal(r[0].targetUrl,'schedule.html?id=tile-1');
  assert.equal(r[0].dedupeKey,'material-order:site-1:tile-1:2026-10-20');
});
test('material alerts use Korean business hours and never send future due dates early',()=>{
  const events=extract([site([task()])]);
  for(const now of ['2026-10-12T12:00:00+09:00','2026-10-13T08:59:59+09:00','2026-10-13T18:00:00+09:00','2026-10-20T09:00:00+09:00'])assert.equal(rows(events,now).length,0,now);
  assert.equal(rows(events,'2026-10-13T00:00:00Z').length,1);
  assert.equal(rows(events,'2026-10-13T09:05:00+09:00')[0].dedupeKey,rows(events)[0].dedupeKey);
  const late=rows(events,'2026-10-17T09:00:00+09:00');
  assert.equal(late.length,1);assert.match(late[0].title,/D-3/);
  assert.equal(late[0].dedupeKey,rows(events)[0].dedupeKey);
});
test('rescheduling replaces reminder date and invalidates only unsent obsolete rows',()=>{
  const old=extract([site([task()])]),next=extract([site([task({start:'2026-10-23'})])]);
  assert.equal(next[0].reminderDate,'2026-10-16');assert.equal(rows(next).length,0);
  assert.equal(rows(next,'2026-10-16T09:00:00+09:00').length,1);
  const jobs=[{id:'stale',status:'pending',dedupe_key:rows(old)[0].dedupeKey},{id:'sent',status:'sent',dedupe_key:rows(old)[0].dedupeKey},{id:'other',status:'pending',dedupe_key:'activity:example'}];
  assert.deepEqual(D.obsoleteMaterialReminderIds(jobs,next,'2026-10-13T09:00:00+09:00'),['stale']);
  assert.deepEqual(D.obsoleteMaterialReminderIds(jobs,[],'2026-10-13T09:00:00+09:00'),['stale']);
});
test('completed, cancelled, deleted and non-material work cannot create an order alert',()=>{
  const tasks=[task({id:'done',status:'done'}),task({id:'progress',status:'progress'}),task({id:'cancelled',status:'cancelled'}),task({id:'deleted',deleted:true}),task({id:'remove',name:'마루철거(업체)'}),task({id:'airhole',name:'에어컨 타공(업체)'}),task({id:'clean',name:'입주청소'}),task({id:'survey',name:'실측'})];
  assert.deepEqual(extract([site(tasks)]),[]);
  assert.deepEqual(extract([site([task()],{info:{addr:'완료현장',status:'시공완료'}})]),[]);
  assert.deepEqual(extract([site([task()],{cancelled:true})]),[]);
});
test('material phases include supplier legacy names without exposing worker labels',()=>{
  const tasks=['목공(업체)','도배','필름','마루 시공','장판','데코타일','도기세팅','욕실천장','창호','중문','방문시공','전기/조명 1차','에어컨 마감','싱크대 가구','주방(한샘)','한샘 바스','탄성코트','철거,설비'].map((name,i)=>task({id:'t'+i,name}));
  const events=extract([site(tasks)]);assert.equal(events.length,tasks.length);
  assert.ok(events.every(e=>!e.material.includes('업체')));
  assert.equal(events.find(e=>e.taskId==='t17').material,'설비');
});
test('valid dates handle year boundaries and do not silently roll invalid dates',()=>{
  assert.equal(extract([site([task({start:'2027-01-03'})])])[0].reminderDate,'2026-12-27');
  for(const start of ['2026-02-30','bad','2026-13-20'])assert.equal(extract([site([task({start})])]).length,0);
});
