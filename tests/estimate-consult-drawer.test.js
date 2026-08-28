const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','estimate.html'),'utf8');

test('estimate keeps its layout and adds a read only consultation drawer',()=>{
  for(const marker of ['consult-reference-btn','consult-reference-drawer','openConsultReference','closeConsultReference']) assert.match(html,new RegExp(marker));
  assert.match(html,/상담 내용 참조/);
  assert.match(html,/READ ONLY/);
});

test('only exact central mapping results are applied to estimate quantity inputs',()=>{
  assert.match(html,/DAHAM_CONSULT_ESTIMATE\.autoItems/);
  assert.match(html,/q_\$\{si\}_\$\{ii\}/);
  assert.doesNotMatch(html,/includes\([^)]*(도배|바닥|중문)/);
});

