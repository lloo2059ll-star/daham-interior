(function(root,factory){
  var api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) root.DAHAM_ACTIVITY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  var QUEUE_KEY='daham_activity_retry_v1';

  function readQueue(){try{var rows=JSON.parse(root.localStorage.getItem(QUEUE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch(e){return [];}}
  function writeQueue(rows){root.localStorage.setItem(QUEUE_KEY,JSON.stringify(rows||[]));}
  function payload(event){return {
    p_project_id:event.projectId||null,p_entity_type:event.entityType,p_entity_id:event.entityId,p_action:event.action,
    p_title:event.title,p_summary:event.summary||'',p_changed_fields:event.changedFields||{},p_target_url:event.targetUrl||'index.html',p_dedupe_key:event.dedupeKey
  };}
  async function send(event){
    var cfg=root.DAHAM_AUTH.getSupabaseConfig();
    var response=await root.fetch(cfg.url+'/rest/v1/rpc/publish_activity',{method:'POST',headers:root.DAHAM_AUTH.getAuthHeaders(),body:JSON.stringify(payload(event))});
    var data=null;try{data=await response.json();}catch(e){}
    if(!response.ok)throw new Error(data&&data.message||'변경 알림을 기록하지 못했습니다.');
    return data;
  }
  function normalize(input){
    var event=root.DAHAM_ACTIVITY_DOMAIN.normalizeActivity(input,root.DAHAM_AUTH.currentUser());
    event.dedupeKey=root.DAHAM_ACTIVITY_DOMAIN.activityDedupeKey(event,new Date());
    return event;
  }
  async function publish(input){
    var event=normalize(input);
    try{return {queued:false,eventId:await send(event)};}
    catch(error){var rows=readQueue();rows.push(event);writeQueue(rows.slice(-200));return {queued:true,error:error.message};}
  }
  async function retryPending(){
    var rows=readQueue(),remaining=[],sent=0;
    for(var i=0;i<rows.length;i++){
      try{await send(rows[i]);sent++;}catch(e){remaining.push(rows[i]);}
    }
    writeQueue(remaining);return {sent:sent,pending:remaining.length};
  }
  async function init(){if(!root.DAHAM_AUTH||!await root.DAHAM_AUTH.ready)return false;await retryPending();return true;}
  if(root.addEventListener)root.addEventListener('online',function(){retryPending();});
  return {publish:publish,retryPending:retryPending,init:init};
});
