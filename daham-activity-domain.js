(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.DAHAM_ACTIVITY_DOMAIN=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var ACTIONS=new Set(['create','update','delete','test']);
  var ACTION_LABELS={create:'등록',update:'수정',delete:'삭제',test:'테스트'};

  function clean(value){return String(value==null?'':value).trim();}

  function safeTargetUrl(value){
    var url=clean(value)||'index.html';
    if(/^[a-z][a-z0-9+.-]*:/i.test(url)||url.indexOf('//')===0) throw new Error('targetUrl must be same-origin relative');
    return url;
  }

  function normalizeActivity(input,actor){
    input=input||{};actor=actor||{};
    var action=clean(input.action),entityType=clean(input.entityType),entityId=clean(input.entityId),title=clean(input.title);
    if(!ACTIONS.has(action)) throw new Error('unsupported action');
    if(!entityType) throw new Error('entityType is required');
    if(!entityId) throw new Error('entityId is required');
    if(!title) throw new Error('title is required');
    if(!clean(actor.id)) throw new Error('actor id is required');
    return {
      actorId:clean(actor.id),actorName:clean(actor.name||actor.displayName||actor.email||'직원'),
      projectId:clean(input.projectId)||null,entityType:entityType,entityId:entityId,action:action,
      title:title,summary:clean(input.summary),changedFields:input.changedFields&&typeof input.changedFields==='object'?input.changedFields:{},
      targetUrl:safeTargetUrl(input.targetUrl)
    };
  }

  function activityDedupeKey(event,at){
    var instant=new Date(at||Date.now());
    if(Number.isNaN(instant.getTime())) throw new Error('invalid activity time');
    var bucket=Math.floor(instant.getTime()/300000);
    return ['activity',clean(event&&event.entityType),clean(event&&event.entityId),clean(event&&event.action),bucket].join(':');
  }

  function redact(value){
    return clean(value)
      .replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g,'연락처 변경')
      .replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*원?/g,'금액 변경')
      .replace(/\b\d{5,}\s*원/g,'금액 변경')
      .replace(/\s+/g,' ');
  }

  function notificationCopy(event){
    var label=ACTION_LABELS[event&&event.action]||'알림';
    var body=redact(event&&event.summary);
    var actor=clean(event&&event.actorName);
    if(actor) body+=(body?' · ':'')+'변경자: '+actor;
    return {title:'['+label+'] '+clean(event&&event.title),body:body||'다함 ERP에서 확인하세요.'};
  }

  function localDateParts(date){
    var format=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    var parts={};format.formatToParts(date).forEach(function(p){if(p.type!=='literal')parts[p.type]=p.value;});
    return {date:parts.year+'-'+parts.month+'-'+parts.day,hour:Number(parts.hour),minute:Number(parts.minute)};
  }

  function eventInstant(event){
    if(!event.time)return null;
    var time=clean(event.time).slice(0,5);
    return new Date(clean(event.date)+'T'+time+':00+09:00');
  }

  function scheduleReminderCandidates(input){
    input=input||{};
    var now=new Date(input.now||Date.now());
    if(Number.isNaN(now.getTime())) throw new Error('invalid reminder time');
    var korea=localDateParts(now),rows=[];
    (Array.isArray(input.events)?input.events:[]).forEach(function(event){
      if(!event||!clean(event.id)||event.status==='cancelled'||event.cancelled===true)return;
      var date=clean(event.date||event.start),title=clean(event.title||event.name||'일정');
      if(!date)return;
      var timed=eventInstant({date:date,time:event.time||event.startTime});
      if(timed){
        var minutes=(timed.getTime()-now.getTime())/60000;
        if(minutes>=55&&minutes<=65){
          rows.push({kind:'schedule_one_hour',scheduleId:clean(event.id),title:title,date:date,time:clean(event.time||event.startTime).slice(0,5),targetUrl:safeTargetUrl(event.targetUrl||('schedule.html?id='+encodeURIComponent(event.id))),dedupeKey:'schedule:'+clean(event.id)+':one-hour:'+date});
        }
      }else if(date===korea.date&&korea.hour===7&&korea.minute<=5){
        rows.push({kind:'all_day_morning',scheduleId:clean(event.id),title:title,date:date,time:'',targetUrl:safeTargetUrl(event.targetUrl||('schedule.html?id='+encodeURIComponent(event.id))),dedupeKey:'schedule:'+clean(event.id)+':all-day:'+date});
      }
    });
    return rows;
  }

  return {normalizeActivity:normalizeActivity,activityDedupeKey:activityDedupeKey,notificationCopy:notificationCopy,scheduleReminderCandidates:scheduleReminderCandidates};
});
