const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

function dims(buf){
  assert.equal(buf.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(buf.subarray(8,12).toString('ascii'),'WEBP');
  const type=buf.subarray(12,16).toString('ascii');
  if(type==='VP8X'){
    const w=1+buf[24]+(buf[25]<<8)+(buf[26]<<16);
    const h=1+buf[27]+(buf[28]<<8)+(buf[29]<<16);
    return [w,h];
  }
  if(type==='VP8 '){
    const marker=buf.indexOf(Buffer.from([0x9d,0x01,0x2a]),20);
    assert.ok(marker>=0,'VP8 frame marker missing');
    return [buf.readUInt16LE(marker+3)&0x3fff,buf.readUInt16LE(marker+5)&0x3fff];
  }
  if(type==='VP8L'){
    assert.equal(buf[20],0x2f);
    const b0=buf[21],b1=buf[22],b2=buf[23],b3=buf[24];
    return [1+b0+((b1&0x3f)<<8),1+((b1&0xc0)>>6)+(b2<<2)+((b3&0x0f)<<10)];
  }
  throw new Error('Unsupported WebP chunk '+type);
}

for(const [file,expected,minBytes] of [
  ['portfolio-assets/v2-covers.webp',[2560,213],10000],
  ['portfolio-assets/v2-gallery.webp',[2560,1704],10000]
]){
  test(file+' is a usable WebP atlas',()=>{
    const buf=fs.readFileSync(path.join(root,file));
    assert.ok(buf.length>=minBytes,'asset unexpectedly small');
    assert.deepEqual(dims(buf),expected);
  });
}

test('portfolio loader uses direct binary atlases',()=>{
  const js=fs.readFileSync(path.join(root,'portfolio-image-loader.js'),'utf8');
  assert.match(js,/portfolio-assets\/v2-covers\.webp/);
  assert.match(js,/portfolio-assets\/v2-gallery\.webp/);
  assert.doesNotMatch(js,/\.b64/);
});
