(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DAHAM_COMPLETION_TRANSITION=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function clean(value){return String(value||'').trim().replace(/\s+/g,' ');}
  function resolveSchedule(project,schedules){
    var exact=(schedules||[]).filter(function(site){return site&&String(site.estimateId||'')===String(project.id);});
    if(exact.length>1)throw new Error('일정 연결이 중복되었습니다. 일정 관리에서 현장 연결을 정리해 주세요.');
    if(exact.length===1)return exact[0];
    var client=project.client||{},address=clean(client['cl-addr']||client.address),name=clean(client['cl-name']||client.name);
    if(!address)return null;
    var legacy=(schedules||[]).filter(function(site){
      if(!site||site.estimateId)return false;
      var info=site.info||{},siteAddress=clean(info.addr||info.name),siteName=clean(info.customerName||info.clientName);
      return siteAddress===address&&(!name||siteName===name);
    });
    if(legacy.length>1)throw new Error('일정 연결이 중복되었습니다. 일정 관리에서 현장 연결을 정리해 주세요.');
    return legacy[0]||null;
  }
  function buildCompletionTransition(project,datasets,completedAt){
    if(!project||!project.id)throw new Error('완료할 프로젝트를 찾을 수 없습니다.');
    var nextProject=clone(project),next=clone(datasets||{});
    next.schedules=Array.isArray(next.schedules)?next.schedules:[];
    next.specs=Array.isArray(next.specs)?next.specs:[];
    next.payments=next.payments&&typeof next.payments==='object'?next.payments:{};
    next.photos=Array.isArray(next.photos)?next.photos:[];
    next.completedPhotos=next.completedPhotos&&typeof next.completedPhotos==='object'?next.completedPhotos:{};
    var schedule=resolveSchedule(project,next.schedules),scheduleId=schedule&&schedule.id;
    var archivedPhotos=next.photos.filter(function(photo){return photo.projId===project.id||(scheduleId&&photo.projId===scheduleId);});
    var snapshot={completedAt:completedAt,tasks:schedule?clone(schedule.tasks||[]):[],color:schedule&&schedule.color||'#E65100'};
    if(scheduleId)snapshot.schedId=scheduleId;
    snapshot.specs=scheduleId?next.specs.filter(function(spec){return spec.schedId===scheduleId;}):[];
    if(next.payments[project.id])snapshot.payData=clone(next.payments[project.id]);
    snapshot.photoCount=archivedPhotos.length;
    next.completedPhotos[project.id]=archivedPhotos;
    next.schedules=next.schedules.filter(function(site){return site.id!==scheduleId&&String(site.estimateId||'')!==String(project.id);});
    if(scheduleId)next.specs=next.specs.filter(function(spec){return spec.schedId!==scheduleId;});
    delete next.payments[project.id];
    next.photos=next.photos.filter(function(photo){return photo.projId!==project.id&&(!scheduleId||photo.projId!==scheduleId);});
    nextProject.completionData=snapshot;
    nextProject.status='completed';
    nextProject.contracted=true;
    nextProject.completed=true;
    nextProject.updatedAt=completedAt;
    return {project:nextProject,datasets:next};
  }
  async function commitCompletionTransition(project,datasets,completedAt,adapter){
    if(!adapter||typeof adapter.writeLocal!=='function'||typeof adapter.syncRemote!=='function'||typeof adapter.rollback!=='function')throw new Error('완료 저장 어댑터가 올바르지 않습니다.');
    var result=buildCompletionTransition(project,datasets,completedAt);
    try{
      await adapter.writeLocal(result);
      await adapter.syncRemote(result);
      return result;
    }catch(error){
      await adapter.rollback();
      throw error;
    }
  }
  return {resolveSchedule:resolveSchedule,buildCompletionTransition:buildCompletionTransition,commitCompletionTransition:commitCompletionTransition};
});
