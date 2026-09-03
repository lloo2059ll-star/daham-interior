(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DAHAM_COMPLETION_ARCHIVE=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function required(v,n){v=String(v==null?'':v).trim();if(!v)throw new Error(n+' is required');return v;}
  function create(config){
    config=config||{};var url=required(config.url,'url').replace(/\/$/,'');var key=required(config.key,'key');var token=config.getAccessToken||function(){return'';};
    function headers(){return {'apikey':key,'authorization':'Bearer '+required(token(),'accessToken'),'content-type':'application/json'};}
    async function request(path,options){var res=await fetch(url+path,Object.assign({},options||{},{headers:Object.assign({},headers(),options&&options.headers)}));var body=await res.json().catch(function(){return{};});if(!res.ok)throw Object.assign(new Error(body.error||'준공자료 요청에 실패했습니다'),{code:body.error,status:res.status});return body;}
    async function createArchive(projectId,idempotencyKey){return request('/functions/v1/create-completion-archive',{method:'POST',body:JSON.stringify({projectId:required(projectId,'projectId'),idempotencyKey:idempotencyKey||crypto.randomUUID()})});}
    async function get(projectId){var q='?project_id=eq.'+encodeURIComponent(required(projectId,'projectId'))+'&select=id,status,checkpoint,journal_count,photo_count,source_bytes,pdf_path,zip_path,zip_bytes,zip_sha256,error_code,created_at,completed_at&order=created_at.desc&limit=1';var rows=await request('/rest/v1/completion_archives'+q);return Array.isArray(rows)?rows[0]||null:rows;}
    async function createSignedDownload(archive,type){if(!archive||archive.status!=='ready')throw new Error('준공자료가 아직 준비되지 않았습니다');var path=type==='pdf'?archive.pdf_path:archive.zip_path;if(!path)throw new Error('파일 경로가 없습니다');var result=await request('/storage/v1/object/sign/completion-archives/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',body:JSON.stringify({expiresIn:300})});return result.signedURL||result.signedUrl;}
    return {create:createArchive,get:get,createSignedDownload:createSignedDownload};
  }
  return {createClient:create};
});

