(function(){
  'use strict';
  const C=window.DAHAM_SLABFIT_CATALOG;
  if(!C||typeof SECTIONS==='undefined')return;
  const si=SECTIONS.findIndex(s=>s.name==='싱크대'),body=document.getElementById('body_'+si);
  if(!body)return;
  const panel=document.createElement('div');
  panel.className='slabfit-manual internal-only';panel.hidden=true;
  panel.innerHTML='<strong>세라믹 상판</strong><p>m 항목은 아래 수량 칸에 0.01, 0.1처럼 각각 직접 입력하세요. 장·개소·회 항목은 1씩 들어갑니다.</p><button type="button">세라믹 상판 항목 넣기</button>';
  body.prepend(panel);
  function project(){return allProjects.find(p=>p.id===currentProjId);}
  function isCeramic(item){return C.items.some(i=>i.sub===item.sub&&i.det===item.det);}
  function expose(ii){
    const chip=document.getElementById('chip_'+si+'_'+ii),row=document.getElementById('tr_'+si+'_'+ii);
    if(chip)chip.classList.add('selected');
    if(row)row.style.display='table-row';
    const gid=itemGroupMap[si+'_'+ii],crow=document.getElementById('crow_'+gid);
    if(crow)crow.style.display='table-row';
  }
  function refresh(p){
    panel.hidden=!DAHAM_PRICES.itemAvailable(p,C.items[0]);
    SECTIONS[si].items.forEach((item,ii)=>{
      if(!isCeramic(item))return;
      const input=document.getElementById('q_'+si+'_'+ii);
      if(input){input.step=item.unit==='m'?'any':'1';input.min='0';input.setAttribute('aria-label',item.det+' 수량('+item.unit+')');}
    });
  }
  function onSelect(sectionIndex,ii){
    if(sectionIndex!==si)return;
    const item=SECTIONS[si].items[ii],p=project();
    if(!p||!isCeramic(item)||!DAHAM_PRICES.itemAvailable(p,item)||item.unit==='m')return;
    const input=document.getElementById('q_'+si+'_'+ii);
    if(input){input.value='1';onQtyChange(si,ii,input);}
  }
  panel.querySelector('button').addEventListener('click',function(){
    const p=project();if(!p||!DAHAM_PRICES.itemAvailable(p,C.items[0]))return;
    SECTIONS[si].items.forEach((item,ii)=>{
      if(!isCeramic(item))return;
      const input=document.getElementById('q_'+si+'_'+ii);if(!input)return;
      if(item.unit!=='m')input.value='1';
      expose(ii);onQtyChange(si,ii,input);
    });
  });
  window.DAHAM_SLABFIT_ESTIMATE={refresh,onSelect};
  refresh(project());
})();
