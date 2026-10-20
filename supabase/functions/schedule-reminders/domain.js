(function (root, factory) {
  var api = factory();
  root.DAHAM_SCHEDULE_REMINDERS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try { var parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  }

  function cleanTime(value) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return String(Number(match[1])).padStart(2, '0') + ':' + match[2];
  }

  function isCancelled(item) {
    var status = String((item && item.status) || '').toLowerCase();
    return !!(item && item.cancelled) || status === 'cancelled' || status === 'canceled' || status === '취소';
  }

  function extractScheduleEvents(input) {
    var events = [];
    asArray(input && input.construction).forEach(function (site) {
      var siteName = String((site.info && (site.info.addr || site.info.name)) || site.name || '공사 일정');
      asArray(site.tasks).forEach(function (task) {
        if (!task || !task.id || !task.start || isCancelled(task)) return;
        events.push({
          id: String(task.id), date: String(task.start).slice(0, 10),
          time: cleanTime(task.startTime || task.time) || undefined,
          title: siteName + ' · ' + String(task.name || '공사 일정'),
          targetUrl: 'schedule.html?id=' + encodeURIComponent(task.id)
        });
      });
    });
    asArray(input && input.general).forEach(function (item) {
      if (!item || !item.id || !item.start || isCancelled(item)) return;
      events.push({
        id: String(item.id), date: String(item.start).slice(0, 10),
        time: cleanTime(item.startTime || item.time) || undefined,
        title: String(item.name || item.title || '일반 일정'),
        targetUrl: 'schedule.html?id=' + encodeURIComponent(item.id),
        source: item.source === 'consultation' ? 'consultation' : undefined
      });
    });
    return events.map(function (event) {
      if (!event.time) delete event.time;
      if (!event.source) delete event.source;
      return event;
    });
  }

  function kstParts(now) {
    var date = new Date(now);
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).reduce(function (out, part) { out[part.type] = part.value; return out; }, {});
    return { date: parts.year + '-' + parts.month + '-' + parts.day, hour: Number(parts.hour), minute: Number(parts.minute) };
  }

  function buildReminderRows(input) {
    var now = new Date(input.now || Date.now());
    var local = kstParts(now);
    return asArray(input.events).filter(function (event) { return event && !isCancelled(event); }).flatMap(function (event) {
      var base = {
        companyId: input.companyId, title: '[일정 알림] ' + event.title,
        targetUrl: event.targetUrl || 'schedule.html', sendAfter: now.toISOString(), status: 'pending'
      };
      if (event.source === 'consultation' && event.time && event.date === local.date && local.hour === 7 && local.minute <= 5) {
        return [Object.assign(base, {
          kind: 'all_day_morning', body: '오늘 ' + event.time + ' ' + event.title + ' 일정이 있습니다.',
          dedupeKey: 'schedule:' + event.id + ':consult-morning:' + event.date
        })];
      }
      if (event.time) {
        var startsAt = new Date(event.date + 'T' + cleanTime(event.time) + ':00+09:00');
        var minutes = (startsAt.getTime() - now.getTime()) / 60000;
        if (minutes < 55 || minutes > 65) return [];
        return [Object.assign(base, {
          kind: 'schedule_one_hour', body: event.time + ' ' + event.title + ' 일정이 1시간 후 시작합니다.',
          dedupeKey: 'schedule:' + event.id + ':one-hour:' + event.date + ':' + cleanTime(event.time)
        })];
      }
      if (event.date !== local.date || local.hour !== 7 || local.minute > 5) return [];
      return [Object.assign(base, {
        kind: 'all_day_morning', body: '오늘 ' + event.title + ' 일정이 있습니다.',
        dedupeKey: 'schedule:' + event.id + ':all-day:' + event.date
      })];
    });
  }

  function validDate(value) {
    var text=String(value||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return '';
    var date=new Date(text+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===text?text:'';
  }

  function materialLabel(name) {
    var label=String(name||'').replace(/\([^)]*\)/g,'').replace(/（[^）]*）/g,'');
    // Remove service-only work before recognizing mixed legacy phase names.
    label=label.replace(/(?:마루|타일|욕실|가스)?\s*철거|(?:에어컨|전기)\s*타공|엘리베이터\s*보양|보양|입주청소|청소|준공촬영|실측|상담/g,'').replace(/^[\s,./·]+|[\s,./·]+$/g,'').trim();
    return /타일|도배|목공|목작업|필름|마루|장판|바닥|도기|욕실|바스|창호|샷시|샤시|중문|도어|방문|문틀|전기|조명|스위치|콘센트|에어컨|싱크|주방|가구|대리석|세라믹|탄성|도장|설비|수전|도어락|인터폰|붙박이|커튼|커텐|블라인드/.test(label)?label:'';
  }

  function inactive(item) {
    return !item||item.deleted===true||isCancelled(item)||/^(done|completed|complete|archived|progress|완료|시공완료|준공|진행중)$/i.test(String(item.status||''));
  }

  function extractMaterialEvents(input) {
    var events=[];
    asArray(input&&input.construction).forEach(function(site){
      if(inactive(site)||inactive(site.info||{}))return;
      asArray(site.tasks).forEach(function(task){
        if(inactive(task)||!task.id)return;
        var date=validDate(task.start),material=materialLabel(task.name);
        if(!date||!material)return;
        var due=new Date(date+'T00:00:00Z');due.setUTCDate(due.getUTCDate()-7);
        var siteId=String(site.id||site.estimateId||'site');
        events.push({siteId:siteId,taskId:String(task.id),date:date,reminderDate:due.toISOString().slice(0,10),
          siteName:String((site.info&&(site.info.addr||site.info.name))||site.name||'현장'),material:material,
          targetUrl:'schedule.html?id='+encodeURIComponent(task.id),
          dedupeKey:'material-order:'+siteId+':'+String(task.id)+':'+date});
      });
    });
    return events;
  }

  function buildMaterialReminderRows(input) {
    var now=new Date(input.now||Date.now()),local=kstParts(now);
    // Catch up missed/legacy D-7 reminders during business hours, but never after work starts.
    if(local.hour<9||local.hour>=18)return [];
    return asArray(input.events).filter(function(e){return validDate(e.date)&&e.reminderDate<=local.date&&e.date>local.date;}).map(function(e){
      var days=Math.round((Date.parse(e.date+'T00:00:00Z')-Date.parse(local.date+'T00:00:00Z'))/86400000);
      var dateText=Number(e.date.slice(5,7))+'월 '+Number(e.date.slice(8,10))+'일';
      return {companyId:input.companyId,kind:'material_order_week',title:'['+e.siteName+'] '+e.material+' 시공 D-'+days+' · 자재 발주 확인',
        body:dateText+' 시공 예정입니다. '+e.material+' 품목·수량과 납기 일정을 확인해 주세요.',
        targetUrl:e.targetUrl,dedupeKey:e.dedupeKey,sendAfter:now.toISOString(),status:'pending'};
    });
  }

  function obsoleteMaterialReminderIds(jobs,events,now) {
    var today=kstParts(now||Date.now()).date;
    var valid=new Set(asArray(events).filter(function(e){return e.date>today;}).map(function(e){return e.dedupeKey;}));
    return asArray(jobs).filter(function(job){return job.status==='pending'&&String(job.dedupe_key||'').indexOf('material-order:')===0&&!valid.has(job.dedupe_key);}).map(function(job){return job.id;});
  }

  return { extractScheduleEvents: extractScheduleEvents, buildReminderRows: buildReminderRows,
    extractMaterialEvents:extractMaterialEvents,buildMaterialReminderRows:buildMaterialReminderRows,obsoleteMaterialReminderIds:obsoleteMaterialReminderIds };
});
