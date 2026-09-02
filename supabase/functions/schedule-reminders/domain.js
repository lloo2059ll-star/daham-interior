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
        targetUrl: 'schedule.html?id=' + encodeURIComponent(item.id)
      });
    });
    return events.map(function (event) {
      if (!event.time) delete event.time;
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

  return { extractScheduleEvents: extractScheduleEvents, buildReminderRows: buildReminderRows };
});
