const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('homepage search snippet leads with the local service and shows real portfolio scope', () => {
  const homepage = read('index.html');
  assert.match(homepage, /<title>구미 인테리어·아파트 리모델링 시공사례 \| 다함 인테리어<\/title>/);
  assert.match(homepage, /<meta name="description" content="[^"]*실제 시공사례[^"]*32~42평[^"]*거실·주방·욕실[^"]*공사 상담[^"]*">/);
});

test('high-impression pages use specific search titles and matching descriptions', () => {
  const prugio = read('portfolio/prugio-castle-a-32.html');
  assert.match(prugio, /<title>구미 푸르지오캐슬 A단지 32평 리모델링 시공사례 \| 다함 인테리어<\/title>/);
  assert.match(prugio, /<meta name="description" content="[^"]*거실·주방·욕실[^"]*공사 기간 4주[^"]*">/);

  const guide = read('gumi-apartment-interior.html');
  assert.match(guide, /<title>구미 아파트 인테리어 공사범위·32~35평 시공사례 \| 다함 인테리어<\/title>/);
  assert.match(guide, /<meta name="description" content="[^"]*공사 범위[^"]*32평·34평·35평[^"]*">/);
});
