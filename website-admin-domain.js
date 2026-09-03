(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.DAHAM_WEBSITE_ADMIN=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function text(value){ return String(value==null?'':value).trim(); }
  function numeric(value){ var n=Number(String(value==null?'':value).replace(/[^0-9.]/g,'')); return Number.isFinite(n)&&n>0?n:null; }

  function coarseLocation(address){
    var parts=text(address).split(/\s+/).filter(Boolean);
    return parts.slice(0,2).join(' ');
  }

  function slugify(value){
    var slug=text(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return slug||'project';
  }

  function safeImageUrl(value){
    var raw=text(value);
    if(!raw) return '';
    if(/^(?:\.\/|\/)(?!\/)/.test(raw)) return raw;
    try{var u=new URL(raw);return u.protocol==='http:'||u.protocol==='https:'?raw:'';}catch(e){return '';}
  }

  function extractProjectPublicMeta(detail){
    detail=detail||{};
    var client=detail.client||{};
    return {
      sourceProjectId:text(detail.id),
      suggestedLocation:coarseLocation(client['cl-addr']),
      areaPyeong:numeric(client['cl-area']),
      startDate:text(client['cl-start']),
      endDate:text(client['cl-end'])
    };
  }

  function buildPortfolioRecord(projectMeta,values){
    projectMeta=projectMeta||{}; values=values||{};
    var sourceProjectId=text(projectMeta.sourceProjectId);
    if(!sourceProjectId) throw new Error('프로젝트 ID가 없습니다.');
    var title=text(values.title);
    if(!title) throw new Error('공개 제목을 입력해 주세요.');
    var explicitArea=numeric(values.areaPyeong);
    return {
      source_project_id:sourceProjectId,
      slug:'project-'+slugify(values.slug||sourceProjectId),
      title:title,
      location:text(values.location)||text(projectMeta.suggestedLocation),
      area_pyeong:explicitArea||projectMeta.areaPyeong||null,
      style:text(values.style),
      summary:text(values.summary),
      cover_image_url:safeImageUrl(values.coverImageUrl),
      sort_order:Number(values.sortOrder)||0,
      is_published:values.isPublished===true
    };
  }

  return {coarseLocation:coarseLocation,slugify:slugify,extractProjectPublicMeta:extractProjectPublicMeta,buildPortfolioRecord:buildPortfolioRecord};
});
