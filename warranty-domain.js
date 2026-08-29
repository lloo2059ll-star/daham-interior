(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DAHAM_WARRANTY_DOMAIN=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function items(estimate){return estimate&&Array.isArray(estimate.selectedMaterials)?estimate.selectedMaterials:[];}
  function tradeOf(item){return String(item&&(item.sec||item.trade||item.category)||'').trim();}
  function active(item){return item&&item.enabled!==false&&Number(item.qty==null?1:item.qty)>0;}
  function completionTrades(estimate){
    var seen={};
    return items(estimate).filter(active).map(tradeOf).filter(function(name){
      if(!name||seen[name])return false;seen[name]=true;return true;
    });
  }
  function materialText(estimate,tradePattern){
    return items(estimate).filter(active).filter(function(x){return tradePattern.test(tradeOf(x));})
      .map(function(x){return [x.name,x.item,x.sub,x.det,x.product,x.model,x.spec,x.brand,x.memo].filter(Boolean).join(' ');}).join(' ');
  }
  function buildWarrantyRows(estimate){
    var rows=[];
    completionTrades(estimate).forEach(function(trade){
      if(/창호|샷시/.test(trade)){
        var text=materialText(estimate,/창호|샷시/),complete=/완성창/.test(text),fabricated=/제작창/.test(text);
        if(complete)rows.push({phase:'창호 (완성창)',period:'제작사 보증',basis:'제작사 기준'});
        if(fabricated||!complete)rows.push({phase:'창호 (제작창)',period:'1년',basis:'준공일 기준'});
      }else if(/에어컨/.test(trade)){
        rows.push({phase:trade,period:'제작사 보증',basis:'제작사 기준'});
      }else{
        rows.push({phase:trade,period:'1년',basis:'준공일 기준'});
      }
    });
    return rows;
  }
  function completionRows(estimate,tasks){
    tasks=Array.isArray(tasks)?tasks:[];
    return completionTrades(estimate).map(function(name){
      var task=tasks.find(function(t){return String(t.name||'').indexOf(name)>=0||name.indexOf(String(t.name||''))>=0;})||{};
      return {name:name,start:task.start||'',end:task.end||'',done:task.status==='done'};
    });
  }
  function customerInfo(estimate){var c=estimate&&estimate.client||{};return {name:c['cl-name']||c.name||'',phone:c['cl-tel']||c.tel||c.phone||'',address:c['cl-addr']||c.address||''};}
  return {completionTrades:completionTrades,buildWarrantyRows:buildWarrantyRows,completionRows:completionRows,customerInfo:customerInfo};
});
