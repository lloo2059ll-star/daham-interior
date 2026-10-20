const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cp=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
function context(before=false){
  const ctx={};vm.createContext(ctx);
  for(const f of ['price-catalog.js','slabfit-catalog.js','price-management.js']){
    const source=before?cp.execFileSync('git',['show','2d38fac:'+f],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,f),'utf8');
    vm.runInContext(source,ctx);
  }return ctx;
}
const ctx=context(),P=ctx.DAHAM_PRICES,C=ctx.DAHAM_SLABFIT_CATALOG;
const sink=ctx.DAHAM_PRICE_CATALOG.find(s=>s.name==='싱크대');
const fresh={priceCatalogRevisions:Array.from(ctx.DAHAM_PRICE_CATALOG_REVISIONS)};
test('new quotes show exactly one ceramic row instead of the component picker',()=>{
  const visible=sink.items.filter(i=>i.sub.startsWith('세라믹')&&P.itemAvailable(fresh,i));
  assert.equal(visible.length,1);
  assert.equal(visible[0].unit,'m');
  assert.equal(visible[0].det,'');
});
test('2600 by 1200 cuts two sides, finishes four edges and installs 2.6 metres',()=>{
  const r=C.calculate(2.6);
  assert.equal(r.quantities['워터젯 재단'],3.8);
  assert.equal(r.quantities['고스라'],7.6);
  assert.equal(r.quantities['하부연마·뒷도매'],7.6);
  assert.equal(r.quantities['시공'],2.6);
  assert.equal(r.labor,451600);
  assert.equal(r.material,1780560);
  assert.equal(r.total,2232160);
});
test('short lengths still buy a whole slab and every fixed item once, with no minimum installation',()=>{
  for(const [q,total] of [[1,1948640],[0.1,1789160],[0.01,1773212],[0,0]]){
    const r=C.calculate(q);assert.equal(r.total,total);
    assert.equal(r.quantities['슬랩핏 12T (3200×1600mm)'],q>0?1:0);
    for(const name of ['싱크 타공','인덕션 타공','원형 타공(50Φ 이상)','A형 파렛트 운송·회수(구미)','실측','구미 시외비'])assert.equal(r.quantities[name],q>0?1:0);
  }
  assert.throws(()=>C.calculate(-1));assert.throws(()=>C.calculate(Infinity));
});
test('length beyond one 3200 slab buys a second slab without doubling holes and travel',()=>{
  const r=C.calculate(4);
  assert.equal(r.quantities['슬랩핏 12T (3200×1600mm)'],2);
  assert.equal(r.quantities['워터젯 재단'],6.4);
  assert.equal(r.quantities['고스라'],12.8);
  assert.equal(r.quantities['싱크 타공'],1);
  assert.equal(r.total,3753680);
});
test('shared estimate pricing agrees with bundle breakdown including profit and saved rates',()=>{
  const item=sink.items.find(i=>i.ceramicBundle);
  assert.ok(item,'bundle item exists');
  const quote={...fresh,qtys:{[P.quantityKey(sink,item)]:2.6},margins:{profit:'15'}};
  assert.equal(P.projectTotal(quote,ctx.DAHAM_PRICE_CATALOG,{}),2566960);
  P.snapshotSelection(quote,sink,item,{});
  assert.equal(P.projectTotal(quote,ctx.DAHAM_PRICE_CATALOG,{}),2566960);
  quote.qtys[P.quantityKey(sink,item)]=0;
  assert.equal(P.projectTotal(quote,ctx.DAHAM_PRICE_CATALOG,{}),0);
});
test('every previously available component and amount remains unchanged for prior quotes',()=>{
  const old=context(true),OP=old.DAHAM_PRICES;
  for(const sec of old.DAHAM_PRICE_CATALOG){
    for(const item of sec.items){
      const p={id:'old',priceCatalogRevisions:['2026-10-20-carpentry','2026-10-20-slabfit'],qtys:{[OP.quantityKey(sec,item)]:2.6},margins:{profit:'15'}};
      assert.equal(P.projectTotal(p,ctx.DAHAM_PRICE_CATALOG,{}),OP.projectTotal(p,old.DAHAM_PRICE_CATALOG,{}),item.sub+' '+item.det);
      const next=ctx.DAHAM_PRICE_CATALOG.find(s=>s.name===sec.name).items.find(i=>P.itemKey(sec,i)===OP.itemKey(sec,item));
      assert.equal(P.itemAvailable(p,next),OP.itemAvailable(p,item));
    }
  }
});
