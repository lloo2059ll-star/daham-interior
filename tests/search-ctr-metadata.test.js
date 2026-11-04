const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('homepage search snippet leads with the local service and shows real portfolio scope', () => {
  const homepage = read('index.html');
  assert.match(homepage, /<title>구미 인테리어·아파트 리모델링 시공사례 \| 다함 인테리어<\/title>/);
  assert.match(homepage, /<meta name="description" content="[^"]*실제 시공사례[^"]*51평[^"]*32평[^"]*거실·주방·욕실[^"]*상담[^"]*">/);
});

test('high-impression pages use specific search titles and matching descriptions', () => {
  const prugio = read('portfolio/prugio-castle-a-32.html');
  assert.match(prugio, /<title>구미 푸르지오캐슬 A단지 32평 리모델링 시공사례 \| 다함 인테리어<\/title>/);
  assert.match(prugio, /<meta name="description" content="[^"]*거실·주방·욕실[^"]*공사 기간 4주[^"]*">/);

  const guide = read('gumi-apartment-interior.html');
  assert.match(guide, /<title>구미 아파트 인테리어 공사범위·32~51평 시공사례 \| 다함 인테리어<\/title>/);
  assert.match(guide, /<meta name="description" content="[^"]*공사 범위[^"]*32~51평[^"]*">/);
});

// The guide must provide static, accessible routes to the expanded verified cases.
test('apartment comparison guide connects real cases and comparison anchors without JavaScript', () => {
  const guide = read('gumi-apartment-interior.html');
  for (const slug of ['prugio-castle-a-32','sandong-ssangyong-34','imeun-kolon-35','okgye-epyeon-35','bonggok-hyunjin-36','okgye-samgu-trinity-51']) {
    assert.ok(guide.includes('href="portfolio/' + slug + '.html"'), slug);
  }
  for (const anchor of ['compare','cases','prepare']) {
    assert.ok(guide.includes('href="#' + anchor + '"'));
    assert.ok(guide.includes('id="' + anchor + '"'));
  }
  for (const img of guide.matchAll(/<img\b[^>]*>/g)) {
    assert.match(img[0], /alt="[^"]+"/);
    assert.match(img[0], /width="[0-9]+"/);
    assert.match(img[0], /height="[0-9]+"/);
    assert.match(img[0], /loading="lazy"/);
  }
});
