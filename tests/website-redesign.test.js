const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const site=require('../website-public-domain.js');
test('redesigned inquiry keeps every supported field in the ERP payload',()=>{
 const bridge=require('../website-redesign-inquiry.js');
 const payload=bridge.buildPayload(site,{name:'김다함',phone:'01012345678',siteName:'거창 푸르지오',address:'거창',addressDetail:'101동',area:'34평',budget:'5천만원 이상',moveDate:'2026-12-01',occupancyDate:'2027-01-01',referral:'인스타그램',spaceType:'아파트',email:'test@example.com',message:'주방 수납',privacyConsent:true});
 assert.equal(payload.phone,'010-1234-5678');assert.equal(payload.site_name,'거창 푸르지오');assert.equal(payload.move_date,'2026-12-01');assert.equal(payload.source_channel,'website');
 for(const text of ['2027-01-01','인스타그램','아파트','주방 수납'])assert.ok(payload.message.includes(text));
 assert.equal('referral' in payload,false);assert.equal('occupancy_date' in payload,false);
});
test('inquiry rejects an overlong combined message before sending',()=>{
 const bridge=require('../website-redesign-inquiry.js');assert.throws(()=>bridge.buildPayload(site,{name:'김',phone:'01012345678',privacyConsent:true,message:'가'.repeat(4000),referral:'블로그'}),/4000/);
});
test('release keeps the existing domain, crawlable projects and search identity',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal(fs.readFileSync(path.join(root,'CNAME'),'utf8').trim(),'daham-interior.com');
 assert.match(html,/<title>[^<]*다함 인테리어/);assert.match(html,/name="naver-site-verification"/);assert.match(html,/rel="canonical" href="https:\/\/daham-interior.com\/"/);assert.match(html,/website-redesign\.js/);
 const list=fs.readFileSync(path.join(root,'portfolio.html'),'utf8');for(const p of require('../portfolio-static-domain.js').listProjects())assert.ok(list.includes('href="portfolio/'+p.slug+'.html"'));
});
test('every static image on each public case resolves from its actual document directory',()=>{
 const root=path.join(__dirname,'..');for(const p of require('../portfolio-static-domain.js').listProjects()){
  const relative='portfolio/'+p.slug+'.html',html=fs.readFileSync(path.join(root,relative),'utf8');
  for(const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)){
   const src=m[1];if(/^(https?:|data:)/.test(src))continue;
   const absolute=src.startsWith('/')?path.join(root,src.slice(1)):path.resolve(root,path.dirname(relative),src);
   assert.ok(fs.existsSync(absolute),relative+' -> '+src);
  }
 }
});
test('Naver attribution survives same-origin navigation without leaking into a new external visit',()=>{
 const bridge=require('../website-redesign-inquiry.js');
 assert.equal(bridge.resolveSourceChannel(site,'https://daham-interior.com/inquiry.html?source=website_nav','https://daham-interior.com/','naver_blog'),'naver_blog');
 assert.equal(bridge.resolveSourceChannel(site,'https://daham-interior.com/','https://google.com/search','naver_blog'),'website');
 assert.equal(bridge.resolveSourceChannel(site,'https://daham-interior.com/','https://blog.naver.com/lloo0347ll','website'),'naver_blog');
});
