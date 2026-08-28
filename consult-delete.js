(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.DAHAM_CONSULT_DELETE=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function canDeleteConsult(user){
    return !!(user&&user.isActive===true&&['owner','admin'].indexOf(user.role)>=0);
  }

  async function removeConsult(options){
    if(!canDeleteConsult(options.user)) throw new Error('대표 또는 관리자만 삭제할 수 있습니다.');
    if(!options.confirmDelete('정말 삭제하시겠습니까?')) return {deleted:false,cancelled:true};

    var response=await options.rpc(options.id);
    if(response&&response.error) throw new Error(response.error.message||'DB에서 삭제하지 못했습니다.');
    if(!response||!response.data||response.data.deleted!==true) throw new Error('삭제할 상담을 DB에서 찾지 못했습니다.');

    var local=options.loadLocal();
    var remaining=local.filter(function(record){return record.id!==options.id;});
    options.saveLocal(remaining);
    if(options.setTimestamp&&response.data.updated_at) options.setTimestamp(response.data.updated_at);
    return {deleted:true,id:options.id};
  }

  return {canDeleteConsult:canDeleteConsult,removeConsult:removeConsult};
});

