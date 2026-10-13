const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../warranty-domain.js');

test('completion certificate selector keeps completed projects available from their archive snapshot', () => {
  const active=[{id:'s1',estimateId:'active',info:{name:'진행 현장'},tasks:[]}];
  const estimates=[
    {id:'active',status:'construction',client:{'cl-addr':'진행 현장'}},
    {id:'done',status:'completed',client:{'cl-addr':'완료 현장','cl-name':'고객'},completionData:{schedId:'s-done',tasks:[{id:'t1'}],color:'#111',completedAt:'2026-10-13T00:00:00.000Z'}}
  ];
  const rows=W.completionScheduleOptions(active,estimates);
  assert.deepEqual(rows.map(x=>x.id),['s1','s-done']);
  assert.equal(rows[1].estimateId,'done');
  assert.equal(rows[1].info.name,'완료 현장');
  assert.deepEqual(rows[1].tasks,[{id:'t1'}]);
});

test('completion certificate selector does not duplicate a completed schedule already present', () => {
  const active=[{id:'s-done',estimateId:'done',info:{name:'완료 현장'},tasks:[]}];
  const estimates=[{id:'done',status:'completed',client:{'cl-addr':'완료 현장'},completionData:{schedId:'s-done',tasks:[{id:'archived'}]}}];
  assert.equal(W.completionScheduleOptions(active,estimates).length,1);
});
