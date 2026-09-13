const test=require('node:test');
const assert=require('node:assert/strict');
const domain=require('../schedule-domain');
test('site dates follow construction tasks on load, reschedule and removal',()=>{
 const site={info:{name:'현장',start:'',end:''},tasks:[{id:'a',start:'2026-10-10',end:'2026-10-12',kind:'construction'},{id:'b',start:'2026-11-13',kind:'construction'},{start:'2026-01-01',kind:'general'},{start:'2026-02-30'},{start:'2026-12-01',status:'cancelled'}]};
 const normalized=domain.normalizeSites([site])[0];
 assert.equal(normalized.info.start,'2026-10-10');assert.equal(normalized.info.end,'2026-11-13');
 assert.equal(site.info.start,'');
 normalized.tasks=normalized.tasks.filter(t=>t.id==='a');domain.syncProjectPeriod(normalized);
 assert.equal(normalized.info.end,'2026-10-12');
 normalized.tasks=[];domain.syncProjectPeriod(normalized);assert.equal(normalized.info.start,'');assert.equal(normalized.info.end,'');
});
test('manual period is preserved before a first valid construction task',()=>{
 const site={info:{start:'2026-10-01',end:'2026-10-31'},tasks:[]};domain.syncProjectPeriod(site);assert.equal(site.info.start,'2026-10-01');
});
test('contract sync cannot replace computed schedule dates with contract dates',()=>{
 const site={id:'s',estimateId:'e',info:{start:'',end:''},tasks:[{start:'2026-10-10',end:'2026-11-13'}]};
 const result=domain.reconcileContractSites([site],[{id:'e',status:'contracted',client:{'cl-start':'2026-09-01','cl-end':'2026-09-30'}}],()=> 'new',[],{});
 assert.equal(result.sites[0].info.start,'2026-10-10');assert.equal(result.sites[0].info.end,'2026-11-13');
});
