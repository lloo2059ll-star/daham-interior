(function(){
  'use strict';
  const C=window.DAHAM_SLABFIT_CATALOG;
  if(!C||typeof SECTIONS==='undefined')return;
  const si=SECTIONS.findIndex(s=>s.name==='싱크대');
  function refresh(project){
    const groups={};
    SECTIONS[si].items.forEach((item,ii)=>{
      if(!item.sub.startsWith('세라믹'))return;
      const input=document.getElementById('q_'+si+'_'+ii);
      if(input){input.step=item.unit==='m'?'any':'1';input.setAttribute('aria-label',(item.det||item.sub)+' 수량('+item.unit+')');}
      const gid=itemGroupMap[si+'_'+ii];
      groups[gid]=(groups[gid]||false)||DAHAM_PRICES.itemAvailable(project,item);
      if(item.ceramicBundle){
        const row=document.getElementById('tr_'+si+'_'+ii);
        if(row)row.title='폭 1200mm · 원장 3200×1600mm. 재단: 길이+1.2m/장, 테두리: 네 변. 타공·운송·실측·시외비 각 1회 포함.';
      }
    });
    Object.entries(groups).forEach(([gid,visible])=>{
      for(const prefix of ['shdr_','crow_']){
        const row=document.getElementById(prefix+gid);
        if(row)row.hidden=!visible;
      }
    });
  }
  function onSelect(sectionIndex,ii){
    if(sectionIndex!==si)return;
    const item=SECTIONS[si].items[ii];
    if(!C.items.some(i=>i.sub===item.sub&&i.det===item.det)||item.unit==='m')return;
    const input=document.getElementById('q_'+si+'_'+ii);
    if(input){input.value='1';onQtyChange(si,ii,input);}
  }
  window.DAHAM_SLABFIT_ESTIMATE={refresh,onSelect};
  refresh(allProjects.find(p=>p.id===currentProjId));
})();
