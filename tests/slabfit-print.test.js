const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
for(const name of ['estimate-detail.html','estimate-summary.html']){
  test(name+' keeps bundle quote output exact while retaining legacy rounding',()=>{
    const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
    const source=html.match(/function fmt\(n\) \{[^}]+\}/)[0];
    const ctx={d:{amountRounding:1}};vm.createContext(ctx);vm.runInContext(source,ctx);
    assert.equal(ctx.fmt(2232160),2232160);
    assert.equal(ctx.fmt(2566960),2566960);
    ctx.d={};assert.equal(ctx.fmt(2232160),2232200);
  });
}
