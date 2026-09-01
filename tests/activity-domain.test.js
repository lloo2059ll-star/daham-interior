const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../daham-activity-domain.js');

test('normalizes an activity without trusting a supplied actor id', () => {
  const event = D.normalizeActivity({
    actorId: 'forged', entityType: 'consult', entityId: 'c1', action: 'update',
    projectId: 'p1', title: '세영 청마루아파트 · 상담', summary: '시간 변경',
    changedFields: { time: { from: '14:00', to: '15:30' } }, targetUrl: 'consult.html?id=c1'
  }, { id: 'real-user', name: '홍길동' });

  assert.equal(event.actorId, 'real-user');
  assert.equal(event.actorName, '홍길동');
  assert.equal(event.action, 'update');
  assert.equal(event.targetUrl, 'consult.html?id=c1');
});

test('rejects unsupported activity actions and external target urls', () => {
  assert.throws(() => D.normalizeActivity({ entityType: 'consult', entityId: 'c1', action: 'archive', title: '상담' }, { id: 'u1' }), /action/);
  assert.throws(() => D.normalizeActivity({ entityType: 'consult', entityId: 'c1', action: 'update', title: '상담', targetUrl: 'https://evil.example' }, { id: 'u1' }), /targetUrl/);
});

test('notification copy hides phone numbers and money from lock screen text', () => {
  const copy = D.notificationCopy({
    action: 'update', title: '세영 청마루아파트 · 견적',
    summary: '010-1234-5678 고객 견적 12,500,000원 변경', actorName: '홍길동'
  });
  assert.equal(copy.title, '[수정] 세영 청마루아파트 · 견적');
  assert.doesNotMatch(copy.body, /010|12,500,000|원/);
  assert.match(copy.body, /변경자: 홍길동/);
});

test('updates in the same five minute bucket share one push dedupe key', () => {
  const event = { entityType: 'estimate', entityId: 'e1', action: 'update' };
  assert.equal(D.activityDedupeKey(event, '2026-09-02T00:01:00Z'), D.activityDedupeKey(event, '2026-09-02T00:04:59Z'));
  assert.notEqual(D.activityDedupeKey(event, '2026-09-02T00:04:59Z'), D.activityDedupeKey(event, '2026-09-02T00:05:00Z'));
});

test('one hour reminder is created for timed schedules in the 55 to 65 minute window', () => {
  const rows = D.scheduleReminderCandidates({
    now: '2026-09-02T09:00:00+09:00',
    events: [
      { id: 's1', date: '2026-09-02', time: '10:00', title: '실측', targetUrl: 'schedule.html?id=s1' },
      { id: 's2', date: '2026-09-02', time: '10:20', title: '상담' },
      { id: 's3', date: '2026-09-02', time: '10:00', title: '취소', status: 'cancelled' }
    ]
  });
  assert.deepEqual(rows.map(x => x.dedupeKey), ['schedule:s1:one-hour:2026-09-02']);
  assert.equal(rows[0].kind, 'schedule_one_hour');
});

test('all day schedules produce one 07:00 Korea reminder', () => {
  const rows = D.scheduleReminderCandidates({
    now: '2026-09-02T07:02:00+09:00',
    events: [{ id: 'all1', date: '2026-09-02', title: '목공' }]
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'all_day_morning');
  assert.equal(rows[0].dedupeKey, 'schedule:all1:all-day:2026-09-02');
});

