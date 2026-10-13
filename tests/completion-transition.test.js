const test = require('node:test');
const assert = require('node:assert/strict');

let C;
try { C = require('../completion-transition.js'); } catch (_) { C = null; }

function fixture() {
  return {
    project: {id:'p1',status:'construction',contracted:true,completed:false,client:{'cl-name':'홍길동','cl-addr':'구미시 옥계동 100'},updatedAt:'old'},
    datasets: {
      schedules:[
        {id:'s1',estimateId:'p1',color:'#123456',info:{name:'정확한 현장'},tasks:[{id:'t1',name:'목공'}]},
        {id:'s2',estimateId:'p2',info:{name:'다른 현장'},tasks:[{id:'t2'}]}
      ],
      specs:[{id:'sp1',schedId:'s1'},{id:'sp2',schedId:'s2'}],
      payments:{p1:{payments:[{id:'pay1'}]},p2:{payments:[{id:'pay2'}]}},
      photos:[{id:'ph1',projId:'p1'},{id:'ph2',projId:'s1'},{id:'ph3',projId:'p2'}],
      completedPhotos:{existing:[{id:'old'}]}
    }
  };
}

test('completion transition archives the exact linked project data without mutating input', () => {
  assert.ok(C, 'completion-transition.js must provide the completion transaction');
  const source=fixture(), before=JSON.stringify(source);
  const result=C.buildCompletionTransition(source.project,source.datasets,'2026-10-13T12:00:00.000Z');

  assert.equal(JSON.stringify(source),before);
  assert.equal(result.project.status,'completed');
  assert.equal(result.project.completed,true);
  assert.equal(result.project.completionData.schedId,'s1');
  assert.deepEqual(result.project.completionData.tasks,[{id:'t1',name:'목공'}]);
  assert.deepEqual(result.datasets.schedules.map(x=>x.id),['s2']);
  assert.deepEqual(result.datasets.specs.map(x=>x.id),['sp2']);
  assert.deepEqual(Object.keys(result.datasets.payments),['p2']);
  assert.deepEqual(result.datasets.photos.map(x=>x.id),['ph3']);
  assert.deepEqual(result.datasets.completedPhotos.p1.map(x=>x.id),['ph1','ph2']);
});

test('legacy schedule fallback requires one exact address and customer match', () => {
  assert.ok(C, 'completion-transition.js must provide the completion transaction');
  const source=fixture();
  source.datasets.schedules=[
    {id:'wrong',info:{addr:'구미시 옥계동 100',customerName:'다른 고객'},tasks:[]},
    {id:'right',info:{addr:'구미시 옥계동 100',customerName:'홍길동'},tasks:[{id:'right-task'}]}
  ];
  source.datasets.specs=[]; source.datasets.photos=[];
  const result=C.buildCompletionTransition(source.project,source.datasets,'2026-10-13T12:00:00.000Z');
  assert.equal(result.project.completionData.schedId,'right');
  assert.deepEqual(result.project.completionData.tasks,[{id:'right-task'}]);
});

test('ambiguous legacy schedule data is rejected before any data is removed', () => {
  assert.ok(C, 'completion-transition.js must provide the completion transaction');
  const source=fixture();
  source.datasets.schedules=[
    {id:'a',info:{addr:'구미시 옥계동 100',customerName:'홍길동'},tasks:[]},
    {id:'b',info:{addr:'구미시 옥계동 100',customerName:'홍길동'},tasks:[]}
  ];
  assert.throws(()=>C.buildCompletionTransition(source.project,source.datasets,'2026-10-13T12:00:00.000Z'),/일정 연결이 중복/);
  assert.equal(source.project.status,'construction');
  assert.equal(source.datasets.schedules.length,2);
});

test('completion can proceed without a schedule and preserves unrelated stores', () => {
  assert.ok(C, 'completion-transition.js must provide the completion transaction');
  const source=fixture();
  source.datasets.schedules=[]; source.datasets.specs=[]; source.datasets.photos=[];
  const result=C.buildCompletionTransition(source.project,source.datasets,'2026-10-13T12:00:00.000Z');
  assert.equal(result.project.status,'completed');
  assert.equal(result.project.completionData.schedId,undefined);
  assert.deepEqual(result.datasets.schedules,[]);
  assert.deepEqual(Object.keys(result.datasets.payments),['p2']);
});

test('completion transaction rolls local data back when remote persistence fails', async () => {
  assert.ok(C, 'completion-transition.js must provide the completion transaction');
  const source=fixture();
  let state='original',rolledBack=false;
  await assert.rejects(()=>C.commitCompletionTransition(source.project,source.datasets,'2026-10-13T12:00:00.000Z',{
    writeLocal(){state='completed';},
    syncRemote(){throw new Error('cloud failed');},
    rollback(){state='original';rolledBack=true;}
  }),/cloud failed/);
  assert.equal(state,'original');
  assert.equal(rolledBack,true);
});

test('completion transaction reports success only after local and remote persistence finish', async () => {
  assert.ok(C, 'completion-transition.js must provide the completion transaction');
  const source=fixture(),steps=[];
  const result=await C.commitCompletionTransition(source.project,source.datasets,'2026-10-13T12:00:00.000Z',{
    writeLocal(){steps.push('local');},
    async syncRemote(){steps.push('remote');},
    rollback(){steps.push('rollback');}
  });
  assert.deepEqual(steps,['local','remote']);
  assert.equal(result.project.status,'completed');
});
