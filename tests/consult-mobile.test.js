const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');
test('mobile ERP offers direct consultation access and consultation detail navigation',()=>{
  const consult=fs.readFileSync(path.join(__dirname,'../consult.html'),'utf8');
  const erp=fs.readFileSync(path.join(__dirname,'../erp.html'),'utf8');
  assert.match(erp,/class="mobile-consult-entry" href="consult.html"/);
  assert.match(consult,/class="consult-mobile-nav"/);
  assert.match(consult,/id="consult-survey"/);
  assert.match(consult,/scrollIntoView\(\{block:'start'\}\)/);
  assert.match(consult,/\.operations-consult \.consult-workspace\{display:block/);
});
