(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DAHAM_ACTIVE_SITES=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function status(project){
    if(project&&project.status)return project.status;
    if(project&&project.completed)return 'completed';
    if(project&&project.contracted)return 'contracted';
    return 'estimate';
  }
  function activeEstimates(projects){
    return (Array.isArray(projects)?projects:[]).filter(function(project){
      var value=status(project);
      return project&&project.id&&(value==='contracted'||value==='construction');
    });
  }
  function filterSchedules(schedules,projects){
    var ids={};activeEstimates(projects).forEach(function(project){ids[String(project.id)]=true;});
    return (Array.isArray(schedules)?schedules:[]).filter(function(site){
      var siteStatus=site&&site.info&&site.info.status;
      return site&&site.estimateId&&(ids[String(site.estimateId)]||siteStatus==='contracted'||siteStatus==='construction');
    });
  }
  return {status:status,activeEstimates:activeEstimates,filterSchedules:filterSchedules};
});
