(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DAHAM_NOTICE_DOMAIN=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var MAP=[['철거','철거'],['마루철거','철거'],['도배','도배'],['바닥','바닥'],['마루','바닥'],['장판','바닥'],['전기','전기/조명'],['조명','전기/조명'],['에어컨','에어컨'],['타공','에어컨'],['주방','싱크대'],['싱크대','싱크대'],['욕실','욕실'],['위생도기','욕실'],['타일','타일'],['도장','도장'],['목공','목공'],['필름','목공'],['중문','목공'],['창호','창호']];
  var NOISY=/(철거|타공|코어|절단|샌딩|그라인더|해체|면갈이|목공)/;
  function text(v){return String(v==null?'':v).trim();}
  function date(ds){if(!ds)return '';var p=ds.split('-');return Number(p[1])+'월 '+Number(p[2])+'일';}
  function workTypes(tasks){var seen={};return (tasks||[]).map(function(t){var n=text(t&&t.name),hit=MAP.find(function(x){return n.indexOf(x[0])>=0;});return hit&&hit[1];}).filter(function(v){if(!v||seen[v])return false;seen[v]=1;return true;});}
  function noiseDays(tasks){return (tasks||[]).filter(function(t){return NOISY.test(text(t&&t.name))&&text(t&&t.start);}).slice().sort(function(a,b){return text(a.start).localeCompare(text(b.start));}).map(function(t){var start=date(t.start),end=t.end&&t.end!==t.start?' - '+date(t.end):'';return {name:text(t.name),start:text(t.start),end:text(t.end),label:text(t.name)+' '+start+end};});}
  return {workTypes:workTypes,noiseDays:noiseDays,isNoisy:function(name){return NOISY.test(text(name));}};
});
