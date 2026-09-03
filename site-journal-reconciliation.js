(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DAHAM_SITE_JOURNAL_RECONCILIATION=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function clean(v){return String(v==null?'':v).trim();}
  function reconcile(input){
    input=input||{};var now=Number(input.now||Date.now()),objects=input.objects||[],photos=input.photos||[],archives=input.archives||[];
    var byPath=new Map(objects.map(function(o){return[clean(o.path),o];})),metadata=new Set(photos.filter(function(p){return !p.deleted_at;}).map(function(p){return clean(p.storage_path);}));
    var orphaned=objects.filter(function(o){return !metadata.has(clean(o.path));}).map(function(o){return clean(o.path);});
    var missing=photos.filter(function(p){return !p.deleted_at&&!byPath.has(clean(p.storage_path));}).map(function(p){return p.id;});
    var checksumMismatch=photos.filter(function(p){var o=byPath.get(clean(p.storage_path));return o&&clean(o.sha256)&&clean(p.sha256).toLowerCase()!==clean(o.sha256).toLowerCase();}).map(function(p){return p.id;});
    var staleUploads=photos.filter(function(p){return p.status==='uploading'&&now-new Date(p.created_at).getTime()>60*60*1000;}).map(function(p){return p.id;});
    var stuckArchives=archives.filter(function(a){return ['queued','processing'].includes(a.status)&&now-new Date(a.created_at).getTime()>6*60*60*1000;}).map(function(a){return a.id;});
    return {checked:objects.length+photos.length+archives.length,orphaned:orphaned,missing:missing,checksumMismatch:checksumMismatch,staleUploads:staleUploads,stuckArchives:stuckArchives,repaired:[]};
  }
  function capacityLevel(percent){percent=Number(percent)||0;return percent>=95?'critical':percent>=85?'danger':percent>=70?'warning':'ok';}
  return {reconcile:reconcile,capacityLevel:capacityLevel};
});

