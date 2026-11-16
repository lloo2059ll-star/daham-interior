(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DAHAM_ADDITIONAL_WORK = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const text = value => value == null ? '' : String(value);
  const escapeHtml = value => text(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = value => escapeHtml(value).replace(/\r\n?|\n/g, '<br>') || '&nbsp;';

  function createBlankDraft(rowCount = 7) {
    const count = Number.isInteger(rowCount) && rowCount > 0 && rowCount <= 1000 ? rowCount : 7;
    return {site:'', customer:'', date:'', vat:'', notes:'', confirmedOn:'',
      items:Array.from({length:count}, () => ({description:'', amount:''}))};
  }

  function normalizeDraft(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const draft = createBlankDraft();
    for (const key of ['site','customer','date','notes','confirmedOn']) draft[key] = text(source[key]);
    draft.vat = ['included','excluded'].includes(source.vat) ? source.vat : '';
    if (Array.isArray(source.items) && source.items.length) {
      draft.items = source.items.map(row => ({description:text(row && row.description), amount:text(row && row.amount)}));
    }
    return draft;
  }

  function parseAmount(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
    if (typeof value !== 'number' && typeof value !== 'string') throw new TypeError('금액은 원 단위 정수로 입력해 주세요.');
    const raw = text(value).trim();
    if (!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw)) throw new TypeError('금액은 원 단위 정수로 입력해 주세요.');
    const amount = Number(raw.replace(/,/g, ''));
    if (!Number.isSafeInteger(amount)) throw new RangeError('입력 가능한 금액 범위를 초과했습니다.');
    return amount === 0 ? 0 : amount;
  }

  function calculateTotal(items) {
    let total = 0, hasAmount = false;
    for (const row of (Array.isArray(items) ? items : [])) {
      const amount = parseAmount(row && row.amount);
      if (amount == null) continue;
      hasAmount = true;
      total += amount;
      if (!Number.isSafeInteger(total)) throw new RangeError('합계가 계산 가능한 금액 범위를 초과했습니다.');
    }
    return hasAmount ? total : null;
  }

  function formatAmount(value) {
    const amount = parseAmount(value);
    return amount == null ? '' : amount.toLocaleString('ko-KR');
  }

  function dateLabel(value) {
    const raw = text(value);
    if (!raw) return '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;년&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;월&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;일';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    return match ? `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일` : escapeHtml(raw);
  }

  function renderDocument(raw) {
    const draft = normalizeDraft(raw);
    const total = calculateTotal(draft.items);
    const rows = draft.items.slice();
    while (rows.length < 7) rows.push({description:'', amount:''});
    const body = rows.map((row, i) => `<tr><td class="aw-doc-number">${i + 1}</td><td class="aw-doc-description">${lines(row.description)}</td><td class="aw-doc-amount">${formatAmount(row.amount) || '&nbsp;'}</td></tr>`).join('');
    return `<article class="aw-document" aria-label="추가공사 금액 확인서">
      <div class="aw-doc-brand">다함 인테리어</div>
      <h1 class="aw-doc-title">추가공사 금액 확인서</h1>
      <div class="aw-doc-meta">
        <div class="aw-doc-field aw-doc-site"><span class="aw-doc-label">현장명</span><span class="aw-doc-value" data-field="site">${lines(draft.site)}</span></div>
        <div class="aw-doc-field"><span class="aw-doc-label">고객명</span><span class="aw-doc-value" data-field="customer">${lines(draft.customer)}</span></div>
        <div class="aw-doc-field"><span class="aw-doc-label">작성일</span><span class="aw-doc-value" data-field="date">${dateLabel(draft.date)}</span></div>
      </div>
      <table class="aw-doc-table">
        <colgroup><col style="width:8%"><col style="width:68%"><col style="width:24%"></colgroup>
        <thead><tr><th scope="col">번호</th><th scope="col">추가공사 내용</th><th scope="col">금액(원)</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th scope="row" colspan="2" class="aw-doc-total">합계</th><td class="aw-doc-amount" data-total>${formatAmount(total) || '&nbsp;'}</td></tr></tfoot>
      </table>
      <div class="aw-doc-vat"><strong>부가세</strong><span>${draft.vat === 'included' ? '☑' : '□'} 포함</span><span>${draft.vat === 'excluded' ? '☑' : '□'} 별도</span></div>
      <section class="aw-doc-notes"><h2>비고</h2><div class="aw-doc-notes-content">${lines(draft.notes)}</div></section>
      <div class="aw-doc-confirmed"><span class="aw-doc-label">확인일</span><span class="aw-doc-value">${dateLabel(draft.confirmedOn)}</span></div>
      <div class="aw-doc-signatures"><div class="aw-doc-signature"><strong>고객</strong><span></span><small>(서명)</small></div><div class="aw-doc-signature"><strong>시공사</strong><span></span><small>(서명)</small></div></div>
    </article>`;
  }

  return {createBlankDraft, normalizeDraft, parseAmount, calculateTotal, formatAmount, renderDocument};
});
