const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../schedule-domain.js');
const H = require('../schedule-holidays.js');
const fs = require('node:fs');
const path = require('node:path');

const q = (...keys) => Object.fromEntries(keys.map(key => [key, '1']));

test('contract projects use stable project id and never duplicate linked sites', () => {
  const estimates = [
    {id:'p1', status:'contracted', client:{'cl-name':'A','cl-addr':'서울시 강남구 101호'}},
    {id:'p2', contracted:true, client:{'cl-name':'B','cl-addr':'서울시 송파구 202호'}},
    {id:'p3', status:'estimate'},
    {id:'p4', status:'completed', contracted:true}
  ];
  const sites = [{id:'s1', estimateId:'p1', info:{name:'old'}, tasks:[]}];
  const result = D.reconcileContractSites(sites, estimates, ()=>'new-id', ['#111']);
  assert.equal(result.sites.length, 2);
  assert.equal(result.sites.filter(x=>x.estimateId==='p1').length, 1);
  assert.equal(result.sites.find(x=>x.estimateId==='p1').info.name, '서울시 강남구 101호');
  assert.equal(result.sites.find(x=>x.estimateId==='p1').info.customerName, 'A');
  assert.equal(result.sites.find(x=>x.estimateId==='p2').info.name, '서울시 송파구 202호');
  assert.equal(result.sites.find(x=>x.estimateId==='p2').estimateId, 'p2');
  assert.equal(result.sites.some(x=>x.estimateId==='p3'||x.estimateId==='p4'), false);
});

test('contract site name is blank instead of falling back to customer when construction address is missing', () => {
  const result=D.reconcileContractSites([], [{id:'p',status:'contracted',client:{'cl-name':'고객명'}}], ()=>'site', ['#111']);
  assert.equal(result.sites[0].info.name, '');
  assert.equal(result.sites[0].info.customerName, '고객명');
});

test('legacy sites and schedules are normalized without deletion or id changes', () => {
  const original = [{id:'legacy',info:{name:'수동'},tasks:[
    {id:'a',name:'동일',start:'2026-01-01',end:'2026-01-01'},
    {id:'b',name:'동일',start:'2026-01-01',end:'2026-01-01'}
  ]}];
  const result = D.normalizeSites(original, ['#123']);
  assert.equal(result[0].sourceType, undefined);
  assert.deepEqual(result[0].tasks.map(x=>x.id), ['a','b']);
  assert.equal(result[0].tasks.length, 2);
});

test('legacy index estimate keys map through the fixed catalog', () => {
  const names=D.buildPhaseCandidates({'2_0':'1','15_0':'1','1_3':'1','17_1':'1','5_13':'1','6_9':'1','5_23':'1'}).map(x=>x.name);
  for(const expected of ['전기/조명 1차','전기/조명 2차','에어컨 1차','에어컨 2차','마루 철거','마루 시공','타일작업','욕실 천장작업','도기세팅']) assert.ok(names.includes(expected),expected);
});

test('reconcile preserves populated schedule fields but clears a customer-derived name when address is blank', () => {
  const sites=[{id:'s',estimateId:'p',info:{name:'기존명',tel:'010',addr:'기존주소',start:'2026-01-01',end:'2026-02-01',status:'contracted'},tasks:[]}];
  const result=D.reconcileContractSites(sites,[{id:'p',status:'contracted',client:{}}],()=>'',[]);
  assert.equal(result.updated,1);
  assert.equal(result.sites[0].info.name,'');
  assert.equal(result.sites[0].info.tel,'010');
  assert.equal(result.sites[0].info.addr,'기존주소');
  assert.equal(result.sites[0].info.start,'2026-01-01');
  assert.equal(result.sites[0].info.end,'2026-02-01');
});

test('electric and air conditioner create first and second phases', () => {
  const candidates = D.buildPhaseCandidates(q(
    '전기/조명|거실등|[1]파인3등(380*710)',
    '시스템에어컨|2대|'
  ));
  assert.deepEqual(candidates.map(x=>x.name), [
    '전기/조명 1차','에어컨 1차','전기/조명 2차','에어컨 2차'
  ]);
});

test('floor demolition only appears with new wood floor', () => {
  const removal='철거|바닥철거|강마루 철거';
  const newFloor='바닥|강마루 구정(94-800 7.5T)|';
  assert.deepEqual(D.buildPhaseCandidates(q(removal)).map(x=>x.name), ['철거']);
  assert.deepEqual(D.buildPhaseCandidates(q(newFloor)).map(x=>x.name), ['마루 시공']);
  const names=D.buildPhaseCandidates(q(removal,newFloor)).map(x=>x.name);
  assert.ok(names.indexOf('마루 철거') < names.indexOf('마루 시공'));
});

test('bathroom work merges by work unit and preserves tile ceiling sanitary order', () => {
  const candidates = D.buildPhaseCandidates(q(
    '거실욕실|벽타일 300-600|',
    '안방욕실|바닥타일 300-300|',
    '타일류|현관 바닥타일 600-600|',
    '거실욕실|욕실천장|욕실천장',
    '안방욕실|욕실천장|욕실천장',
    '거실욕실|양변기|[1]투비스 VIGO',
    '안방욕실|세면대 수전|[1]BSL-1001 SS'
  ));
  const bath=candidates.filter(x=>['타일작업','욕실 천장작업','도기세팅'].includes(x.name));
  assert.deepEqual(bath.map(x=>x.name), ['타일작업','욕실 천장작업','도기세팅']);
  assert.equal(new Set(bath.map(x=>x.ruleId)).size, 3);
});

test('only positive exact estimate keys create candidates', () => {
  assert.deepEqual(D.buildPhaseCandidates({'전기/조명 비슷한값|x|y':'1'}), []);
  assert.deepEqual(D.buildPhaseCandidates({'전기/조명|거실등|[1]파인3등(380*710)':'0'}), []);
});

test('candidate selection supports uncheck add and rename without mutation', () => {
  const base=D.buildPhaseCandidates(q('전기/조명|거실등|[1]파인3등(380*710)'));
  const result=D.materializeCandidates([
    {...base[0],selected:false},
    {...base[1],name:'전기 마감',selected:true},
    {ruleId:'manual:x',name:'외부 공정',selected:true,worker:'외부기사'}
  ]);
  assert.deepEqual(result.map(x=>x.name), ['전기 마감','외부 공정']);
  assert.equal(result[1].worker,'외부기사');
  assert.equal(base[1].name,'전기/조명 2차');
});

test('worker conflicts include touching boundaries and exclude current id', () => {
  const sites=[{id:'s1',info:{name:'현장A'},tasks:[
    {id:'old',name:'타일',worker:'김 기사',start:'2026-09-10',end:'2026-09-12'}
  ]}];
  const hit=D.findWorkerConflicts({id:'new',worker:'김 기사',start:'2026-09-12',end:'2026-09-14'},sites);
  assert.equal(hit.length,1);
  assert.equal(hit[0].overlapStart,'2026-09-12');
  assert.equal(D.findWorkerConflicts({id:'old',worker:'김 기사',start:'2026-09-12',end:'2026-09-14'},sites).length,0);
});

test('batch conflict detection checks candidates against each other', () => {
  const hits=D.findBatchWorkerConflicts([{name:'A',worker:'외부',start:'2026-01-01',end:'2026-01-02'},{name:'B',worker:'외부',start:'2026-01-02',end:'2026-01-03'}],[]);
  assert.equal(hits.length,1);
});

test('mobile agenda expands multi-day events across month boundaries', () => {
  const rows=D.agendaOccurrences([{id:'x',start:'2026-08-30',end:'2026-09-02'}],2026,8);
  assert.deepEqual(rows.map(x=>x.date),['2026-09-01','2026-09-02']);
});

test('selected site print plan spans every construction month and excludes other schedules', () => {
  const site={id:'samgu',info:{name:'옥계 삼구트리니엔 103동 1001호'},tasks:[
    {id:'demolition',name:'철거',start:'2026-07-30',end:'2026-08-05',status:'done'},
    {id:'cleaning',name:'입주청소',start:'2026-09-09',end:'2026-09-09',status:'planned'}
  ]};
  const plan=D.buildProjectPrintPlan(site);
  assert.deepEqual(plan.months,[{year:2026,month:6},{year:2026,month:7},{year:2026,month:8}]);
  assert.deepEqual(plan.tasks.map(task=>task.id),['demolition','cleaning']);
  assert.equal(plan.title,'옥계 삼구트리니엔 103동 1001호');
  assert.equal(plan.period,'2026-07-30 ~ 2026-09-09');
});

test('force save permission follows existing active owner role', () => {
  assert.equal(D.canForceConflict({role:'owner',isActive:true}),true);
  assert.equal(D.canForceConflict({role:'admin',isActive:true}),false);
  assert.equal(D.canForceConflict({role:'owner',isActive:false}),false);
});

test('holiday provider keeps fallback when optional provider fails', async () => {
  const holidays=await H.load(async()=>{throw new Error('cors');});
  assert.equal(holidays['2026-02-17'],'설날');
  assert.equal(holidays['2026-06-03'],'제9회 전국동시지방선거');
});

test('general events use a separate backward compatible sync key', () => {
  const html=fs.readFileSync(path.join(__dirname,'..','schedule.html'),'utf8');
  assert.match(html,/GENERAL_DB_KEY\s*=\s*'daham_schedule_general_v1'/);
  assert.match(html,/localStorage\.setItem\(DB_KEY,JSON\.stringify\(allProjects\)\)/);
  assert.match(html,/localStorage\.setItem\(GENERAL_DB_KEY,JSON\.stringify\(allGeneralEvents\)\)/);
  const migrate=html.match(/function migrate\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
  assert.doesNotMatch(migrate,/\.filter\(/);
});

test('contract general schedules have a dedicated label and color', () => {
  assert.deepEqual(D.generalTypeMeta('contract'), {label:'계약',color:'#f08a24'});
  assert.deepEqual(D.generalTypeMeta('as'), {label:'AS',color:'#61ad78'});
});

test('a misplaced site task moves to a contract schedule without losing its details', () => {
  const sites=[{id:'site-old',info:{name:'옥계 e편한세상'},tasks:[
    {id:'task-contract',kind:'construction',name:'우미린 계약',start:'2026-09-01',end:'2026-09-01',status:'planned',memo:'계약서 준비'},
    {id:'task-work',kind:'construction',name:'철거',start:'2026-09-02',end:'2026-09-03'}
  ]}];
  const moved=D.moveSiteTaskToGeneral(sites,[], 'site-old','task-contract','contract');
  assert.deepEqual(moved.sites[0].tasks.map(task=>task.id),['task-work']);
  assert.deepEqual(moved.generalEvents,[{
    id:'task-contract',kind:'general',generalType:'contract',name:'우미린 계약',
    start:'2026-09-01',end:'2026-09-01',status:'planned',memo:'계약서 준비'
  }]);
});

test('a site task is not removed when its id already exists in general schedules', () => {
  const sites=[{id:'site-old',tasks:[{id:'same-id',name:'우미린 계약',start:'2026-09-01'}]}];
  const general=[{id:'same-id',kind:'general',generalType:'contract',name:'기존 계약',start:'2026-08-01'}];
  const moved=D.moveSiteTaskToGeneral(sites,general,'site-old','same-id','contract');
  assert.equal(moved.moved,false);
  assert.deepEqual(moved.sites[0].tasks,sites[0].tasks);
  assert.deepEqual(moved.generalEvents,general);
});

test('construction bar label omits the site address while retaining phase and worker', () => {
  assert.equal(D.constructionDisplayName({projName:'옥계 삼구트리니엔 103동 1001호',name:'도배',worker:'석호성'}),'도배 · 석호성');
  assert.equal(D.constructionDisplayName({projName:'푸르지오캐슬 c단지 303동 1306호',name:'철거'}),'철거');
});

test('site progress counts schedules ending today or earlier', () => {
  const tasks=[
    {start:'2026-08-01',end:'2026-08-29'},
    {start:'2026-08-31',end:'2026-08-31'},
    {start:'2026-09-01',end:'2026-09-02'}
  ];
  assert.equal(D.scheduleProgress(tasks,'2026-08-31'),67);
  assert.equal(D.scheduleProgress(tasks,'2026-07-31'),0);
  assert.equal(D.scheduleProgress(tasks,'2026-09-02'),100);
  assert.equal(D.scheduleProgress([],'2026-08-31'),0);
});




