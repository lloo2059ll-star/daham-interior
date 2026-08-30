const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let Link = {};
try { Link = require('../consult-schedule-link.js'); } catch (_) {}

test('saving a dated site measurement creates one linked general event', () => {
  assert.equal(typeof Link.updateReservations, 'function');
  assert.equal(typeof Link.reconcile, 'function');

  const consultation = {
    id: 'consult-1',
    status: 'site_check',
    name: '홍길동',
    siteName: '다함아파트 101동',
    manager: '최일성',
    schedDate: '2026-09-10',
    schedTime: '14:30'
  };
  consultation.scheduleReservations = Link.updateReservations(null, consultation, '2026-09-01T00:00:00+09:00');

  const events = Link.reconcile([], consultation, 'save', '2026-09-01T00:00:00+09:00');

  assert.deepEqual(events, [{
    id: 'consult-consult-1-site_measurement',
    kind: 'general',
    generalType: 'survey',
    name: '다함아파트 101동 · 현장실측',
    start: '2026-09-10',
    end: '2026-09-10',
    startTime: '14:30',
    status: 'planned',
    memo: '',
    consultationId: 'consult-1',
    eventType: 'site_measurement',
    manager: '최일성',
    source: 'consultation'
  }]);
});

test('changing and re-saving a reservation updates the same event without duplicates', () => {
  const previous = {
    id: 'consult-1', status: 'site_check', name: '홍길동',
    schedDate: '2026-09-10', schedTime: '14:30',
    scheduleReservations: { siteMeasurement: { date: '2026-09-10', time: '14:30' } }
  };
  const first = Link.reconcile([], previous, 'save', '2026-09-01T00:00:00+09:00');
  const changed = Object.assign({}, previous, { schedDate: '2026-09-12', schedTime: '10:00' });
  changed.scheduleReservations = Link.updateReservations(previous, changed, '2026-09-01T00:00:00+09:00');

  const moved = Link.reconcile(first, changed, 'save', '2026-09-01T00:00:00+09:00');
  const savedAgain = Link.reconcile(moved, changed, 'save', '2026-09-01T00:00:00+09:00');

  assert.equal(moved.length, 1);
  assert.equal(savedAgain.length, 1);
  assert.equal(savedAgain[0].id, 'consult-consult-1-site_measurement');
  assert.equal(savedAgain[0].start, '2026-09-12');
  assert.equal(savedAgain[0].startTime, '10:00');
});

test('estimate meeting creates a separate linked general event', () => {
  const previous = {
    id: 'consult-1', status: 'site_check', name: '홍길동',
    scheduleReservations: { siteMeasurement: { date: '2026-08-20', time: '14:30' } }
  };
  const meeting = Object.assign({}, previous, {
    status: 'est_meeting', schedDate: '2026-09-15', schedTime: '11:00'
  });
  meeting.scheduleReservations = Link.updateReservations(previous, meeting, '2026-09-01T00:00:00+09:00');

  const events = Link.reconcile([], meeting, 'save', '2026-09-01T00:00:00+09:00');

  assert.deepEqual(events.map(event => [event.eventType, event.generalType, event.start]), [
    ['site_measurement', 'survey', '2026-08-20'],
    ['estimate_meeting', 'consult', '2026-09-15']
  ]);
});

test('renaming a consultation updates linked titles and manager', () => {
  const consultation = {
    id: 'consult-1', status: 'est_done', name: '홍길동', siteName: '새 현장명', manager: '새 담당자',
    scheduleReservations: { siteMeasurement: { date: '2026-08-20', time: '14:30' } }
  };
  const existing = [{
    id: 'legacy-linked', kind: 'general', generalType: 'survey', name: '옛 현장 · 현장실측',
    start: '2026-08-20', end: '2026-08-20', startTime: '14:30', status: 'done', memo: '유지',
    consultationId: 'consult-1', eventType: 'site_measurement', manager: '옛 담당자', source: 'consultation'
  }];

  const events = Link.reconcile(existing, consultation, 'save', '2026-09-01T00:00:00+09:00');

  assert.equal(events[0].name, '새 현장명 · 현장실측');
  assert.equal(events[0].manager, '새 담당자');
  assert.equal(events[0].memo, '유지');
  assert.equal(events[0].status, 'done');

  const cleared = Link.reconcile(existing, Object.assign({}, consultation, { manager: '' }), 'save', '2026-09-01T00:00:00+09:00');
  assert.equal(cleared[0].manager, '');
});

test('cancelling removes future linked reservations but keeps completed past events', () => {
  const consultation = { id: 'consult-1', status: 'cancelled', name: '홍길동', scheduleReservations: {} };
  const existing = [
    { id: 'past', kind: 'general', generalType: 'survey', name: '과거', start: '2026-08-20', end: '2026-08-20', startTime: '09:00', status: 'planned', memo: '', consultationId: 'consult-1', eventType: 'site_measurement', source: 'consultation' },
    { id: 'future', kind: 'general', generalType: 'consult', name: '미래', start: '2026-09-20', end: '2026-09-20', startTime: '09:00', status: 'planned', memo: '', consultationId: 'consult-1', eventType: 'estimate_meeting', source: 'consultation' }
  ];

  const events = Link.reconcile(existing, consultation, 'cancel', '2026-09-01T00:00:00+09:00');

  assert.deepEqual(events.map(event => event.id), ['past']);
  assert.equal(events[0].name, '홍길동 · 현장실측');
});

test('advancing a stage drops an unfinished future prior reservation but preserves a past one', () => {
  const futurePrevious = {
    id: 'future-consult', status: 'site_check', schedDate: '2026-09-10', schedTime: '09:00',
    scheduleReservations: { siteMeasurement: { date: '2026-09-10', time: '09:00' } }
  };
  const futureNext = Object.assign({}, futurePrevious, { status: 'est_meeting', schedDate: '2026-09-20', schedTime: '11:00' });
  const futureReservations = Link.updateReservations(futurePrevious, futureNext, '2026-09-01T00:00:00+09:00');

  const pastPrevious = {
    id: 'past-consult', status: 'site_check', schedDate: '2026-08-20', schedTime: '09:00',
    scheduleReservations: { siteMeasurement: { date: '2026-08-20', time: '09:00' } }
  };
  const pastNext = Object.assign({}, pastPrevious, { status: 'est_meeting', schedDate: '2026-09-20', schedTime: '11:00' });
  const pastReservations = Link.updateReservations(pastPrevious, pastNext, '2026-09-01T00:00:00+09:00');

  assert.deepEqual(futureReservations, { estimateMeeting: { date: '2026-09-20', time: '11:00' } });
  assert.deepEqual(pastReservations, {
    siteMeasurement: { date: '2026-08-20', time: '09:00' },
    estimateMeeting: { date: '2026-09-20', time: '11:00' }
  });
});

test('missing date or time never creates a linked schedule', () => {
  const consultation = { id: 'consult-1', status: 'site_check', name: '홍길동', schedDate: '2026-09-10', schedTime: '' };
  consultation.scheduleReservations = Link.updateReservations(null, consultation, '2026-09-01T00:00:00+09:00');
  assert.deepEqual(Link.reconcile([], consultation, 'save', '2026-09-01T00:00:00+09:00'), []);
});

test('reconciliation leaves construction schedules untouched and collapses linked duplicates', () => {
  const construction = { id: 'work-1', kind: 'construction', name: '타일작업', start: '2026-09-10', end: '2026-09-12', worker: '외부기사' };
  const duplicateA = { id: 'linked-a', kind: 'general', consultationId: 'consult-1', eventType: 'site_measurement', start: '2026-09-10', end: '2026-09-10', startTime: '09:00' };
  const duplicateB = { id: 'linked-b', kind: 'general', consultationId: 'consult-1', eventType: 'site_measurement', start: '2026-09-10', end: '2026-09-10', startTime: '09:00' };
  const consultation = { id: 'consult-1', status: 'site_check', name: '홍길동', scheduleReservations: { siteMeasurement: { date: '2026-09-10', time: '09:00' } } };

  const events = Link.reconcile([construction, duplicateA, duplicateB], consultation, 'save', '2026-09-01T00:00:00+09:00');

  assert.deepEqual(events[0], construction);
  assert.equal(events.filter(event => event.consultationId === 'consult-1' && event.eventType === 'site_measurement').length, 1);
});

test('editing a linked general event preserves its consultation metadata', () => {
  const existing = { id: 'linked-1', consultationId: 'consult-1', eventType: 'estimate_meeting', startTime: '11:00', source: 'consultation', manager: '최일성' };
  const edited = Link.mergeEditableGeneralEvent(existing, { id: 'linked-1', kind: 'general', generalType: 'consult', name: '수정명', start: '2026-09-20', end: '2026-09-20', status: 'done', memo: '완료' });
  assert.deepEqual(edited, {
    id: 'linked-1', consultationId: 'consult-1', eventType: 'estimate_meeting', startTime: '11:00', source: 'consultation', manager: '최일성',
    kind: 'general', generalType: 'consult', name: '수정명', start: '2026-09-20', end: '2026-09-20', status: 'done', memo: '완료'
  });
});

test('merging cloud and local general events preserves unique manual schedules', () => {
  const remote = [
    { id: 'remote-only', name: '원격 일반일정' },
    { id: 'shared', name: '원격 최신 일정' }
  ];
  const local = [
    { id: 'local-only', name: '로컬 일반일정' },
    { id: 'shared', name: '로컬 이전 일정' }
  ];

  assert.deepEqual(Link.mergeEventCollections(remote, local), [
    { id: 'remote-only', name: '원격 일반일정' },
    { id: 'shared', name: '원격 최신 일정' },
    { id: 'local-only', name: '로컬 일반일정' }
  ]);
});

test('linked schedule display keeps the consultation title exact', () => {
  assert.equal(Link.generalDisplayName({ source: 'consultation', name: '다함아파트 · 현장실측' }, '실측'), '다함아파트 · 현장실측');
  assert.equal(Link.generalDisplayName({ name: '고객 미팅' }, '상담'), '상담 · 고객 미팅');
});

test('site measurement milestone time becomes a calendar reservation when schedule fields are blank', () => {
  const consultation = {
    id: 'consult-1',
    status: 'site_check',
    name: '홍길동',
    schedDate: '',
    schedTime: '',
    history: [
      { type: 'milestone', status: 'site_check', at: '2026-09-01T17:30', memo: '' }
    ]
  };

  const events = Link.reconcileConsultations([], [consultation], '2026-08-30T23:00:00+09:00');

  assert.equal(events.length, 1);
  assert.equal(events[0].start, '2026-09-01');
  assert.equal(events[0].startTime, '17:30');
  assert.equal(events[0].name, '홍길동 · 현장실측');
});

test('current estimate meeting milestone wins over stale site measurement schedule fields', () => {
  const consultation = {
    id: 'consult-1',
    status: 'est_meeting',
    name: '홍길동',
    schedDate: '2026-08-29',
    schedTime: '15:00',
    history: [
      { type: 'milestone', status: 'site_check', at: '2026-08-29T15:00', memo: '' },
      { type: 'milestone', status: 'est_meeting', at: '2026-09-03T15:00', memo: '' }
    ]
  };

  const events = Link.reconcileConsultations([], [consultation], '2026-08-30T23:00:00+09:00');
  const meeting = events.find(event => event.eventType === 'estimate_meeting');

  assert.equal(meeting.start, '2026-09-03');
  assert.equal(meeting.startTime, '15:00');
});

test('current milestone repairs an already stored stale estimate meeting reservation', () => {
  const consultation = {
    id: 'consult-1',
    status: 'est_meeting',
    name: '홍길동',
    schedDate: '2026-08-29',
    schedTime: '15:00',
    scheduleReservations: {
      estimateMeeting: { date: '2026-08-29', time: '15:00' }
    },
    history: [
      { type: 'milestone', status: 'site_check', at: '2026-08-29T15:00', memo: '' },
      { type: 'milestone', status: 'est_meeting', at: '2026-09-03T15:00', memo: '' }
    ]
  };

  const events = Link.reconcileConsultations([], [consultation], '2026-08-31T00:00:00+09:00');
  const meeting = events.find(event => event.eventType === 'estimate_meeting');

  assert.equal(meeting.start, '2026-09-03');
  assert.equal(meeting.startTime, '15:00');
});

test('consultation and schedule pages load the same cache-busted linking script', () => {
  const root = path.join(__dirname, '..');
  const consult = fs.readFileSync(path.join(root, 'consult.html'), 'utf8');
  const schedule = fs.readFileSync(path.join(root, 'schedule.html'), 'utf8');
  const pattern = /consult-schedule-link\.js\?v=20260831-1/;

  assert.match(consult, pattern);
  assert.match(schedule, pattern);
});

