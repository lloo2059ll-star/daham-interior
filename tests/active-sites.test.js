const test=require('node:test');
const assert=require('node:assert/strict');
const active=require('../active-sites.js');

test('only schedules connected to currently contracted or constructing estimates remain',()=>{
  const estimates=[
    {id:'contract',contracted:true},
    {id:'building',status:'construction'},
    {id:'quote'},
    {id:'done',completed:true}
  ];
  const schedules=[
    {id:'s1',estimateId:'contract'},
    {id:'s2',estimateId:'building'},
    {id:'s3',estimateId:'quote'},
    {id:'s4',estimateId:'done'},
    {id:'dongyang'},
    {id:'orphan',estimateId:'missing'}
  ];
  assert.deepEqual(active.filterSchedules(schedules,estimates).map(x=>x.id),['s1','s2']);
});
