const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'order.html'),'utf8');
const js=fs.readFileSync(path.join(root,'order-v2.js'),'utf8');
const css=fs.readFileSync(path.join(root,'order-v2.css'),'utf8');

test('order writer loads the redesigned application',()=>{
  assert.match(html,/order-v2\.css/); assert.match(html,/order-v2\.js/);
  assert.match(html,/order-domain\.js/);
  ['일반 발주','견적 발주','현장 주소','공동현관 비밀번호','세대 현관 비밀번호','현장 담당자','담당자 전화번호','보조 연락처','배송기사 전달사항','발주 내용'].forEach(x=>assert.match(js,new RegExp(x)));
});

test('legacy order payload and price fields are preserved while editing',()=>{
  assert.match(js,/Object\.assign\(\{\},editingRecord/);
  assert.match(js,/legacyContent\(r\)/);
  assert.doesNotMatch(js,/delete\s+[^;]*(price|amount|vat|total)/i);
});

test('site and estimate linking imports trade names only and never auto-fills order content',()=>{
  assert.match(js,/s\.estimateId/); assert.match(js,/e\.id\)===String\(s\.estimateId/);
  assert.match(js,/generalTrades\(currentEstimate\(\)\)/);
  assert.doesNotMatch(js,/KCC 완성창\\n\\n외창 26/);
  assert.doesNotMatch(js,/1\.1|10\s*%|Math\.ceil/);
});

test('sharing excludes entry codes unless explicitly included',()=>{
  assert.match(js,/includeEntry/); assert.match(js,/if\(includeEntry\)/);
  assert.match(js,/navigator\.share/); assert.match(js,/navigator\.clipboard/);
  assert.doesNotMatch(js,/window\.print/);
});

test('window quote quick insertion enforces brands and types while preserving free text',()=>{
  ['KCC','LX','영림','대우하이원','제작창','완성창','외창이중창','외창단창','내창이중창','내창단창','분합창','터닝도어','픽스창','기타'].forEach(x=>assert.match(js,new RegExp(x)));
  assert.match(js,/windowModes/);
  assert.match(js,/quote-content/);
  assert.match(js,/insert-brand-mode/);
});

test('orders are restored from remote sync storage after login',()=>{
  assert.match(js,/function readRemote/);
  assert.match(js,/readRemote\(\)\.then\(renderList\)/);
});

test('tablet layout remains inside the viewport',()=>{
  assert.match(css,/@media[^\{]*max-width:\s*1100px/);
  assert.match(css,/grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/overflow-x\s*:\s*hidden/);
});


