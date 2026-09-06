const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','portfolio-assets');

function decode(file){
  const b64=fs.readFileSync(path.join(root,file),'utf8').replace(/\s+/g,'');
  return Buffer.from(b64,'base64');
}
function assertWebp(buf){
  assert.equal(buf.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(buf.subarray(8,12).toString('ascii'),'WEBP');
  assert.ok(buf.length>10000);
}

test('portfolio cover atlas is a valid WebP payload',()=>{
  const file='covers.webp.b64';
  assert.equal(fs.existsSync(path.join(root,file)),true,file+' should exist');
  assertWebp(decode(file));
});

test('portfolio gallery atlas is a valid curated WebP payload',()=>{
  const file='gallery.webp.b64';
  assert.equal(fs.existsSync(path.join(root,file)),true,file+' should exist');
  const buf=decode(file);
  assertWebp(buf);
  assert.ok(buf.length>90000,'gallery atlas should contain all curated project photos');
});
