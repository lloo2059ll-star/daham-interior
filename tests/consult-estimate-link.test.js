const test=require('node:test');
const assert=require('node:assert/strict');
const link=require('../consult-estimate-link.js');

test('wallpaper uses only exact fixed section and item ids',()=>{
  assert.deepEqual(link.autoItems({area:'32',scopeDetails:{'도배':{grade:'베스트'}}}),[{ref:'0_1',qty:1,scope:'도배'}]);
  assert.deepEqual(link.autoItems({area:'44',scopeDetails:{'도배':{grade:'디아망'}}}),[{ref:'0_4',qty:1,scope:'도배'}]);
});

test('floor exact fixed ids receive consultation area as quantity',()=>{
  assert.deepEqual(link.autoItems({area:'32',scopeDetails:{'바닥':{wood:'597×597'}}}),[{ref:'1_4',qty:32,scope:'바닥'}]);
  assert.deepEqual(link.autoItems({area:'24',scopeDetails:{'바닥':{vinyl:'3.2T'}}}),[{ref:'1_1',qty:24,scope:'바닥'}]);
});

test('entrance door applies only an explicitly stored exact item reference',()=>{
  assert.deepEqual(link.autoItems({scopeDetails:{'중문':{itemRef:'11_7'}}}),[{ref:'11_7',qty:1,scope:'중문'}]);
});

test('all other consultation scopes remain reference only',()=>{
  const items=link.autoItems({area:'30',scopeDetails:{'욕실':{mode:'전체 리모델링'},'필름':{items:['현관문']},'설비':{items:['급수 배관 교체']}}});
  assert.deepEqual(items,[]);
});


