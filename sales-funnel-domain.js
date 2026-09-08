(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DAHAM_SALES_FUNNEL = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STAGES = ['inquiry', 'site_visit', 'estimate_meeting', 'contract'];
  const STAGE_LABELS = {
    inquiry: '신규 문의',
    site_visit: '현장방문',
    estimate_meeting: '견적미팅',
    contract: '계약'
  };
  const STATUS_MAP = {
    inquiry: 'inquiry',
    site_check: 'site_visit',
    est_meeting: 'estimate_meeting',
    contracted: 'contract'
  };
  const DEFAULT_GOALS = { inquiry: 10, site_visit: 6, estimate_meeting: 4, contract: 2 };

  function asTimestamp(value) {
    if (!value || typeof value !== 'string') return NaN;
    const text = value.trim();
    if (!text) return NaN;
    const explicitZone = /(?:z|[+-]\d\d:\d\d)$/i.test(text);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
    return Date.parse(explicitZone || dateOnly ? text : text + ':00+09:00');
  }

  function valid(value) {
    return Number.isFinite(asTimestamp(value)) ? String(value).trim() : null;
  }

  function milestones(record) {
    const out = { inquiry: null, site_visit: null, estimate_meeting: null, contract: null };
    const history = Array.isArray(record && record.history) ? record.history : [];
    history.forEach(function (item) {
      const stage = item && item.type === 'milestone' ? STATUS_MAP[item.status] : null;
      const at = stage ? valid(item.at) : null;
      if (at && (!out[stage] || asTimestamp(at) < asTimestamp(out[stage]))) out[stage] = at;
    });
    out.inquiry = out.inquiry || valid(record && record.createdAt);
    return out;
  }

  function reachedStage(record) {
    const dates = milestones(record);
    for (let index = STAGES.length - 1; index >= 0; index -= 1) {
      if (dates[STAGES[index]]) return STAGES[index];
    }
    return null;
  }

  function pad(value) { return String(value).padStart(2, '0'); }
  function monthKey(year, month) { return year + '-' + pad(month); }
  function addMonths(year, month, amount) {
    const date = new Date(year, month - 1 + amount, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  }
  function monthPeriod(year, month) {
    const next = addMonths(year, month, 1);
    return { start: monthKey(year, month) + '-01', end: monthKey(next.year, next.month) + '-01', key: monthKey(year, month) };
  }

  function periodFor(filter, now, selectedMonth) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    if (filter === 'last_month') {
      const previous = addMonths(year, month, -1);
      return monthPeriod(previous.year, previous.month);
    }
    if (filter === 'last_3_months') {
      const first = addMonths(year, month, -2);
      const end = addMonths(year, month, 1);
      return { start: monthKey(first.year, first.month) + '-01', end: monthKey(end.year, end.month) + '-01', key: monthKey(first.year, first.month) + '..' + monthKey(year, month) };
    }
    if (filter === 'year') return { start: year + '-01-01', end: (year + 1) + '-01-01', key: String(year) };
    if (filter === 'month' && /^\d{4}-\d{2}$/.test(selectedMonth || '')) {
      const parts = selectedMonth.split('-').map(Number);
      return monthPeriod(parts[0], parts[1]);
    }
    return monthPeriod(year, month);
  }

  function koreaDateKey(value) {
    if (!valid(value)) return null;
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2}(?::\d{2})?$)/.test(text)) return text.slice(0, 10);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(asTimestamp(value)));
    const values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }

  function inPeriod(value, period) {
    const key = koreaDateKey(value);
    return !!(key && period && key >= period.start && key < period.end);
  }

  function activityCounts(records, period) {
    const result = { inquiry: 0, site_visit: 0, estimate_meeting: 0, contract: 0 };
    (records || []).forEach(function (record) {
      const dates = milestones(record);
      STAGES.forEach(function (stage) { if (inPeriod(dates[stage], period)) result[stage] += 1; });
    });
    return result;
  }

  function safeRate(numerator, denominator) {
    return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
  }

  function cohortMetrics(records, period) {
    const cohort = (records || []).filter(function (record) { return inPeriod(milestones(record).inquiry, period); });
    const reached = { inquiry: cohort.length, site_visit: 0, estimate_meeting: 0, contract: 0 };
    cohort.forEach(function (record) {
      const dates = milestones(record);
      if (dates.site_visit) reached.site_visit += 1;
      if (dates.estimate_meeting) reached.estimate_meeting += 1;
      if (dates.contract) reached.contract += 1;
    });
    return {
      cohort: cohort,
      reached: reached,
      rates: {
        inquiry_to_visit: safeRate(reached.site_visit, reached.inquiry),
        visit_to_meeting: safeRate(reached.estimate_meeting, reached.site_visit),
        meeting_to_contract: safeRate(reached.contract, reached.estimate_meeting),
        inquiry_to_contract: safeRate(reached.contract, reached.inquiry)
      }
    };
  }

  function goalProgress(activity, goals) {
    const result = {};
    STAGES.forEach(function (stage) { result[stage] = safeRate(Number(activity && activity[stage]) || 0, Number(goals && goals[stage]) || 0); });
    return result;
  }

  function linkedProject(record, projects) {
    return (projects || []).find(function (project) {
      return (record.projId && String(project.id) === String(record.projId)) || (project.consultId && String(project.consultId) === String(record.id));
    }) || null;
  }

  function projectAmount(project, totalForProject) {
    if (!project) return 0;
    const exact = Number(project.contractTotal);
    if (Number.isFinite(exact) && exact > 0) return exact;
    const fallback = typeof totalForProject === 'function' ? Number(totalForProject(project)) : 0;
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }

  function contractMetrics(records, projects, period, totalForProject) {
    const contracts = (records || []).filter(function (record) { return inPeriod(milestones(record).contract, period); });
    const missingAmountIds = [];
    let total = 0;
    contracts.forEach(function (record) {
      const amount = projectAmount(linkedProject(record, projects), totalForProject);
      total += amount;
      if (!amount) missingAmountIds.push(record.id);
    });
    return { count: contracts.length, total: total, average: contracts.length ? Math.round(total / contracts.length) : 0, missingAmountIds: missingAmountIds };
  }

  function sourceKey(record) { return String(record && record.source || '미분류').trim() || '미분류'; }
  function simpleGroup(records, period, getter) {
    const grouped = new Map();
    (records || []).forEach(function (record) {
      if (!inPeriod(milestones(record).inquiry, period)) return;
      const key = getter(record);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped, function (entry) { return { key: entry[0], inquiries: entry[1] }; }).sort(function (a, b) { return b.inquiries - a.inquiries || a.key.localeCompare(b.key, 'ko'); });
  }

  function groupBySource(records, period, projects, totalForProject) {
    const keys = new Set((records || []).map(sourceKey));
    return Array.from(keys, function (key) {
      const subset = (records || []).filter(function (record) { return sourceKey(record) === key; });
      const activity = activityCounts(subset, period);
      const cohort = cohortMetrics(subset, period);
      const money = contractMetrics(subset, projects, period, totalForProject);
      return { key: key, inquiry: activity.inquiry, site_visit: activity.site_visit, estimate_meeting: activity.estimate_meeting, contract: activity.contract, inquiries: activity.inquiry, cohortConversion: cohort.rates.inquiry_to_contract, total: money.total, average: money.average };
    }).filter(function (row) { return row.inquiry || row.site_visit || row.estimate_meeting || row.contract; }).sort(function (a, b) { return b.inquiry - a.inquiry || a.key.localeCompare(b.key, 'ko'); });
  }

  function groupBySourceType(records, period) { return simpleGroup(records, period, function (record) { return String(record.sourceType || 'unknown'); }); }
  function groupByContactChannel(records, period) { return simpleGroup(records, period, function (record) { return String(record.contactChannel || '미분류'); }); }

  function outcomeStatus(record) {
    if (record && record.outcomeStatus) return record.outcomeStatus;
    return record && record.status === 'cancelled' ? 'cancelled' : 'in_progress';
  }

  function lossAnalysis(records, period) {
    const cohort = (records || []).filter(function (record) { return inPeriod(milestones(record).inquiry, period); });
    const statusCounts = { on_hold: 0, lost: 0, cancelled: 0 };
    const reasons = new Map();
    cohort.forEach(function (record) {
      const status = outcomeStatus(record);
      if (Object.prototype.hasOwnProperty.call(statusCounts, status)) statusCounts[status] += 1;
      if (status !== 'in_progress' && record.lostReason) reasons.set(record.lostReason, (reasons.get(record.lostReason) || 0) + 1);
    });
    return { statuses: statusCounts, reasons: Array.from(reasons, function (entry) { return { key: entry[0], count: entry[1] }; }).sort(function (a, b) { return b.count - a.count; }) };
  }

  function recordsForStage(records, stage, period) {
    return (records || []).filter(function (record) { return inPeriod(milestones(record)[stage], period); });
  }

  function dataIssues(records, projects) {
    const issues = [];
    (records || []).forEach(function (record) {
      const project = linkedProject(record, projects);
      if (project && (project.contracted || ['contracted', 'construction', 'completed'].includes(project.status)) && !milestones(record).contract) {
        issues.push({ code: 'missing_contract_milestone', recordId: record.id, projectId: project.id });
      }
      (Array.isArray(record.history) ? record.history : []).forEach(function (item) {
        if (item && item.type === 'milestone' && STATUS_MAP[item.status] && item.at && !valid(item.at)) issues.push({ code: 'invalid_milestone_date', recordId: record.id, status: item.status });
      });
    });
    return issues;
  }

  function monthlyHistory(records, projects, now, count, totalForProject) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    return Array.from({ length: count || 6 }, function (_, index) {
      const offset = index - (count || 6) + 1;
      const target = addMonths(current.getFullYear(), current.getMonth() + 1, offset);
      const period = monthPeriod(target.year, target.month);
      return { month: period.key, activity: activityCounts(records, period), cohort: cohortMetrics(records, period), contracts: contractMetrics(records, projects, period, totalForProject) };
    });
  }

  function interpret(metrics, goals, previousActivity, losses) {
    const lines = [];
    if (metrics && goals) lines.push('신규 문의는 목표의 ' + safeRate(metrics.activity.inquiry, goals.inquiry).toFixed(1) + '%입니다.');
    if (metrics && metrics.cohort && metrics.cohort.reached.inquiry) {
      const rates = metrics.cohort.rates;
      const candidates = [['문의→방문', rates.inquiry_to_visit], ['방문→미팅', rates.visit_to_meeting], ['미팅→계약', rates.meeting_to_contract]].filter(function (item) { return Number.isFinite(item[1]); });
      candidates.sort(function (a, b) { return a[1] - b[1]; });
      if (candidates.length) lines.push('현재 가장 낮은 cohort 단계 전환율은 ' + candidates[0][0] + ' ' + candidates[0][1].toFixed(1) + '%입니다.');
    }
    if (metrics && previousActivity) {
      const delta = metrics.activity.inquiry - previousActivity.inquiry;
      lines.push('지난달보다 신규 문의가 ' + Math.abs(delta) + '건 ' + (delta >= 0 ? '증가했습니다.' : '감소했습니다.'));
    }
    if (losses && losses.reasons && losses.reasons[0]) lines.push('미계약 사유 중 ' + losses.reasons[0].key + ' 비중이 가장 높습니다.');
    return lines;
  }

  function canView(user) { return !!(user && user.isActive === true && (user.role === 'owner' || user.role === 'admin')); }

  function dashboardMetrics(input) {
    const records = input.records || [];
    const projects = input.projects || [];
    const period = input.period;
    const activity = activityCounts(records, period);
    const cohort = cohortMetrics(records, period);
    const contracts = contractMetrics(records, projects, period, input.totalForProject);
    return { activity: activity, cohort: cohort, contracts: contracts, goals: input.goals || DEFAULT_GOALS, progress: goalProgress(activity, input.goals || DEFAULT_GOALS), losses: lossAnalysis(records, period), issues: dataIssues(records, projects) };
  }

  return {
    STAGES: STAGES,
    STAGE_LABELS: STAGE_LABELS,
    DEFAULT_GOALS: DEFAULT_GOALS,
    milestones: milestones,
    reachedStage: reachedStage,
    periodFor: periodFor,
    inPeriod: inPeriod,
    activityCounts: activityCounts,
    cohortMetrics: cohortMetrics,
    goalProgress: goalProgress,
    contractMetrics: contractMetrics,
    groupBySource: groupBySource,
    groupBySourceType: groupBySourceType,
    groupByContactChannel: groupByContactChannel,
    lossAnalysis: lossAnalysis,
    recordsForStage: recordsForStage,
    dataIssues: dataIssues,
    monthlyHistory: monthlyHistory,
    interpret: interpret,
    canView: canView,
    outcomeStatus: outcomeStatus,
    dashboardMetrics: dashboardMetrics
  };
});
