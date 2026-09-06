const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','portfolio-data');

function decode(files){
  const b64=files.map((file)=>fs.readFileSync(path.join(root,file),'utf8')).join('').replace(/\s+/g,'');
  return Buffer.from(b64,'base64');
}
function assertWebp(buf){
  assert.equal(buf.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(buf.subarray(8,12).toString('ascii'),'WEBP');
  assert.ok(buf.length>10000);
}

test('portfolio cover atlas is a valid WebP payload',()=>{
  assertWebp(decode(['portfolio-covers.txt']));
});

test('portfolio gallery atlas requires all eight chunks and decodes to WebP',()=>{
  const files=Array.from({length:8},(_,index)=>`portfolio-galleries-${index}.txt`);
  for(const file of files) assert.equal(fs.existsSync(path.join(root,file)),true,file+' should exist');
  const buf=decode(files);
  assertWebp(buf);
  assert.ok(buf.length>150000,'gallery atlas should contain all curated project photos');
});
