(function () {
  'use strict';

  async function initialize() {
    const status = document.getElementById('status');
    const announce = (message, isError = false) => {
      status.textContent = message;
      status.classList.toggle('is-error', isError);
    };
    try {
      if (!window.DAHAM_AUTH || !(await window.DAHAM_AUTH.ready)) return;
      const user = window.DAHAM_AUTH.currentUser();
      if (!user || !user.id) {
        announce('로그인 정보를 확인할 수 없습니다. ERP 홈에서 다시 로그인해 주세요.', true);
        return;
      }
      const domain = window.DAHAM_ADDITIONAL_WORK;
      if (!domain) throw new Error('문서 기능을 불러오지 못했습니다. 새로고침해 주세요.');
      const storageKey = 'daham_additional_work_draft_v1:' + encodeURIComponent(user.id);
      const form = document.getElementById('draft-form');
      const rows = document.getElementById('item-rows');
      const preview = document.getElementById('document-preview');
      const previewError = document.getElementById('preview-error');
      const totalError = document.getElementById('total-error');
      const printButton = document.getElementById('print-filled');
      const printRoot = document.getElementById('print-root');
      const fields = ['site', 'customer', 'date', 'vat', 'notes', 'confirmedOn'];
      let draft = domain.createBlankDraft();
      let canPrint = true;

      function refreshPreview() {
        let invalid = false;
        draft.items.forEach((item, index) => {
          const input = document.getElementById('item-amount-' + index);
          const error = document.getElementById('item-error-' + index);
          let message = '';
          try { domain.parseAmount(item.amount); }
          catch (_) { message = '원 단위 정수를 입력해 주세요. 예: 1,000 / -1,000'; invalid = true; }
          input.setAttribute('aria-invalid', String(Boolean(message)));
          error.textContent = message;
          error.hidden = !message;
        });
        let total = null;
        let sumMessage = '';
        if (!invalid) {
          try { total = domain.calculateTotal(draft.items); }
          catch (_) { invalid = true; sumMessage = '합계가 계산 가능한 금액 범위를 초과했습니다. 금액을 확인해 주세요.'; }
        }
        totalError.textContent = sumMessage;
        totalError.hidden = !sumMessage;
        document.getElementById('editor-total').textContent = invalid ? '금액 확인 필요' : total === null ? '—' : domain.formatAmount(total) + ' 원';
        canPrint = !invalid;
        printButton.disabled = invalid;
        previewError.hidden = !invalid;
        previewError.textContent = invalid ? '금액을 확인해 주세요. 올바른 금액을 입력하면 미리보기와 작성본 인쇄를 사용할 수 있습니다. 빈 양식은 출력할 수 있습니다.' : '';
        preview.hidden = invalid;
        if (!invalid) preview.innerHTML = domain.renderDocument(draft);
      }

      function makeRows() {
        rows.replaceChildren();
        draft.items.forEach((item, index) => {
          const row = document.createElement('div');
          row.className = 'aw-item-row';
          const number = document.createElement('span');
          number.className = 'aw-row-number';
          number.textContent = String(index + 1).padStart(2, '0');
          number.setAttribute('aria-hidden', 'true');
          const descriptionGroup = document.createElement('div');
          const descriptionLabel = document.createElement('label');
          descriptionLabel.className = 'aw-row-label';
          descriptionLabel.htmlFor = 'item-description-' + index;
          descriptionLabel.textContent = '공사 내용 ' + (index + 1);
          const description = document.createElement('textarea');
          description.id = descriptionLabel.htmlFor;
          description.rows = 1;
          description.value = item.description;
          description.addEventListener('input', () => { item.description = description.value; refreshPreview(); });
          descriptionGroup.append(descriptionLabel, description);
          const amountGroup = document.createElement('div');
          const amountLabel = document.createElement('label');
          amountLabel.className = 'aw-row-label';
          amountLabel.htmlFor = 'item-amount-' + index;
          amountLabel.textContent = '금액 ' + (index + 1) + ' (원)';
          const amount = document.createElement('input');
          amount.type = 'text';
          amount.id = amountLabel.htmlFor;
          amount.value = item.amount;
          amount.autocomplete = 'off';
          amount.spellcheck = false;
          amount.setAttribute('aria-describedby', 'amount-help item-error-' + index);
          const error = document.createElement('p');
          error.className = 'aw-error';
          error.id = 'item-error-' + index;
          error.hidden = true;
          amount.addEventListener('input', () => { item.amount = amount.value; refreshPreview(); });
          amountGroup.append(amountLabel, amount, error);
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'aw-row-remove';
          remove.textContent = '×';
          remove.setAttribute('aria-label', '공사 내역 ' + (index + 1) + ' 삭제');
          remove.disabled = draft.items.length === 1;
          remove.addEventListener('click', () => {
            if (draft.items.length <= 1) return;
            if ((item.description || item.amount) && !window.confirm('이 내역을 삭제할까요?')) return;
            draft.items.splice(index, 1);
            makeRows();
            refreshPreview();
            document.getElementById('add-row').focus();
          });
          row.append(number, descriptionGroup, amountGroup, remove);
          rows.append(row);
        });
      }

      function setDraft(value) {
        draft = domain.normalizeDraft(value);
        if (!draft.items.length) draft.items.push({ description: '', amount: '' });
        fields.forEach(key => { document.getElementById(key).value = draft[key]; });
        makeRows();
        refreshPreview();
      }
      function hasData() {
        return fields.some(key => draft[key] !== '') || draft.items.some(item => item.description !== '' || item.amount !== '');
      }
      function printDraft(value) {
        try {
          printRoot.innerHTML = domain.renderDocument(value);
          window.print();
        } catch (_) { announce('인쇄를 준비하지 못했습니다. 입력한 내용을 확인한 후 다시 시도해 주세요.', true); }
      }

      form.addEventListener('submit', event => event.preventDefault());
      fields.forEach(key => {
        document.getElementById(key).addEventListener('input', event => {
          draft[key] = event.target.value;
          refreshPreview();
        });
      });
      document.getElementById('add-row').addEventListener('click', () => {
        draft.items.push({ description: '', amount: '' });
        makeRows();
        refreshPreview();
        document.getElementById('item-description-' + (draft.items.length - 1)).focus();
      });
      document.getElementById('save-draft').addEventListener('click', () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(draft));
          announce('이 브라우저에 임시저장했습니다.');
        } catch (_) { announce('임시저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.', true); }
      });
      document.getElementById('load-draft').addEventListener('click', () => {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved === null) { announce('이 브라우저에 저장된 양식이 없습니다.'); return; }
          const parsed = JSON.parse(saved);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.items)) throw new Error('Invalid draft');
          const loaded = domain.normalizeDraft(parsed);
          if (hasData() && JSON.stringify(loaded) !== JSON.stringify(draft) && !window.confirm('입력 중인 내용을 저장된 양식으로 바꿀까요?')) return;
          setDraft(loaded);
          announce('이 브라우저에 임시저장된 양식을 불러왔습니다.');
        } catch (_) { announce('양식을 불러오지 못했습니다. 저장된 데이터 또는 브라우저 설정을 확인해 주세요.', true); }
      });
      document.getElementById('new-draft').addEventListener('click', () => {
        if (hasData() && !window.confirm('입력 중인 내용을 지우고 새 양식을 만들까요?')) return;
        setDraft(domain.createBlankDraft());
        announce('새 빈 양식을 열었습니다.');
      });
      document.getElementById('print-blank').addEventListener('click', () => printDraft(domain.createBlankDraft()));
      printButton.addEventListener('click', () => { if (canPrint) printDraft(draft); });
      // Also make the browser's own print command use the current valid draft.
      window.addEventListener('beforeprint', () => {
        if (!printRoot.childElementCount && canPrint) printRoot.innerHTML = domain.renderDocument(draft);
      });
      window.addEventListener('afterprint', () => { printRoot.replaceChildren(); });
      setDraft(draft);
      document.getElementById('editor-fields').disabled = false;
      ['print-blank', 'save-draft', 'load-draft', 'new-draft'].forEach(id => { document.getElementById(id).disabled = false; });
      document.getElementById('workspace').setAttribute('aria-busy', 'false');
      announce('이 브라우저에 임시저장됩니다.');
    } catch (error) {
      announce(error.message || '확인서를 열지 못했습니다. 새로고침해 주세요.', true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
