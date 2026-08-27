
(function(){
  'use strict';
  if(window.__DAHAM_V2_SUITE__) return;
  window.__DAHAM_V2_SUITE__ = true;

  function markActiveHomeLinks(){
    const name=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    document.querySelectorAll('a[href]').forEach(a=>{
      const href=(a.getAttribute('href')||'').split('?')[0].split('#')[0].toLowerCase();
      if(href && href===name) a.setAttribute('aria-current','page');
    });
  }

  function normalizeMoneyInputs(){
    document.querySelectorAll('input[inputmode="numeric"]').forEach(el=>{
      if(el.dataset.v2MoneyBound) return;
      el.dataset.v2MoneyBound='1';
      el.addEventListener('blur',()=>{
        const raw=(el.value||'').replace(/,/g,'').trim();
        if(raw!=='' && /^-?\d+(\.\d+)?$/.test(raw)){
          const n=Number(raw);
          if(Number.isFinite(n)) el.value=Math.round(n).toLocaleString('ko-KR');
        }
      });
      el.addEventListener('focus',()=>{ el.value=(el.value||'').replace(/,/g,''); });
    });
  }

  function init(){
    try{markActiveHomeLinks();normalizeMoneyInputs();}catch(e){console.warn('DAHAM V2 suite:',e)}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
