(function(){
  'use strict';
  const C=window.DAHAM_SLABFIT_CATALOG;
  if(!C||typeof SECTIONS==='undefined')return;
  const si=SECTIONS.findIndex(s=>s.name==='싱크대');
  const body=document.getElementById('body_'+si);
  if(!body)return;
  const panel=document.createElement('div');
  panel.className='slabfit-calculator internal-only';
  panel.hidden=true;
  panel.innerHTML='<strong>세라믹 상판 자동계산</strong><p>원장 1장 120만원 · 네 변 재단·마감 · 대구 가공 / 구미 현장</p><div class="slabfit-fields"><label>상판 길이(mm)<input name="lengthMm" type="number" min="1" step="1" placeholder="예: 2000"></label><label>상판 폭(mm)<input name="widthMm" type="number" min="1" step="1" placeholder="예: 1200"></label></div><p>원장·각 타공·운송·실측·시외비는 각각 1개/1회 포함됩니다.</p><p class="slabfit-result" role="status">길이·폭을 입력하면 공정별 수량과 견적이 자동으로 바뀝니다.</p>';
  body.prepend(panel);
  const result=panel.querySelector('.slabfit-result');
  function project(){return allProjects.find(p=>p.id===currentProjId);}
  function read(){return Object.fromEntries(Array.from(panel.querySelectorAll('input')).map(el=>[el.name,el.value]));}
  function preview(dims){
    try{const calc=C.calculate(dims);result.textContent='재단·마감 각 '+calc.perimeter.toLocaleString('ko-KR')+'m / 기본시공 '+calc.installation.toLocaleString('ko-KR')+'m · 관리비 전 '+calc.total.toLocaleString('ko-KR')+'원';return calc;}
    catch(e){result.textContent=e.message;return null;}
  }
  function refresh(p){
    panel.hidden=!DAHAM_PRICES.itemAvailable(p,C.items[0]);
    const dims=p&&p.slabfitDimensions||{};
    panel.querySelectorAll('input').forEach(el=>{el.value=dims[el.name]===undefined?'':dims[el.name];});
    if(dims.lengthMm&&dims.widthMm)preview(dims);
    else result.textContent='길이·폭을 입력하면 공정별 수량과 견적이 자동으로 바뀝니다.';
  }
  panel.addEventListener('input',function(){
    const p=project();if(!p||!DAHAM_PRICES.itemAvailable(p,C.items[0]))return;
    const dims=read(),calc=preview(dims);if(!calc)return;
    p.slabfitDimensions=dims;
    SECTIONS[si].items.forEach((item,ii)=>{
      if(!C.items.some(i=>i.sub===item.sub&&i.det===item.det))return;
      const qty=calc.quantities[item.det],input=document.getElementById('q_'+si+'_'+ii);
      if(!input)return;
      input.value=qty>0?String(qty):'';
      const chip=document.getElementById('chip_'+si+'_'+ii),row=document.getElementById('tr_'+si+'_'+ii);
      if(chip)chip.classList.toggle('selected',qty>0);
      if(row)row.style.display=qty>0?'table-row':'none';
      onQtyChange(si,ii,input);
    });
    scheduleSave();
  });
  window.DAHAM_SLABFIT_ESTIMATE={refresh};
  refresh(project());
})();
