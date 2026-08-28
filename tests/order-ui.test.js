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
  ['타일·도기·욕실악세사리','조명·스위치·콘센트','도배지','목자재','기타'].forEach(x=>assert.match(js,new RegExp(x)));
  ['품목명','규격·옵션','수량','단위','납기·비고'].forEach(x=>assert.match(js,new RegExp(x)));
});

test('legacy order payload and price fields are preserved while editing',()=>{
  assert.match(js,/Object\.assign\(\{\},editingRecord/);
  assert.match(js,/Object\.assign\(\{\},oldItem/);
  assert.doesNotMatch(js,/delete\s+[^;]*(price|amount|vat|total)/i);
});

test('site and estimate linking uses stable ids and no wallpaper formula is invented',()=>{
  assert.match(js,/site\.estimateId/); assert.match(js,/estimate\.id===site\.estimateId/);
  assert.match(js,/sec===['"]도배['"]/); assert.doesNotMatch(js,/1\.1|10\s*%|Math\.ceil/);
});

test('sharing excludes entry codes unless explicitly included',()=>{
  assert.match(js,/includeEntry/); assert.match(js,/if\(includeEntry\)/);
  assert.match(js,/Kakao\.Share\.sendDefault/); assert.match(js,/navigator\.clipboard/);
});

test('tablet layout remains inside the viewport',()=>{
  assert.match(css,/@media[^\{]*max-width:\s*1100px/);
  assert.match(css,/grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.doesNotMatch(css,/overflow-x\s*:\s*hidden/);
});

