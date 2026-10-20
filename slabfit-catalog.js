(function(root){
  'use strict';
  const revision='2026-10-20-slabfit';
  const source='https://www.slabfit.co.kr/goods/goods_list.php?cateCd=001001';
  // One user-approved slab allowance. Fabrication: Daegu; site: Gumi.
  // Supplier amounts are used directly; tax is handled at contract time.
  const products=[['base-1200000','슬랩핏 12T 원장',1200000]];
  function item(sub,det,unit,lu,mu,extra){return Object.assign({sub,det,unit,lu,mu,introducedRevision:revision},extra||{});}
  const items=[
    item('세라믹 상판 원장','슬랩핏 12T (3200×1600mm)','장',0,1200000,{sourceUrl:source}),
    item('세라믹 상판 가공','워터젯 재단','m',0,19200),
    item('세라믹 상판 가공','고스라','m',0,9000),
    item('세라믹 상판 가공','하부연마·뒷도매','m',0,12000),
    item('세라믹 상판 가공','싱크 타공','개소',0,114000),
    item('세라믹 상판 가공','인덕션 타공','개소',0,54000),
    item('세라믹 상판 가공','원형 타공(50Φ 이상)','개소',0,24000),
    item('세라믹 상판 운송','A형 파렛트 운송·회수(구미)','회',0,156000),
    item('세라믹 상판 시공','기본시공','m',116000,0),
    item('세라믹 상판 시공','실측','회',100000,0),
    item('세라믹 상판 시공','구미 시외비','회',50000,0)
  ];
  function calculate(options){
    const length=Number(options.lengthMm),width=Number(options.widthMm);
    if(!Number.isFinite(length)||!Number.isFinite(width)||length<=0||width<=0)throw new Error('상판 길이와 폭을 mm로 입력하세요.');
    if(!((length<=3200&&width<=1600)||(length<=1600&&width<=3200)))throw new Error('원장 한 장(3200×1600mm)을 넘는 크기입니다. 분할·장수를 별도로 확인하세요.');
    const perimeter=Math.round(2*(length+width))/1000,installation=length/1000;
    const quantities={
      '슬랩핏 12T (3200×1600mm)':1,
      '워터젯 재단':perimeter,'고스라':perimeter,'하부연마·뒷도매':perimeter,
      '싱크 타공':1,'인덕션 타공':1,'원형 타공(50Φ 이상)':1,
      'A형 파렛트 운송·회수(구미)':1,'기본시공':installation,'실측':1,'구미 시외비':1
    };
    const labor=items.reduce((sum,i)=>sum+i.lu*quantities[i.det],0);
    const material=items.reduce((sum,i)=>sum+i.mu*quantities[i.det],0);
    return {perimeter,installation,quantities,labor,material,total:labor+material};
  }
  const api={revision,source,observedAt:'2026-10-20',products,items,calculate,fabricationRegion:'대구',siteRegion:'구미'};
  root.DAHAM_SLABFIT_CATALOG=api;
  const sink=(root.DAHAM_PRICE_CATALOG||[]).find(s=>s.name==='싱크대');
  if(sink){
    items.forEach(entry=>{if(!sink.items.some(i=>i.sub===entry.sub&&i.det===entry.det))sink.items.push(entry);});
    root.DAHAM_PRICE_CATALOG_REVISIONS=[root.DAHAM_PRICE_CATALOG_VERSION,revision];
  }
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
