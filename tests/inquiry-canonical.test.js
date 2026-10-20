const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('inquiry query variants declare the stable public consultation URL',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../inquiry.html'),'utf8');
 const canonical=[...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gi)];
 assert.equal(canonical.length,1,'one canonical URL must be present before client JavaScript');
 assert.match(canonical[0][0],/href="https:\/\/daham-interior\.com\/inquiry\.html"/);
 assert.doesNotMatch(canonical[0][0],/\?|source=|utm_/);
});
