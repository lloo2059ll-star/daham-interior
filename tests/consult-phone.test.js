const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const assert=require('node:assert/strict');
test('consultation phone links preserve display text and accept telephone characters only',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../consult.html'),'utf8');
  const block=source.match(/function renderConsultPhone\(value\)\{[\s\S]*?\n\}/);
  assert.ok(block,'phone renderer exists');
  const context={escHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')};
  vm.createContext(context);vm.runInContext(block[0],context);
  assert.match(context.renderConsultPhone('010-1234-5678'),/href="tel:01012345678"/);
  assert.match(context.renderConsultPhone('+82 10 1234 5678'),/href="tel:\+821012345678"/);
  assert.equal(context.renderConsultPhone(''), '—');
  assert.equal(context.renderConsultPhone('javascript:12345678'),'javascript:12345678');
  assert.equal(context.renderConsultPhone('010<script>'), '010&lt;script>');
  assert.match(source,/renderConsultPhone\(r.tel\)/);
  assert.match(source,/renderConsultPhone\(r.altTel\|\|r.phone2\)/);
});
