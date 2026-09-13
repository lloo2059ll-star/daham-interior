const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Modal=require('../consult-modal.js');
test('new consultation defaults to Choi while existing assigned manager is preserved',()=>{
  assert.match(Modal.buildBody(null),/id="f-manager"[^>]*value="최일성"/);
  assert.match(Modal.buildBody({manager:'다른 담당자'}),/id="f-manager"[^>]*value="다른 담당자"/);
});
test('website imports save the default manager without changing existing consultations',()=>{
  const dir=path.join(__dirname,'../supabase/migrations');
  const name=fs.readdirSync(dir).find(x=>x.endsWith('_website_inquiry_default_manager.sql'));
  const sql=fs.readFileSync(path.join(dir,name),'utf8');
  assert.match(sql,/'manager', '최일성'/);
  assert.doesNotMatch(sql,/update public\.sync_data/);
});

