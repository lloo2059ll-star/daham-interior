const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const portfolio=require('../portfolio-static-domain.js');

test('latest publication sorts first without changing equal-date order or caller data',()=>{
 const rows=[{slug:'old',publishedAt:'2026-09-11'},{slug:'tie-a',publishedAt:'2026-10-01'},{slug:'new',publishedAt:'2026-12-01'},{slug:'tie-b',publishedAt:'2026-10-01'}];
 assert.deepEqual(portfolio.sortProjectsNewestFirst(rows).map(x=>x.slug),['new','tie-a','tie-b','old']);
 assert.equal(rows[0].slug,'old');
 assert.equal(portfolio.listProjects()[0].slug,'okgye-samgu-trinity-51');
});

test('short initial inquiry retains the existing valid ERP payload',()=>{
 const payload=require('../website-redesign-inquiry.js').buildPayload(require('../website-public-domain.js'),{name:'김다함',phone:'01012345678',privacyConsent:true});
 assert.equal(payload.name,'김다함');assert.equal(payload.phone,'010-1234-5678');assert.equal(payload.privacy_consent,true);
});

test('all shared inquiry screens put optional details behind a closed disclosure',()=>{
 const pages=[...fs.readdirSync(root).filter(x=>x.endsWith('.html')).map(x=>path.join(root,x)),...fs.readdirSync(path.join(root,'portfolio')).filter(x=>x.endsWith('.html')).map(x=>path.join(root,'portfolio',x))];
 let checked=0;
 for(const file of pages){
  const html=fs.readFileSync(file,'utf8');if(!html.includes('id="inquiry-form"'))continue;
  const form=html.match(/<form\b[^>]*id="inquiry-form"[\s\S]*?<\/form>/)[0];
  const optional=form.match(/<details class="do-inquiry-optional"[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(optional,path.basename(file));assert.doesNotMatch(optional[0],/^<details[^>]*\bopen\b/);
  assert.match(optional[1],/name="siteName"/);assert.match(optional[1],/name="message"/);
  assert.doesNotMatch(optional[1],/name="(?:name|phone|privacyConsent)"/);
  assert.ok(form.indexOf('name="phone"')<form.indexOf('do-inquiry-optional'));
  assert.match(form,/성함과 연락처만 남겨주세요/);assert.match(form,/상담 신청하기/);
  assert.equal((form.match(/<form\b/g)||[]).length,1);checked++;
 }
 assert.equal(checked,23);
});

test('crawlable portfolio cards are newest first on every shared screen',()=>{
 const files=['index.html','portfolio.html','inquiry.html'];
 for(const file of files){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const slugs=[...html.matchAll(/<a\b[^>]*class="do-project\b[^"]*"[^>]*data-project="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(slugs,portfolio.listProjects().map(p=>p.slug),file);
  assert.equal(slugs[0],'okgye-samgu-trinity-51');assert.equal(new Set(slugs).size,17);
 }
});
