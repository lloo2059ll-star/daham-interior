(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.DAHAM_SCHEDULE_DOMAIN=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var ELECTRIC_SECTION='전기/조명';
  var AC_SECTION='시스템에어컨';
  var BATH_SECTIONS=new Set(['거실욕실','안방욕실']);
  var TILE_SECTION='타일류';
  var TILE_SUBS=new Set(['벽타일 300-600','바닥타일 300-300','벽타일 600-600','바닥타일 600-600']);
  var EXTRA_TILE_SUBS=new Set(['주방 벽타일 300-600','주방 벽타일 600-600','현관 바닥타일 600-600','발코니 바닥타일 300-300']);
  var SANITARY_SUBS=new Set(['양변기','세면대','세면대 수전','샤워기 수전','해바라기','슬라이드바','휴지걸이','수건걸이','코너선반','욕실장','거울','파티션','샤워부스(폴1500 H2000)','욕조','젠다이','젠다이돌','유가/트렌치']);
  var NEW_MARU_SUBS=new Set([
    '강마루 구정(94-800 7.5T)','강마루 구정마블러스(597-597 8.7T)',
    '강마루 구정텍스쳐165(165-1200 7.5T)','강마루 동화나투스진그란데(325-805 7T)',
    '강마루 동화진오리진(98-805 7T)','강마루 동화진그란데스퀘어(650-650 7.5T)',
    '강마루 노바블랙라벨(165-1200 7.5T)'
  ]);
  var REMOVE_MARU_DETAILS=new Set(['강화마루 철거','강마루 철거']);
  var LEGACY_SECTIONS=['도배','바닥','전기/조명','싱크대','가구','거실욕실','안방욕실','타일류','목작업','문/문틀','인테리어철물','중문','설비','필름','탄성코트','시스템에어컨','샷시','철거','기타 및 요청사항','디자인 및 지역할증','추가사항'];

  var GENERIC_SECTION_RULES=[
    ['철거','철거',10],['샷시','창호',30],['설비','설비',40],['목작업','목공',50],
    ['문/문틀','문/문틀',55],['인테리어철물','인테리어철물',56],['필름','필름',60],
    ['탄성코트','탄성코트',100],['도배','도배',110],['싱크대','싱크대',130],
    ['가구','가구',140],['중문','중문',150],['기타 및 요청사항','기타 및 요청사항',160]
  ];

  function parseKey(key){
    var p=String(key||'').split('|');
    return p.length===3?{section:p[0],sub:p[1],detail:p[2],key:key}:null;
  }
  function parseLegacyKey(key){
    var m=String(key||'').match(/^(\d+)_(\d+)$/);if(!m)return null;
    var si=Number(m[1]),ii=Number(m[2]),section=LEGACY_SECTIONS[si];if(!section)return null;
    var sub='__legacy_'+ii,detail='';
    if(si===1&&ii>=3&&ii<=9) sub=Array.from(NEW_MARU_SUBS)[ii-3];
    if(si===17&&ii===0){sub='바닥철거';detail='강화마루 철거';}
    if(si===17&&ii===1){sub='바닥철거';detail='강마루 철거';}
    if((si===5||si===6)&&ii>=13&&ii<=16) sub=['벽타일 300-600','바닥타일 300-300','벽타일 600-600','바닥타일 600-600'][ii-13];
    if((si===5||si===6)&&ii===9){sub='욕실천장';detail='욕실천장';}
    if((si===5||si===6)&&ii>=17&&ii<=77) sub='양변기';
    if(si===7&&ii>=0&&ii<=3) sub=Array.from(EXTRA_TILE_SUBS)[ii];
    return {section:section,sub:sub,detail:detail,key:key};
  }
  function selectedItems(qtys){
    return Object.keys(qtys||{}).filter(function(k){return Number(qtys[k])>0;})
      .map(function(k){return parseKey(k)||parseLegacyKey(k);}).filter(Boolean);
  }
  function has(items,predicate){return items.some(predicate);}
  function candidate(ruleId,name,order,dur){
    return {ruleId:ruleId,name:name,order:order,duration:dur||1,selected:true,worker:'',memo:''};
  }
  function sectionDuration(section,area){
    if(section==='목작업') return 4;
    if(section==='필름') return 3;
    if(section==='도배') return (parseFloat(String(area||'').replace(/,/g,''))||0)>=40?5:3;
    return 1;
  }
  function buildPhaseCandidates(qtys,area){
    var items=selectedItems(qtys), out=[];
    GENERIC_SECTION_RULES.forEach(function(r){
      if(has(items,function(x){return x.section===r[0];})) out.push(candidate('section:'+r[0],r[1],r[2],sectionDuration(r[0],area)));
    });
    if(has(items,function(x){return x.section===ELECTRIC_SECTION;})){
      out.push(candidate('electric:first','전기/조명 1차',45,1),candidate('electric:second','전기/조명 2차',120,1));
    }
    if(has(items,function(x){return x.section===AC_SECTION;})){
      out.push(candidate('aircon:first','에어컨 1차',46,1),candidate('aircon:second','에어컨 2차',125,1));
    }
    var hasNewMaru=has(items,function(x){return x.section==='바닥'&&NEW_MARU_SUBS.has(x.sub);});
    var hasRemoveMaru=has(items,function(x){return x.section==='철거'&&x.sub==='바닥철거'&&REMOVE_MARU_DETAILS.has(x.detail);});
    if(hasNewMaru&&hasRemoveMaru) out.push(candidate('floor:remove','마루 철거',20,1));
    if(hasNewMaru) out.push(candidate('floor:install','마루 시공',129,1));
    var hasTile=has(items,function(x){
      return (BATH_SECTIONS.has(x.section)&&TILE_SUBS.has(x.sub))||(x.section===TILE_SECTION&&EXTRA_TILE_SUBS.has(x.sub));
    });
    var hasCeiling=has(items,function(x){return BATH_SECTIONS.has(x.section)&&x.sub==='욕실천장'&&x.detail==='욕실천장';});
    var hasSanitary=has(items,function(x){return BATH_SECTIONS.has(x.section)&&SANITARY_SUBS.has(x.sub);});
    if(hasTile) out.push(candidate('bath:tile','타일작업',90,5));
    if(hasCeiling) out.push(candidate('bath:ceiling','욕실 천장작업',91,1));
    if(hasSanitary) out.push(candidate('bath:sanitary','도기세팅',92,1));
    return out.sort(function(a,b){return a.order-b.order;});
  }
  function buildSectionTotalCandidates(sectionTotals,area,floorType){
    var active=new Set((sectionTotals||[]).filter(function(x){return Number(x&&x.sub)>0;}).map(function(x){return x.name;})),out=[];
    GENERIC_SECTION_RULES.forEach(function(r){
      if(active.has(r[0])) out.push(candidate('section:'+r[0],r[1],r[2],sectionDuration(r[0],area)));
    });
    if(active.has(ELECTRIC_SECTION)) out.push(candidate('electric:first','전기/조명 1차',45,1),candidate('electric:second','전기/조명 2차',120,1));
    if(active.has(AC_SECTION)) out.push(candidate('aircon:first','에어컨 1차',46,1),candidate('aircon:second','에어컨 2차',125,1));
    if(active.has('바닥')) out.push(candidate('floor:install',floorType==='장판'?'장판 시공':'마루 시공',129,1));
    if(active.has('거실욕실')||active.has('안방욕실')){
      out.push(candidate('bath:tile','타일작업',90,5),candidate('bath:ceiling','욕실 천장작업',91,1),candidate('bath:sanitary','도기세팅',92,1));
    }
    return out.sort(function(a,b){return a.order-b.order;});
  }
  function materializeCandidates(rows){
    return (rows||[]).filter(function(x){return x.selected!==false&&String(x.name||'').trim();})
      .map(function(x){return Object.assign({},x,{name:String(x.name).trim()});});
  }
  function dateString(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
  function isNonWorkDay(date,holidays){return date.getDay()===0||date.getDay()===6||!!(holidays&&holidays[dateString(date)]);}
  function toWorkDay(value,holidays){
    var date=new Date(value+'T00:00:00');
    while(isNonWorkDay(date,holidays)) date.setDate(date.getDate()+1);
    return dateString(date);
  }
  function workDayEnd(value,duration,holidays){
    var date=new Date(value+'T00:00:00'), worked=1;
    while(worked<(duration||1)){date.setDate(date.getDate()+1);if(!isNonWorkDay(date,holidays))worked++;}
    return dateString(date);
  }
  function nextWorkDay(value,holidays){
    var date=new Date(value+'T00:00:00');date.setDate(date.getDate()+1);
    while(isNonWorkDay(date,holidays))date.setDate(date.getDate()+1);
    return dateString(date);
  }
  function buildAutomaticContractTasks(qtys,startDate,area,holidays,uid,sectionTotals,floorType){
    if(!startDate)return [];
    var cursor=toWorkDay(startDate,holidays);
    var candidates=buildPhaseCandidates(qtys,area);
    var known=new Set(candidates.map(function(row){return row.ruleId;}));
    buildSectionTotalCandidates(sectionTotals,area,floorType).forEach(function(row){if(!known.has(row.ruleId))candidates.push(row);});
    candidates.sort(function(a,b){return a.order-b.order;});
    return candidates.map(function(row){
      var start=cursor,end=workDayEnd(start,row.duration||1,holidays);
      cursor=nextWorkDay(end,holidays);
      return {id:uid(),name:row.name,start:start,end:end,worker:'',memo:'',status:'planned',kind:'construction',source:'estimate',sourceRuleId:row.ruleId};
    });
  }
  function normalizeSites(sites,colors){
    return (Array.isArray(sites)?sites:[]).map(function(site,index){
      var out=Object.assign({},site);
      out.info=Object.assign({},out.info||{});
      out.tasks=(Array.isArray(out.tasks)?out.tasks:[]).map(function(task){
        return Object.assign({},task);
      });
      return out;
    });
  }
  function projectStatus(p){
    if(p&&p.status) return p.status;
    if(p&&p.completed) return 'completed';
    if(p&&p.contracted) return 'contracted';
    return 'estimate';
  }
  function reconcileContractSites(sites,projects,uid,colors,holidays){
    var activeIds={};
    (projects||[]).forEach(function(p){var value=projectStatus(p);if(p&&p.id&&(value==='contracted'||value==='construction'))activeIds[String(p.id)]=true;});
    var normalized=normalizeSites(sites,colors);
    var out=normalized.filter(function(site){return site&&site.estimateId&&activeIds[String(site.estimateId)];}), removed=normalized.length-out.length, byId={};
    out.forEach(function(s){if(s.estimateId&&!byId[s.estimateId]) byId[s.estimateId]=s;});
    var added=0,updated=0;
    (projects||[]).forEach(function(p,index){
      var status=projectStatus(p);
      if(status!=='contracted'&&status!=='construction') return;
      var client=p.client||{}, site=byId[p.id], wasNew=!site;
      var info={name:client['cl-addr']||'',customerName:client['cl-name']||'',tel:client['cl-tel']||'',addr:client['cl-addr']||'',area:client['cl-area']||'',start:client['cl-start']||'',end:client['cl-end']||''};
      if(site){
        var changed=false,nextInfo=Object.assign({},site.info||{});
        Object.keys(info).forEach(function(k){
          var shouldSync=k==='name'||k==='customerName'||!!info[k];
          if(shouldSync&&nextInfo[k]!==info[k]){nextInfo[k]=info[k];changed=true;}
        });
        if(nextInfo.status!==status){nextInfo.status=status;changed=true;}
        if(changed){site.info=nextInfo;updated++;}
      }else{
        site={id:uid(),estimateId:p.id,sourceType:'contract',color:(colors&&colors[index%colors.length])||'#E65100',info:Object.assign({manager:'',memo:''},info,{status:status}),tasks:[]};
        out.push(site); byId[p.id]=site; added++;
      }
      if((site.tasks||[]).length&&!site.autoScheduleInitialized){site.autoScheduleInitialized=true;if(!wasNew)updated++;}
      if(info.start&&!(site.tasks||[]).length&&!site.autoScheduleInitialized){
        site.tasks=buildAutomaticContractTasks(p.qtys||{},info.start,info.area,holidays,uid,p.sectionTotals,p.floorType);
        if(site.tasks.length){site.autoScheduleInitialized=true;if(!wasNew)updated++;}
      }
    });
    return {sites:out,added:added,updated:updated,removed:removed};
  }
  function normWorker(v){return String(v||'').trim().replace(/\s+/g,' ');}
  function findWorkerConflicts(next,sites){
    var worker=normWorker(next&&next.worker); if(!worker||!next.start) return [];
    var end=next.end||next.start, hits=[];
    (sites||[]).forEach(function(site){(site.tasks||[]).forEach(function(t){
      if(t.id===next.id||normWorker(t.worker)!==worker||!t.start) return;
      var te=t.end||t.start;
      if(next.start<=te&&end>=t.start){
        hits.push({worker:worker,siteName:(site.info&&site.info.name)||'현장명 미입력',phase:t.name||'',scheduleId:t.id,overlapStart:next.start>t.start?next.start:t.start,overlapEnd:end<te?end:te});
      }
    });});
    return hits;
  }
  function canForceConflict(user){return !!(user&&user.role==='owner'&&user.isActive===true);}
  function findBatchWorkerConflicts(rows,sites){
    var temp=(sites||[]).map(function(s){return {id:s.id,info:s.info,tasks:(s.tasks||[]).slice()};}), batch={id:'__batch',info:{name:'새 공정 후보'},tasks:[]};temp.push(batch);
    var hits=[];(rows||[]).forEach(function(row,index){
      var draft={id:'__candidate_'+index,name:row.name,worker:row.worker,start:row.start,end:row.end||row.start};
      hits=hits.concat(findWorkerConflicts(draft,temp));batch.tasks.push(draft);
    });return hits;
  }
  function replaceEstimateTasks(tasks,imported){
    return (tasks||[]).filter(function(task){return task.source!=='estimate';}).concat(imported||[]);
  }
  function projectTasks(sites,projectId){
    var out=[];
    (sites||[]).forEach(function(site){
      (Array.isArray(site.tasks)?site.tasks:[]).forEach(function(task){
        out.push(Object.assign({},task,{projectId:site.id,projectColor:site.color,projectName:(site.info&&site.info.name)||'현장명 미입력',isSelectedProject:site.id===projectId}));
      });
    });
    return out;
  }
  function agendaOccurrences(events,year,month){
    var first=year+'-'+String(month+1).padStart(2,'0')+'-01', lastDate=new Date(year,month+1,0).getDate(),last=year+'-'+String(month+1).padStart(2,'0')+'-'+String(lastDate).padStart(2,'0'),out=[];
    (events||[]).forEach(function(e){var start=e.start||e.date,end=e.end||start;if(!start||start>last||end<first)return;var cur=start<first?first:start,stop=end>last?last:end;
      while(cur<=stop){out.push(Object.assign({},e,{date:cur}));var d=new Date(cur+'T00:00:00');d.setDate(d.getDate()+1);cur=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
    });return out;
  }
  function buildProjectPrintPlan(site){
    var tasks=(site&&Array.isArray(site.tasks)?site.tasks:[]).filter(function(task){return task&&task.start;}).map(function(task){return Object.assign({},task);});
    var starts=tasks.map(function(task){return task.start;}).sort();
    var ends=tasks.map(function(task){return task.end||task.start;}).sort();
    var first=starts[0]||'',last=ends[ends.length-1]||first,months=[];
    if(first&&last){
      var cursor=new Date(first.slice(0,7)+'-01T00:00:00');
      var stop=new Date(last.slice(0,7)+'-01T00:00:00');
      while(cursor<=stop){months.push({year:cursor.getFullYear(),month:cursor.getMonth()});cursor.setMonth(cursor.getMonth()+1);}
    }
    var sections=months.map(function(month){
      var key=month.year+'-'+String(month.month+1).padStart(2,'0');
      var monthStart=key+'-01',monthEnd=key+'-'+String(new Date(month.year,month.month+1,0).getDate()).padStart(2,'0');
      var monthTasks=tasks.filter(function(task){return task.start<=monthEnd&&(task.end||task.start)>=monthStart;});
      return {key:key,year:month.year,month:month.month,layout:monthTasks.length<=2?'compact':'calendar',tasks:monthTasks};
    }).filter(function(section){return section.tasks.length;});
    return {title:String(site&&site.info&&site.info.name||'현장명 미입력'),period:first&&last?first+' ~ '+last:'일정 없음',months:months,tasks:tasks,sections:sections};
  }
  function compactPrintMonthTimeline(section){
    section=section||{};
    var key=section.year+'-'+String(Number(section.month)+1).padStart(2,'0');
    var monthStart=key+'-01',monthEnd=key+'-'+String(new Date(section.year,Number(section.month)+1,0).getDate()).padStart(2,'0');
    var clipped=(section.tasks||[]).map(function(task){return {task:task,start:task.start<monthStart?monthStart:task.start,end:(task.end||task.start)>monthEnd?monthEnd:(task.end||task.start)};});
    var first=clipped.map(function(item){return item.start;}).sort()[0],last=clipped.map(function(item){return item.end;}).sort().pop(),days=[];
    var firstDate=first?new Date(first+'T12:00:00'):null,lastDate=last?new Date(last+'T12:00:00'):null;
    if(firstDate){firstDate.setDate(firstDate.getDate()-firstDate.getDay());first=firstDate.getFullYear()+'-'+String(firstDate.getMonth()+1).padStart(2,'0')+'-'+String(firstDate.getDate()).padStart(2,'0');}
    if(lastDate){lastDate.setDate(lastDate.getDate()+(6-lastDate.getDay()));last=lastDate.getFullYear()+'-'+String(lastDate.getMonth()+1).padStart(2,'0')+'-'+String(lastDate.getDate()).padStart(2,'0');}
    var cursor=first;
    var weekday=['일','월','화','수','목','금','토'];
    while(cursor&&cursor<=last){var d=new Date(cursor+'T12:00:00');days.push({date:cursor,label:(d.getMonth()+1)+'월 '+d.getDate()+'일 '+weekday[d.getDay()]+'요일'});d.setDate(d.getDate()+1);cursor=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
    var bars=clipped.map(function(item){return Object.assign({},item.task,{start:days.findIndex(function(day){return day.date===item.start;})+1,end:days.findIndex(function(day){return day.date===item.end;})+2});});
    return {days:days,bars:bars};
  }
  function constructionDisplayName(bar){
    bar=bar||{};
    return String(bar.name||'')+(bar.worker?' · '+bar.worker:'');
  }
  function scheduleProgress(tasks,today){
    tasks=Array.isArray(tasks)?tasks:[];
    if(!tasks.length||!today) return 0;
    var completed=tasks.filter(function(task){
      var end=task.end||task.start||'';
      return !!end&&end<=today;
    }).length;
    return Math.round(completed/tasks.length*100);
  }
  function generalTypeMeta(type){
    return {
      contract:{label:'계약',color:'#f08a24'},
      consult:{label:'상담',color:'#a98057'},survey:{label:'실측',color:'#a98057'},
      as:{label:'AS',color:'#61ad78'},personal:{label:'개인',color:'#3e78d6'},other:{label:'기타',color:'#687182'}
    }[type]||{label:'기타',color:'#687182'};
  }
  function moveSiteTaskToGeneral(sites,generalEvents,siteId,taskId,generalType){
    var nextSites=normalizeSites(sites), nextGeneral=(Array.isArray(generalEvents)?generalEvents:[]).map(function(event){return Object.assign({},event);});
    var site=nextSites.find(function(item){return item.id===siteId;}), task;
    if(!site) return {sites:nextSites,generalEvents:nextGeneral,moved:false};
    if(nextGeneral.some(function(event){return event.id===taskId;})) return {sites:nextSites,generalEvents:nextGeneral,moved:false};
    site.tasks=site.tasks.filter(function(item){if(item.id===taskId){task=item;return false;}return true;});
    if(!task) return {sites:nextSites,generalEvents:nextGeneral,moved:false};
    var event={id:task.id,kind:'general',generalType:generalType||'other',name:task.name||'',start:task.start,end:task.end||task.start,status:task.status||'planned'};
    if(task.memo) event.memo=task.memo;
    nextGeneral.push(event);
    return {sites:nextSites,generalEvents:nextGeneral,moved:true};
  }

  return {parseKey:parseKey,selectedItems:selectedItems,buildPhaseCandidates:buildPhaseCandidates,buildAutomaticContractTasks:buildAutomaticContractTasks,replaceEstimateTasks:replaceEstimateTasks,projectTasks:projectTasks,
    materializeCandidates:materializeCandidates,normalizeSites:normalizeSites,reconcileContractSites:reconcileContractSites,
    projectStatus:projectStatus,findWorkerConflicts:findWorkerConflicts,findBatchWorkerConflicts:findBatchWorkerConflicts,canForceConflict:canForceConflict,agendaOccurrences:agendaOccurrences,
    constructionDisplayName:constructionDisplayName,scheduleProgress:scheduleProgress,buildProjectPrintPlan:buildProjectPrintPlan,
    generalTypeMeta:generalTypeMeta,moveSiteTaskToGeneral:moveSiteTaskToGeneral,compactPrintMonthTimeline:compactPrintMonthTimeline};
});





