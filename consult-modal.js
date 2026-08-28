(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DAHAM_CONSULT_MODAL = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function selected(value, option) {
    return value === option ? ' selected' : '';
  }

  function selectOptions(values, value, placeholder) {
    var html = placeholder == null ? '' : '<option value="">' + esc(placeholder) + '</option>';
    return html + values.map(function (option) {
      return '<option value="' + esc(option) + '"' + selected(value, option) + '>' + esc(option) + '</option>';
    }).join('');
  }

  function buildBody(record, additions) {
    var r = record || {};
    var survey = r.survey || {};
    var extra = additions || {};
    var scopePicker = extra.scopePicker || '';
    var scopeOptions = extra.scopeOptions || '';
    var photos = Array.isArray(survey.photoUrls) ? survey.photoUrls.join('\n') : '';

    return '<div class="consult-modal-layout">'
      + '<div class="consult-modal-main-grid">'
      + '<div class="consult-modal-left">'
      + '<section class="consult-form-card consult-registration-card"><h3><span>♙</span> 상담 등록</h3>'
      + '<div class="form-row"><label>상담 제목</label><input id="f-consult-title" placeholder="상담 제목을 입력하세요" value="' + esc(r.consultTitle) + '"></div>'
      + '<div class="form-row"><label>상담 내용</label><textarea id="f-consult-content" class="consult-content-input" placeholder="상담 내용을 입력하세요">' + esc(r.consultContent) + '</textarea></div></section>'
      + '<section class="consult-form-card consult-schedule-card"><h3><span>▣</span> 상담 일정</h3>'
      + '<div class="form-grid"><div class="form-row"><label>상담 날짜</label><input id="f-sdate" type="date" value="' + esc(r.schedDate) + '"></div>'
      + '<div class="form-row"><label>상담 시간</label><input id="f-stime" type="time" value="' + esc(r.schedTime) + '"></div></div>'
      + '<div class="form-row"><label>상담 장소</label><select id="f-splace">' + selectOptions(['현장 방문','사무실 방문','전화 상담','화상 상담','기타'], r.schedPlace, '-- 선택 --') + '</select></div></section>'
      + '</div>'
      + '<div class="consult-modal-right">'
      + '<section class="consult-form-card consult-customer-card"><h3><span>▦</span> 고객 정보</h3>'
      + '<div class="consult-customer-grid">'
      + '<div class="form-row"><label>고객명</label><input id="f-name" placeholder="홍길동" value="' + esc(r.name) + '"></div>'
      + '<div class="form-row"><label>연락처</label><input id="f-tel" type="tel" placeholder="010-0000-0000" value="' + esc(r.tel) + '"></div>'
      + '<div class="form-row"><label>예비 연락처</label><input id="f-alt-tel" type="tel" placeholder="010-0000-0000" value="' + esc(r.altTel || r.phone2) + '"></div>'
      + '<div class="form-row"><label>이메일</label><input id="f-email" type="email" placeholder="example@email.com" value="' + esc(r.email) + '"></div>'
      + '<div class="form-row consult-address-field"><label>주소</label><div class="consult-address-line"><input id="f-postcode" inputmode="numeric" placeholder="우편번호" value="' + esc(r.postcode || r.zip) + '"><input id="f-addr" placeholder="주소 검색 또는 직접 입력" value="' + esc(r.addr) + '"><button type="button" class="address-search" onclick="openAddressSearch()">주소 검색</button></div></div>'
      + '<div class="form-row consult-detail-address"><label>상세주소</label><input id="f-addr-detail" placeholder="상세주소, 동/호수 입력" value="' + esc(r.addrDetail) + '"></div>'
      + '<div class="form-row"><label>평형(평)</label><input id="f-area" inputmode="decimal" placeholder="32" value="' + esc(r.area) + '" oninput="syncConsultArea(this.value,\'f-area\')"></div>'
      + '<div class="form-row"><label>담당자</label><input id="f-manager" placeholder="담당자" value="' + esc(r.manager) + '"></div>'
      + '</div></section>'
      + '<div class="consult-modal-lower-grid">'
      + '<section class="consult-form-card consult-project-card"><h3><span>▤</span> 프로젝트 정보</h3>'
      + '<div class="consult-project-grid"><div class="form-row"><label>현장명</label><input id="f-site-name" placeholder="건물명 또는 현장명" value="' + esc(r.siteName) + '"></div>'
      + '<div class="form-row"><label>동/호수</label><input id="f-unit" placeholder="101동 1201호" value="' + esc(r.unit || r.addrDetail) + '"></div>'
      + '<div class="form-row"><label>평형</label><input id="f-project-area" placeholder="32평" value="' + esc(r.area) + '" oninput="syncConsultArea(this.value,\'f-project-area\')"></div>'
      + '<div class="form-row"><label>준공연도</label><input id="f-build-year" inputmode="numeric" placeholder="2015" value="' + esc(r.buildYear) + '"></div>'
      + '<div class="form-row"><label>주거 형태</label><select id="f-housing-type">' + selectOptions(['아파트','주상복합','빌라/연립','단독주택','오피스텔','기타'], r.housingType, '-- 선택 --') + '</select></div>'
      + '<div class="form-row"><label>특이사항</label><input id="f-survey-note" placeholder="특이사항을 입력하세요" value="' + esc(survey.note) + '"></div></div></section>'
      + '<section class="consult-form-card consult-memo-card"><h3><span>▱</span> 메모</h3><div class="form-row"><textarea id="f-memo" maxlength="500" placeholder="메모를 입력하세요">' + esc(r.memo) + '</textarea><small class="consult-char-count">0/500</small></div></section>'
      + '</div></div></div>'
      + '<section class="consult-form-card consult-history-card"><h3><span>◴</span> 상담 단계 이력</h3><div id="hist-section"></div></section>'
      + '<section class="consult-form-card consult-existing-details"><h3><span>✓</span> 상담 상세 정보</h3>'
      + '<div class="consult-detail-field-grid"><div class="form-row"><label>예산</label><input id="f-budget" placeholder="5,000 ~ 7,000만원" value="' + esc(r.budget) + '"></div>'
      + '<div class="form-row"><label>이사 예정일</label><input id="f-movedate" type="date" value="' + esc(r.moveDate) + '"></div>'
      + '<div class="form-row"><label>유입경로</label><select id="f-source">' + selectOptions(['소개','온라인 검색','블로그/SNS','기존 고객','기타'], r.source, '-- 선택 --') + '</select></div>'
      + '<div class="form-row"><label>현장 방문일</label><input id="f-visit-date" type="datetime-local" value="' + esc(survey.visitDate) + '"></div></div>'
      + '<input id="f-works" type="hidden" value="' + esc(r.works) + '"><div class="scope-picker">' + scopePicker + '</div><div id="scope-option-area">' + scopeOptions + '</div>'
      + '<div class="consult-survey-grid"><label class="consult-check"><input id="f-measured" type="checkbox"' + (survey.measured ? ' checked' : '') + '> 실측 완료</label>'
      + '<label class="consult-check"><input id="f-polycam-done" type="checkbox"' + (survey.polycamDone ? ' checked' : '') + '> Polycam 완료</label>'
      + '<div class="form-row"><label>Polycam 링크</label><input id="f-polycam-url" type="url" placeholder="https://poly.cam/..." value="' + esc(survey.polycamUrl) + '"></div>'
      + '<div class="form-row consult-photo-urls"><label>현장 사진 링크</label><textarea id="f-photo-urls" placeholder="사진 URL을 줄바꿈으로 입력">' + esc(photos) + '</textarea></div></div>'
      + '</section></div>';
  }

  return { buildBody: buildBody, escapeHtml: esc };
});

