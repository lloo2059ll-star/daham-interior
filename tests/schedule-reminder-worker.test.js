const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const domainPath = path.join(root, 'supabase', 'functions', 'schedule-reminders', 'domain.js');

test('reminder worker extracts timed consultation and construction schedules', () => {
  const reminders = require(domainPath);
  const events = reminders.extractScheduleEvents({
    construction: [{ id: 'site-1', info: { addr: '옥계 현장' }, tasks: [
      { id: 'task-1', name: '도배', start: '2026-09-03', startTime: '14:30', status: 'planned' }
    ] }],
    general: [
      { id: 'consult-1', name: '상담문의', start: '2026-09-03', startTime: '15:00', status: 'planned' }
    ]
  });

  assert.deepEqual(events, [
    { id: 'task-1', date: '2026-09-03', time: '14:30', title: '옥계 현장 · 도배', targetUrl: 'schedule.html?id=task-1' },
    { id: 'consult-1', date: '2026-09-03', time: '15:00', title: '상담문의', targetUrl: 'schedule.html?id=consult-1' }
  ]);
});

test('reminder worker creates one-hour and all-day reminders without cancelled work', () => {
  const reminders = require(domainPath);
  const rows = reminders.buildReminderRows({
    now: '2026-09-03T13:30:00+09:00',
    events: [
      { id: 'timed', date: '2026-09-03', time: '14:30', title: '도배', targetUrl: 'schedule.html?id=timed' },
      { id: 'cancelled', date: '2026-09-03', time: '14:30', title: '취소', status: 'cancelled' }
    ],
    companyId: 'company-1'
  });

  assert.deepEqual(rows.map(row => ({ kind: row.kind, dedupeKey: row.dedupeKey })), [
    { kind: 'schedule_one_hour', dedupeKey: 'schedule:timed:one-hour:2026-09-03:14:30' }
  ]);

  const morning = reminders.buildReminderRows({
    now: '2026-09-03T07:03:00+09:00',
    events: [{ id: 'all-day', date: '2026-09-03', title: '철거', targetUrl: 'schedule.html?id=all-day' }],
    companyId: 'company-1'
  });
  assert.equal(morning[0].kind, 'all_day_morning');
  assert.equal(morning[0].dedupeKey, 'schedule:all-day:all-day:2026-09-03');
});

test('deployed reminder infrastructure uses protected cron and drains push outbox', () => {
  const worker = fs.readFileSync(path.join(root, 'supabase', 'functions', 'schedule-reminders', 'index.ts'), 'utf8');
  const sender = fs.readFileSync(path.join(root, 'supabase', 'functions', 'send-push', 'index.ts'), 'utf8');
  const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations'))
    .filter(name => name.includes('schedule_reminders'))
    .map(name => fs.readFileSync(path.join(root, 'supabase', 'migrations', name), 'utf8'))
    .join('\n');

  assert.match(worker, /daham_schedule_v1/);
  assert.match(worker, /daham_schedule_general_v1/);
  assert.match(worker, /notification_outbox/);
  assert.match(worker, /send-push/);
  assert.match(sender, /verify_push_cron_secret/);
  assert.match(migrations, /create extension if not exists pg_cron/i);
  assert.match(migrations, /create extension if not exists pg_net/i);
  assert.match(migrations, /cron\.schedule/i);
  assert.match(migrations, /vault\.create_secret/i);
  assert.doesNotMatch(migrations, /(?:sb_secret_|eyJ[a-zA-Z0-9_-]{20,})/);
});
