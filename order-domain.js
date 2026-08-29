(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DAHAM_ORDER_DOMAIN=api;})(typeof self!=='undefined'?self:this,function(){
'use strict';
function text(v){return String(v==null?'':v).trim();}
function trades(e){var seen={};return ((e&&e.selectedMaterials)||[]).filter(function(x){return Number(x.qty||1)>0;}).map(function(x){return text(x.sec||x.trade||x.category);}).filter(function(x){if(!x||seen[x])return false;seen[x]=1;return true;});}
function excluded(n){return /(마루|바닥재|가구|주방|샷시|창호)/.test(n);}
function generalTrades(e){return trades(e).filter(function(x){return !excluded(x);});}
function hasWindowTrade(e){return trades(e).some(function(x){return /(샷시|창호)/.test(x);});}
function windowModes(brand){return /^(KCC|LX)$/.test(text(brand))?['제작창','완성창']:['제작창'];}
function generalShareText(o,includeEntry){o=o||{};var lines=['[DAHAM 일반 발주]','', '현장: '+text(o.siteName),'주소: '+text(o.address)];if(o.detailAddress)lines.push('상세 주소: '+text(o.detailAddress));if(o.manager)lines.push('담당자: '+text(o.manager));if(o.managerPhone)lines.push('연락처: '+text(o.managerPhone));if(o.deliveryDate)lines.push('희망 납기일: '+text(o.deliveryDate));if(o.deliveryLocation)lines.push('배송 위치: '+text(o.deliveryLocation));if(o.content)lines.push('','[발주 내용]',text(o.content));if(o.deliveryRequest)lines.push('','[배송 요청사항]',text(o.deliveryRequest));if(o.driverNote)lines.push(text(o.driverNote));if(includeEntry){if(o.commonEntryCode)lines.push('공동현관: '+text(o.commonEntryCode));if(o.doorCode)lines.push('세대 현관: '+text(o.doorCode));}return lines.filter(function(x,i){return x||i>0;}).join('\n').trim();}
function quoteShareText(o){o=o||{};return text(o.content)||(text(o.siteName)?text(o.siteName):'');}
function overdueOrders(rows,now){return (rows||[]).filter(function(r){return r.status!=='delivered'&&r.deliveryDate&&r.deliveryDate<now;});}
return {generalTrades:generalTrades,hasWindowTrade:hasWindowTrade,windowModes:windowModes,generalShareText:generalShareText,quoteShareText:quoteShareText,overdueOrders:overdueOrders};
});
