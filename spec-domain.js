(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.DAHAM_SPEC_DOMAIN=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var SECTION_NAMES={
    '목작업':'목공','문/문틀':'목공','인테리어철물':'목공',
    '전기/조명':'전기·조명','거실욕실':'타일','안방욕실':'타일','타일류':'타일',
    '도배':'도배','필름':'필름','싱크대':'가구','가구':'가구','설비':'설비',
    '샷시':'창호','중문':'창호','철거':'철거','바닥':'바닥','탄성코트':'도장',
    '시스템에어컨':'시스템에어컨','기타 및 요청사항':'기타','추가사항':'기타'
  };
  var TRADE_ALIASES=[
    [/전기|조명/,'전기·조명'],[/목공|목작업|문\/문틀|인테리어철물/,'목공'],
    [/타일|욕실천장|도기/,'타일'],[/도배/,'도배'],[/필름|유리/,'필름'],
    [/가구|싱크대|붙박이/,'가구'],[/설비|배관|위생/,'설비'],[/창호|샷시/,'창호'],
    [/금속/,'금속·샷시'],[/현장.?정리|입주청소|청소/,'현장정리'],[/철거/,'철거'],
    [/바닥|마루|장판/,'바닥'],[/도장|탄성/,'도장'],[/에어컨/,'시스템에어컨'],[/중문/,'창호'],[/기타|추가/,'기타']
  ];

  function text(v){return String(v==null?'':v).trim();}
  function clone(v){return JSON.parse(JSON.stringify(v==null?null:v));}
  function slug(v){return text(v).replace(/\s+/g,'-').replace(/[^0-9A-Za-z가-힣·-]/g,'');}
  function normalizeTradeName(name){
    var value=text(name);
    for(var i=0;i<TRADE_ALIASES.length;i++) if(TRADE_ALIASES[i][0].test(value)) return TRADE_ALIASES[i][1];
    return value;
  }
  function splitMaterial(det){
    var parts=text(det).split(/\s+/).filter(Boolean), spec='',finish='';
    var specIndex=parts.findIndex(function(p){return /^\d+(?:\.\d+)?(?:T|t|mm|MM|×\d+|x\d+)$/.test(p);});
    if(specIndex>=0) spec=parts.splice(specIndex,1)[0].toUpperCase();
    var finishes=['화이트','블랙','내추럴','우드','무광','유광','실버','골드','그레이','베이지'];
    var finishIndex=parts.findIndex(function(p){return finishes.some(function(f){return p.indexOf(f)>=0;});});
    if(finishIndex>=0) finish=parts.splice(finishIndex,1)[0];
    var brand=parts.length>1?parts[0]:'';
    return {brand:brand,product:parts.join(' '),spec:spec,finish:finish};
  }
  function materialFromEstimate(item,index){
    var parsed=splitMaterial(item&&item.det);
    return {id:'material-'+index+'-'+slug((item&&item.sub)||'item'),category:text(item&&item.sub),brand:parsed.brand,product:parsed.product||text(item&&item.det),spec:parsed.spec,finish:parsed.finish,note:''};
  }
  function trade(name,index){return {id:'trade-'+slug(name),name:name,scope:'',contents:[],materials:[],sourceOrder:index};}
  function createModel(schedule,estimate,now){
    schedule=schedule||{}; estimate=estimate||{};
    var names=[], byName={};
    function ensure(raw){var name=normalizeTradeName(raw);if(!name||byName[name])return;byName[name]=trade(name,names.length);names.push(name);}
    (schedule.tasks||[]).forEach(function(task){ensure(task&&task.name);});
    (estimate.selectedMaterials||[]).forEach(function(item){ensure(SECTION_NAMES[text(item&&item.sec)]||text(item&&item.sec));});
    (estimate.selectedMaterials||[]).forEach(function(item,index){
      var name=normalizeTradeName(SECTION_NAMES[text(item&&item.sec)]||text(item&&item.sec));
      if(byName[name]) byName[name].materials.push(materialFromEstimate(item,index));
    });
    var info=schedule.info||{}, client=estimate.client||{};
    return {
      version:1,siteId:text(schedule.id),estimateId:text(schedule.estimateId||estimate.id),estimateNo:text(estimate.docNo),
      createdAt:text(now)||new Date().toISOString(),savedAt:'',notes:'',
      site:{name:text(info.name||info.addr),address:text(info.addr||client['cl-addr']),clientName:text(client['cl-name']),phone:text(client['cl-tel']),start:text(info.start||client['cl-start']),end:text(info.end||client['cl-end'])},
      trades:names.map(function(name){return byName[name];})
    };
  }
  function normalizeMaterial(m,index){return {id:text(m&&m.id)||'material-saved-'+index,category:text(m&&m.category),brand:text(m&&m.brand),product:text(m&&m.product),spec:text(m&&m.spec),finish:text(m&&m.finish),note:text(m&&m.note)};}
  function normalizeTrade(t,index){return {id:text(t&&t.id)||'trade-'+slug(t&&t.name),name:text(t&&t.name),scope:text(t&&t.scope),contents:(t&&Array.isArray(t.contents)?t.contents:[]).map(text).filter(Boolean),materials:(t&&Array.isArray(t.materials)?t.materials:[]).map(normalizeMaterial),sourceOrder:index};}
  function mergeSaved(base,saved){
    if(!saved) return clone(base);
    var out=clone(base), savedTrades=(saved.trades||[]).map(normalizeTrade), used={};
    out.trades=savedTrades.map(function(t){used[t.name]=1;return t;});
    (base.trades||[]).forEach(function(t){if(!used[t.name])out.trades.push(clone(t));});
    out.notes=text(saved.notes||saved.special);
    out.createdAt=text(saved.createdAt)||out.createdAt;
    out.savedAt=text(saved.savedAt);
    if(saved.site) out.site=Object.assign({},out.site,clone(saved.site));
    ['addr','client','tel','start','end'].forEach(function(key){
      var map={addr:'address',client:'clientName',tel:'phone',start:'start',end:'end'};
      if(text(saved[key])) out.site[map[key]]=text(saved[key]);
    });
    return out;
  }
  function materialHasValue(m){return ['category','brand','product','spec','finish','note'].some(function(k){return text(m&&m[k]);});}
  function getTradeStatus(t){
    var hasScope=!!text(t&&t.scope), hasContent=!!(t&&t.contents||[]).some(function(v){return text(v);});
    if(hasScope&&hasContent) return 'completed';
    if(hasScope||hasContent||(t&&t.materials||[]).some(materialHasValue)) return 'in-progress';
    return 'empty';
  }
  function getProgress(trades){
    var list=trades||[],completed=list.filter(function(t){return getTradeStatus(t)==='completed';}).length;
    return {completed:completed,total:list.length,percent:list.length?Math.round(completed/list.length*1000)/10:0};
  }
  function compact(obj){
    var out={};Object.keys(obj||{}).forEach(function(k){var v=obj[k];if(v==null||v===''||(Array.isArray(v)&&!v.length))return;out[k]=v;});return out;
  }
  function toCustomerDocument(model){
    model=model||{};
    var site=model.site||{}, basicInfo=compact({siteName:text(site.name),address:text(site.address),clientName:text(site.clientName),phone:text(site.phone),start:text(site.start),end:text(site.end),estimateNo:text(model.estimateNo)});
    var trades=(model.trades||[]).map(function(t){return compact({name:text(t.name),scope:text(t.scope),contents:(t.contents||[]).map(text).filter(Boolean)});}).filter(function(t){return t.name&&(t.scope||(t.contents||[]).length);});
    var materials=[];(model.trades||[]).forEach(function(t){(t.materials||[]).forEach(function(m){var safe=compact({trade:text(t.name),category:text(m.category),brand:text(m.brand),product:text(m.product),spec:text(m.spec),finish:text(m.finish),note:text(m.note)});if(Object.keys(safe).length>1)materials.push(safe);});});
    return compact({basicInfo:basicInfo,scopes:trades.map(function(t){return compact({name:t.name,scope:t.scope});}).filter(function(t){return t.scope;}),materials:materials,trades:trades,notes:text(model.notes)});
  }
  return {createModel:createModel,mergeSaved:mergeSaved,getTradeStatus:getTradeStatus,getProgress:getProgress,toCustomerDocument:toCustomerDocument,normalizeTradeName:normalizeTradeName};
});
