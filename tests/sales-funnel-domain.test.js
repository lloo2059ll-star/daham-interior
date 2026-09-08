const test = require('node:test');
const assert = require('node:assert/strict');

const Funnel = require('../sales-funnel-domain.js');

function lead(id, inquiry, visit, meeting, contract, extra = {}) {
  const history = [];
  if (inquiry) history.push({ type: 'milestone', status: 'inquiry', at: inquiry });
  if (visit) history.push({ type: 'milestone', status: 'site_check', at: visit });
  if (meeting) history.push({ type: 'milestone', status: 'est_meeting', at: meeting });
  if (contract) history.push({ type: 'milestone', status: 'contracted', at: contract });
  return { id, name: id, history, ...extra };
}

const september = { start: '2026-09-01', end: '2026-10-01', key: '2026-09' };

test('uses the earliest valid milestone and never treats estimate completion as a meeting', () => {
  const record = {
    createdAt: '2026-09-01T00:30:00+09:00',
    outcomeStatus: 'lost',
    history: [
      { type: 'milestone', status: 'site_check', at: 'broken' },
      { type: 'milestone', status: 'site_check', at: '2026-09-05T10:00' },
      { type: 'milestone', status: 'site_check', at: '2026-09-03T10:00' },
      { type: 'milestone', status: 'est_done', at: '2026-09-06T10:00' }
    ]
  };
  const dates = Funnel.milestones(record);
  assert.equal(dates.inquiry.slice(0, 10), '2026-09-01');
  assert.equal(dates.site_visit.slice(0, 10), '2026-09-03');
  assert.equal(dates.estimate_meeting, null);
  assert.equal(Funnel.reachedStage({ history: [{ type: 'milestone', status: 'est_meeting', at: '2026-09-07T10:00' }], outcomeStatus: 'lost' }), 'estimate_meeting');
});

test('builds Korean calendar periods with inclusive start and exclusive end', () => {
  const now = new Date(2026, 8, 8, 12, 0, 0);
  assert.deepEqual(Funnel.periodFor('this_month', now), september);
  assert.deepEqual(Funnel.periodFor('last_month', now), { start: '2026-08-01', end: '2026-09-01', key: '2026-08' });
  assert.deepEqual(Funnel.periodFor('last_3_months', now), { start: '2026-07-01', end: '2026-10-01', key: '2026-07..2026-09' });
  assert.deepEqual(Funnel.periodFor('year', now), { start: '2026-01-01', end: '2027-01-01', key: '2026' });
  assert.deepEqual(Funnel.periodFor('month', now, '2026-10'), { start: '2026-10-01', end: '2026-11-01', key: '2026-10' });
  assert.equal(Funnel.inPeriod('2026-10-01T00:00:00+09:00', september), false);
});

test('separates activity-month counts from inquiry-cohort conversion rates', () => {
  const records = [];
  for (let i = 0; i < 10; i++) {
    records.push(lead(
      `lead-${i}`,
      `2026-09-${String(i + 1).padStart(2, '0')}T09:00:00+09:00`,
      i < 7 ? '2026-09-15T09:00:00+09:00' : null,
      i < 3 ? '2026-09-20T09:00:00+09:00' : null,
      i < 2 ? '2026-09-25T09:00:00+09:00' : null
    ));
  }
  assert.deepEqual(Funnel.activityCounts(records, september), { inquiry: 10, site_visit: 7, estimate_meeting: 3, contract: 2 });
  assert.deepEqual(Funnel.cohortMetrics(records, september).rates, {
    inquiry_to_visit: 70,
    visit_to_meeting: 42.9,
    meeting_to_contract: 66.7,
    inquiry_to_contract: 20
  });
  assert.deepEqual(Funnel.goalProgress(Funnel.activityCounts(records, september), {
    inquiry: 10, site_visit: 6, estimate_meeting: 4, contract: 2
  }), { inquiry: 100, site_visit: 116.7, estimate_meeting: 75, contract: 100 });
});

test('never divides September visits from August leads by September inquiries', () => {
  const records = [
    ...Array.from({ length: 5 }, (_, i) => lead(`aug-${i}`, '2026-08-20T09:00:00+09:00', '2026-09-03T09:00:00+09:00')),
    ...Array.from({ length: 3 }, (_, i) => lead(`sep-${i}`, '2026-09-05T09:00:00+09:00', i === 0 ? '2026-10-03T09:00:00+09:00' : null))
  ];
  assert.deepEqual(Funnel.activityCounts(records, september), { inquiry: 3, site_visit: 5, estimate_meeting: 0, contract: 0 });
  assert.equal(Funnel.cohortMetrics(records, september).rates.inquiry_to_visit, 33.3);
  assert.ok(Funnel.cohortMetrics(records, september).rates.inquiry_to_visit <= 100);
});

test('counts a later contract in its activity month and its original inquiry cohort', () => {
  const records = [lead('cross-month', '2026-09-10T09:00:00+09:00', '2026-09-11T09:00:00+09:00', '2026-09-12T09:00:00+09:00', '2026-10-02T09:00:00+09:00')];
  const october = { start: '2026-10-01', end: '2026-11-01', key: '2026-10' };
  assert.equal(Funnel.cohortMetrics(records, september).rates.inquiry_to_contract, 100);
  assert.equal(Funnel.activityCounts(records, october).contract, 1);
  assert.equal(Funnel.activityCounts(records, september).contract, 0);
});

test('zero denominators return finite zero percentages', () => {
  const metrics = Funnel.cohortMetrics([], september);
  for (const value of Object.values(metrics.rates)) {
    assert.equal(value, 0);
    assert.equal(Number.isFinite(value), true);
  }
});

test('uses contractTotal first and reports missing amounts without dropping contracts', () => {
  const records = [
    lead('a', '2026-09-01T09:00:00+09:00', null, null, '2026-09-10T09:00:00+09:00', { projId: 'p1' }),
    lead('b', '2026-09-02T09:00:00+09:00', null, null, '2026-09-11T09:00:00+09:00', { projId: 'missing' })
  ];
  const result = Funnel.contractMetrics(records, [{ id: 'p1', contractTotal: 120000000 }], september, () => 999);
  assert.deepEqual({ count: result.count, total: result.total, average: result.average }, { count: 2, total: 120000000, average: 60000000 });
  assert.deepEqual(result.missingAmountIds, ['b']);
});

test('keeps source, source type, contact channel, and loss reasons independent', () => {
  const records = [
    lead('n1', '2026-09-01T09:00:00+09:00', null, null, '2026-10-01T09:00:00+09:00', { source: '네이버 블로그', sourceType: 'organic', contactChannel: '네이버폼' }),
    lead('i1', '2026-09-02T09:00:00+09:00', null, null, null, { source: '인스타그램', sourceType: 'paid', contactChannel: '카카오채널', outcomeStatus: 'lost', lostReason: '예산' }),
    lead('custom', '2026-09-03T09:00:00+09:00', null, null, null, { source: '지역카페', sourceType: 'unknown', contactChannel: '전화', outcomeStatus: 'on_hold', lostReason: '고객 보류' })
  ];
  assert.equal(Funnel.groupBySource(records, september, [], () => 0).find(row => row.key === '네이버 블로그').cohortConversion, 100);
  assert.equal(Funnel.groupBySourceType(records, september).find(row => row.key === 'paid').inquiries, 1);
  assert.equal(Funnel.groupByContactChannel(records, september).find(row => row.key === '카카오채널').inquiries, 1);
  assert.equal(Funnel.lossAnalysis(records, september).reasons.find(row => row.key === '예산').count, 1);
  assert.ok(Funnel.groupBySource(records, september, [], () => 0).some(row => row.key === '지역카페'));
});

test('reports data issues without inventing a contract milestone', () => {
  const records = [{ id: 'c1', createdAt: '2026-09-01T09:00:00+09:00', projId: 'p1', history: [] }];
  const issues = Funnel.dataIssues(records, [{ id: 'p1', contracted: true }]);
  assert.ok(issues.some(issue => issue.code === 'missing_contract_milestone' && issue.recordId === 'c1'));
  assert.equal(Funnel.milestones(records[0]).contract, null);
});

test('allows only active owners and admins to view the funnel', () => {
  assert.equal(Funnel.canView({ role: 'owner', isActive: true }), true);
  assert.equal(Funnel.canView({ role: 'admin', isActive: true }), true);
  assert.equal(Funnel.canView({ role: 'staff', isActive: true }), false);
  assert.equal(Funnel.canView({ role: 'owner', isActive: false }), false);
});
