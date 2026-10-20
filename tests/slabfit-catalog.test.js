const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function load(files){const ctx={};vm.createContext(ctx);for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);return ctx;}
const old=load(['price-catalog.js','price-management.js']);
const current=load(['price-catalog.js','slabfit-catalog.js','price-management.js']);
const C=current.DAHAM_SLABFIT_CATALOG, P=current.DAHAM_PRICES;
const sink=current.DAHAM_PRICE_CATALOG.find(s=>s.name==='싱크대');
const newProject={priceCatalogVersion:current.DAHAM_PRICE_CATALOG_VERSION,priceCatalogRevisions:Array.from(current.DAHAM_PRICE_CATALOG_REVISIONS)};
test('ceramic material selection contains only the approved 1200000 slab',()=>{
  assert.equal(C.products.length,1);
  const slabs=C.items.filter(i=>i.sub==='세라믹 상판 원장');
  assert.equal(slabs.length,1);
  assert.equal(slabs[0].mu,1200000);
  assert.equal(slabs[0].unit,'장');
  assert.equal(slabs[0].lu,0);
  assert.ok(slabs[0].sourceUrl.startsWith('https://www.slabfit.co.kr/'));
  assert.ok(C.items.every(i=>!/VAT|부가세/.test(i.sub+' '+i.det)));
});
test('photo rates retain Daegu fabrication, Gumi transport and installation amounts without mixing cities',()=>{
  const find=prefix=>C.items.find(i=>i.det.startsWith(prefix));
  assert.equal(find('워터젯 재단').mu,19200);
  assert.equal(find('고스라').mu,9000);
  assert.equal(find('하부연마·뒷도매').mu,12000);
  assert.equal(find('싱크 타공').mu,114000);
  assert.equal(find('인덕션 타공').mu,54000);
  assert.equal(find('A형 파렛트').mu,156000);
  assert.equal(find('기본시공').lu,116000);
  assert.equal(find('기본시공').unit,'m');
  assert.equal(find('실측').lu,100000);
  assert.equal(find('구미 시외비').lu,50000);
  assert.equal(find('원형 타공').mu,24000);
  assert.equal(C.fabricationRegion,'대구');
  assert.equal(C.siteRegion,'구미');
});
test('ceramic items are available only on new revision estimates while prior carpentry remains available',()=>{
  assert.ok(C.items.every(i=>P.itemAvailable(newProject,i)));
  assert.ok(C.items.every(i=>!P.itemAvailable({},i)));
  assert.ok(C.items.every(i=>!P.itemAvailable({priceCatalogVersion:current.DAHAM_PRICE_CATALOG_VERSION},i)));
  const carpentry=current.DAHAM_PRICE_CATALOG.find(s=>s.name==='목작업');
  const ac=carpentry.items.find(i=>i.det==='에어컨 단내림');
  assert.equal(P.itemAvailable(newProject,ac),true);
  const tv=carpentry.items.find(i=>i.det==='반매립');
  assert.equal(P.priceForProject(newProject,carpentry,tv,{}).labor,250000);
});
test('adding ceramic choices leaves every existing catalog item, stable key and estimate amount unchanged',()=>{
  old.DAHAM_PRICE_CATALOG.forEach(s=>{
    const next=current.DAHAM_PRICE_CATALOG.find(n=>n.name===s.name);
    s.items.forEach((i,index)=>{
      assert.deepEqual(JSON.parse(JSON.stringify(next.items[index])),JSON.parse(JSON.stringify(i)));
      const project={id:'old',qtys:{[P.quantityKey(s,i)]:2},margins:{profit:'15'}};
      assert.equal(P.projectTotal(project,current.DAHAM_PRICE_CATALOG,{}),old.DAHAM_PRICES.projectTotal(project,old.DAHAM_PRICE_CATALOG,{}));
    });
  });
});
test('one slab plus independent measured fabrication and installation quantities are not charged automatically',()=>{
  const slab=C.items.find(i=>i.sub==='세라믹 상판 원장');
  const install=C.items.find(i=>i.det.startsWith('기본시공'));
  const project={...newProject,qtys:{[P.quantityKey(sink,slab)]:1,[P.quantityKey(sink,install)]:3}};
  assert.equal(P.projectTotal(project,current.DAHAM_PRICE_CATALOG,{}),1780200);
  assert.equal(P.projectTotal({...newProject,qtys:{}},current.DAHAM_PRICE_CATALOG,{}),0);
});

test('2600 by 1200 island uses 7.6m for all four cut and finished edges, not the 2.6m installation length',()=>{
  const rows=C.items.map(i=>({item:i,qty:i.unit==='m'?(i.sub==='세라믹 상판 가공'?7.6:2.6):1}));
  const labor=rows.reduce((sum,r)=>sum+r.qty*r.item.lu,0);
  const material=rows.reduce((sum,r)=>sum+r.qty*r.item.mu,0);
  assert.equal(labor,451600);
  assert.equal(material,1853520);
  assert.equal(labor+material,2305120);
  assert.equal(C.items.filter(i=>/하부연마|뒷도매/.test(i.det)).length,1);
  const qtys=Object.fromEntries(rows.map(r=>[P.quantityKey(sink,r.item),r.qty]));
  assert.equal(P.projectTotal({...newProject,qtys,margins:{profit:'15'}},current.DAHAM_PRICE_CATALOG,{}),2650900);
});

test('changing island dimensions recalculates fabrication perimeter independently of installation length',()=>{
  const large=C.calculate({lengthMm:2600,widthMm:1200});
  const small=C.calculate({lengthMm:2000,widthMm:1200});
  assert.equal(large.perimeter,7.6);
  assert.equal(large.installation,2.6);
  assert.equal(large.total,2305120);
  assert.equal(small.perimeter,6.4);
  assert.equal(small.installation,2);
  assert.equal(small.total,2187280);
  assert.equal(small.quantities['싱크 타공'],1);
  assert.equal(small.quantities['워터젯 재단'],6.4);
  assert.equal(small.quantities['기본시공'],2);
  for(const i of C.items.filter(i=>i.unit!=='m'))assert.equal(small.quantities[i.det],1);
  assert.throws(()=>C.calculate({lengthMm:0,widthMm:1200}),/길이/);
  assert.throws(()=>C.calculate({lengthMm:4000,widthMm:1200}),/원장 한 장/);
});
