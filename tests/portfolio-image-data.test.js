const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','portfolio-data');
const groups={
  'portfolio-covers':['portfolio-covers.txt'],
  'prugio-castle-a-32':['prugio-castle-a-32.txt'],
  'geochang-prugio-34':['geochang-prugio-34.txt'],
  'bonggok-hyunjin-36':['bonggok-hyunjin-36.txt'],
  'imeun-kolon-35':['imeun-kolon-35.txt'],
  'songjeong-house-23':['songjeong-house-23-0.txt','songjeong-house-23-1.txt'],
  'okgye-epyeon-35':['okgye-epyeon-35.txt'],
  'songjeong-dongyang-42':['songjeong-dongyang-42.txt'],
  'daegu-sangin-hwasung':['daegu-sangin-hwasung.txt']
};
for(const [key,files] of Object.entries(groups)){
  test(key+' image payload decodes to WebP',()=>{
    const b64=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('').replace(/\s+/g,'');
    const buf=Buffer.from(b64,'base64');
    assert.equal(buf.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(buf.subarray(8,12).toString('ascii'),'WEBP');
    assert.ok(buf.length>10000);
  });
}
