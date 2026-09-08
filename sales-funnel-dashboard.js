(function () {
  'use strict';
  const Funnel = window.DAHAM_SALES_FUNNEL;
  const ClientApi = window.DAHAM_SALES_FUNNEL_CLIENT;
  if (!Funnel || !ClientApi || !window.DAHAM_AUTH) return;

  const stageRates = { site_visit: 'inquiry_to_visit', estimate_meeting: 'visit_to_meeting', contract: 'meeting_to_contract' };
  const stageRateLabels = { site_visit: '문의→방문', estimate_meeting: '방문→미팅', contract: '미팅→계약' };
  let client;
  let state = { filter: 'this_month', month: localMonth(new Date()), data: null, goals: { ...Funnel.DEFAULT_GOALS }, goalDefault: true, period: null };

  function byId(id) { return document.getElementById(id); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function money(value) { return (Number(value) || 0).toLocaleString('ko-KR') + '원'; }
  function pct(value) { return (Number(value) || 0).toFixed(1) + '%'; }
  function localMonth(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0'); }
  function monthlyFilter() { return state.filter === 'this_month' || state.filter === 'last_month' || state.filter === 'month'; }
  function goalMonth() { return state.period && /^\d{4}-\d{2}$/.test(state.period.key) ? state.period.key : null; }
  function totalForProject(project) { return typeof window.sectionEst === 'function' ? window.sectionEst(project) : 0; }
  function status(text, error) { const el = byId('salesFunnelStatus'); el.className = 'sales-funnel-status' + (error ? ' error' : ''); el.innerHTML = text || ''; }

  function stageCard(stage, index, metrics) {
    const count = metrics.activity[stage];
    const hasGoal = monthlyFilter();
    const target = hasGoal ? state.goals[stage] : null;
    const progress = hasGoal ? metrics.progress[stage] : 0;
    const rateKey = stageRates[stage];
    return '<article class="sales-funnel-stage">'
      + '<h3>' + Funnel.STAGE_LABELS[stage] + '</h3>'
      + '<div class="sales-funnel-stage-count"><button type="button" data-funnel-stage="' + stage + '">' + count + '</button><span>/ ' + (target == null ? '—' : target) + '</span></div>'
      + '<div class="sales-funnel-progress"><span style="width:' + Math.min(progress, 100) + '%"></span></div>'
      + '<p class="sales-funnel-goal-copy">' + (hasGoal ? '목표 달성 ' + pct(progress) : '기간 합계 · 월 목표 비교 없음') + '</p>'
      + (index ? '<p class="sales-funnel-cohort">' + stageRateLabels[stage] + ' cohort 전환율 <strong>' + pct(metrics.cohort.rates[rateKey]) + '</strong></p>' : '<p class="sales-funnel-cohort">선택 기간 신규 문의 cohort <strong>' + metrics.cohort.reached.inquiry + '명</strong></p>')
      + '</article>';
  }

  function sourceTable(rows) {
    const body = rows.length ? rows.map(row => '<tr><td>' + esc(row.key) + '</td><td>' + row.inquiry + '</td><td>' + row.site_visit + '</td><td>' + row.estimate_meeting + '</td><td>' + row.contract + '</td><td>' + pct(row.cohortConversion) + '</td><td>' + money(row.total) + '</td><td>' + money(row.average) + '</td></tr>').join('') : '<tr><td colspan="8">데이터가 없습니다.</td></tr>';
    return '<div class="sales-funnel-table-wrap"><table class="sales-funnel-table"><thead><tr><th>유입경로</th><th>신규 문의</th><th>현장방문</th><th>견적미팅</th><th>계약</th><th>cohort 문의→계약</th><th>계약 총액</th><th>평균 계약금액</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function miniList(rows, value) {
    return '<div class="sales-funnel-mini-list">' + (rows.length ? rows.map(row => '<span>' + esc(row.key) + '<b>' + (value ? value(row) : row.inquiries) + '</b></span>').join('') : '<span>데이터 없음</span>') + '</div>';
  }

  function historyTable(rows) {
    return '<div class="sales-funnel-table-wrap"><table class="sales-funnel-table"><thead><tr><th>월</th><th>신규 문의</th><th>현장방문</th><th>견적미팅</th><th>계약</th><th>최종 cohort 전환율</th><th>계약총액</th><th>평균계약</th></tr></thead><tbody>'
      + rows.map(row => '<tr><td>' + row.month + '</td><td>' + row.activity.inquiry + '</td><td>' + row.activity.site_visit + '</td><td>' + row.activity.estimate_meeting + '</td><td>' + row.activity.contract + '</td><td>' + pct(row.cohort.rates.inquiry_to_contract) + '</td><td>' + money(row.contracts.total) + '</td><td>' + money(row.contracts.average) + '</td></tr>').join('')
      + '</tbody></table></div>';
  }

  function render() {
    const data = state.data;
    if (!data) return;
    const metrics = Funnel.dashboardMetrics({ records: data.records, projects: data.projects, period: state.period, goals: state.goals, totalForProject });
    const sources = Funnel.groupBySource(data.records, state.period, data.projects, totalForProject);
    const types = Funnel.groupBySourceType(data.records, state.period);
    const channels = Funnel.groupByContactChannel(data.records, state.period);
    const losses = Funnel.lossAnalysis(data.records, state.period);
    const history = Funnel.monthlyHistory(data.records, data.projects, new Date(), 6, totalForProject);
    const previous = history.length > 1 ? history[history.length - 2].activity : null;
    const interpretations = Funnel.interpret(metrics, monthlyFilter() ? state.goals : null, previous, losses);
    const pending = losses.statuses.on_hold + losses.statuses.lost + losses.statuses.cancelled;

    byId('salesFunnelContent').innerHTML = '<h3 class="sales-funnel-section-title">월간 활동 실적</h3><div class="sales-funnel-stage-grid">' + Funnel.STAGES.map((stage, index) => stageCard(stage, index, metrics)).join('') + '</div>'
      + '<div class="sales-funnel-summary"><article><span>계약 총액</span><strong>' + money(metrics.contracts.total) + '</strong></article><article><span>평균 계약금액</span><strong>' + money(metrics.contracts.average) + '</strong></article><article><span>문의→계약 최종 cohort 전환율</span><strong>' + pct(metrics.cohort.rates.inquiry_to_contract) + '</strong></article><article><span>미계약/보류</span><strong>' + pending + '건</strong></article></div>'
      + '<div class="sales-funnel-interpret">' + (interpretations.length ? interpretations.map(line => '<span>' + esc(line) + '</span>').join('') : '<span>해석할 데이터가 아직 충분하지 않습니다.</span>') + '</div>'
      + '<div class="sales-funnel-analysis-grid"><section class="sales-funnel-panel"><h3>유입경로 성과</h3>' + sourceTable(sources) + '</section>'
      + '<div class="sales-funnel-mini"><section class="sales-funnel-panel"><h3>유입유형</h3>' + miniList(types, row => '문의 ' + row.inquiries + ' · 계약 ' + row.contracts) + '</section><section class="sales-funnel-panel"><h3>문의수단</h3>' + miniList(channels) + '</section><section class="sales-funnel-panel"><h3>이탈·미계약 분석</h3>' + miniList([{ key: '보류', inquiries: losses.statuses.on_hold }, { key: '미계약', inquiries: losses.statuses.lost }, { key: '취소', inquiries: losses.statuses.cancelled }]) + miniList(losses.reasons, row => row.count) + '</section></div></div>'
      + '<section class="sales-funnel-panel" style="margin-top:12px"><h3>월별 히스토리</h3>' + historyTable(history) + '</section>';
    byId('salesFunnelContent').querySelectorAll('[data-funnel-stage]').forEach(button => button.addEventListener('click', () => showDetails(button.dataset.funnelStage)));
    if (metrics.issues.length) status('데이터 보완 필요 ' + metrics.issues.length + '건 · 계약 마일스톤 또는 날짜를 확인하세요.', false);
    else status(state.goalDefault && monthlyFilter() ? '기본 목표 10 / 6 / 4 / 2가 표시됩니다.' : '', false);
  }

  function showDetails(stage) {
    const rows = Funnel.recordsForStage(state.data.records, stage, state.period);
    const details = byId('salesFunnelDetails');
    details.hidden = false;
    details.innerHTML = '<div class="sales-funnel-details-head"><h3>' + Funnel.STAGE_LABELS[stage] + ' 고객 ' + rows.length + '명</h3><button type="button" aria-label="닫기">×</button></div><div class="sales-funnel-table-wrap"><table class="sales-funnel-table"><thead><tr><th>고객명</th><th>현장명</th><th>최초 문의일</th><th>현장방문일</th><th>견적미팅일</th><th>계약일</th><th>유입경로</th><th>유입유형</th><th>문의수단</th><th>예상 예산</th><th>현재 도달 단계</th><th>진행 결과</th><th>미계약 사유</th><th>메모</th><th>계약금액</th></tr></thead><tbody>'
      + rows.map(record => { const dates = Funnel.milestones(record); const project = state.data.projects.find(item => String(item.id) === String(record.projId) || String(item.consultId) === String(record.id)); const amount = project ? Number(project.contractTotal) || totalForProject(project) : 0; return '<tr><td><button class="sales-funnel-detail-link" data-consult="' + esc(record.id) + '">' + esc(record.name || '이름 없음') + '</button></td><td>' + esc(record.siteName || '') + '</td><td>' + esc((dates.inquiry || '').slice(0, 10)) + '</td><td>' + esc((dates.site_visit || '').slice(0, 10)) + '</td><td>' + esc((dates.estimate_meeting || '').slice(0, 10)) + '</td><td>' + esc((dates.contract || '').slice(0, 10)) + '</td><td>' + esc(record.source || '미분류') + '</td><td>' + esc(record.sourceType || 'unknown') + '</td><td>' + esc(record.contactChannel || '미분류') + '</td><td>' + esc(record.budget || '') + '</td><td>' + esc(Funnel.STAGE_LABELS[Funnel.reachedStage(record)] || '') + '</td><td>' + esc(Funnel.outcomeStatus(record)) + '</td><td>' + esc(record.lostReason || '') + '</td><td>' + esc(record.memo || '') + '</td><td>' + (dates.contract ? money(amount) : '—') + '</td></tr>'; }).join('')
      + '</tbody></table></div>';
    details.querySelector('[aria-label="닫기"]').addEventListener('click', () => { details.hidden = true; });
    details.querySelectorAll('[data-consult]').forEach(button => button.addEventListener('click', () => { localStorage.setItem('daham_open_consult', button.dataset.consult); location.href = 'consult.html'; }));
    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function reload() {
    state.period = Funnel.periodFor(state.filter, new Date(), state.month);
    const monthly = monthlyFilter();
    byId('salesFunnelMonth').hidden = state.filter !== 'month';
    byId('salesFunnelGoalButton').disabled = !monthly;
    status('불러오는 중…');
    const data = await client.loadDashboard();
    const goalResult = monthly ? await client.loadGoals(goalMonth()) : { goals: Funnel.DEFAULT_GOALS, isDefault: true, error: '' };
    state.data = data; state.goals = goalResult.goals; state.goalDefault = goalResult.isDefault;
    render();
    if (data.error || goalResult.error) status(esc(data.error || goalResult.error) + ' <button type="button" id="salesFunnelRetry">다시 시도</button>', true);
    const retry = byId('salesFunnelRetry'); if (retry) retry.addEventListener('click', reload);
  }

  function openGoals() {
    if (!monthlyFilter()) return;
    byId('salesFunnelGoalMonthLabel').textContent = goalMonth() + ' 목표';
    byId('salesFunnelGoalFields').innerHTML = Funnel.STAGES.map(stage => '<label>' + Funnel.STAGE_LABELS[stage] + '<input type="number" min="0" step="1" name="' + stage + '" value="' + state.goals[stage] + '"></label>').join('');
    byId('salesFunnelGoalError').textContent = '';
    byId('salesFunnelGoalModal').hidden = false;
  }

  async function saveGoals(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const goals = {};
    Funnel.STAGES.forEach(stage => { goals[stage] = Number(form.get(stage)); });
    try { const result = await client.saveGoals(goalMonth(), goals); state.goals = result.goals; state.goalDefault = false; byId('salesFunnelGoalModal').hidden = true; render(); }
    catch (error) { byId('salesFunnelGoalError').textContent = error.message || '목표 저장에 실패했습니다.'; }
  }

  Promise.resolve(DAHAM_AUTH.ready).then(ok => {
    if (!ok) return;
    const user = DAHAM_AUTH.currentUser();
    const shell = byId('salesFunnelShell');
    if (!Funnel.canView(user)) { shell.remove(); return; }
    shell.hidden = false;
    client = ClientApi.createSalesFunnelClient({ user });
    byId('salesFunnelMonth').value = state.month;
    byId('salesFunnelPeriod').addEventListener('change', event => { state.filter = event.target.value; reload(); });
    byId('salesFunnelMonth').addEventListener('change', event => { if (event.target.value) { state.month = event.target.value; reload(); } });
    byId('salesFunnelGoalButton').addEventListener('click', openGoals);
    byId('salesFunnelGoalForm').addEventListener('submit', saveGoals);
    byId('salesFunnelGoalModal').querySelector('[data-goal-close]').addEventListener('click', () => { byId('salesFunnelGoalModal').hidden = true; });
    reload();
  });
})();
