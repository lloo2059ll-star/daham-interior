const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const portfolio = require(path.join(root, 'portfolio-static-domain.js'));

test('옥계 삼구트리니엔 51평을 기존 삼구 현장과 별도 포트폴리오로 제공한다', () => {
  const existing = portfolio.findProject('samgu-trinity-36');
  const project = portfolio.findProject('okgye-samgu-trinity-51');

  assert.ok(existing, '기존 삼구트리니엔 36평 현장을 유지해야 한다');
  assert.ok(project, '옥계 삼구트리니엔 51평 현장을 추가해야 한다');
  assert.equal(project.title, '구미 옥계 삼구트리니엔 51평');
  assert.equal(project.location, '구미 옥계');
  assert.equal(project.area, '51평');
  assert.ok(project.photos.length >= 30, '공간별 ON/OFF 사진을 충분히 제공해야 한다');
  assert.equal(new Set(project.photos).size, project.photos.length);
});

test('옥계 삼구트리니엔 51평 상세 페이지는 6주 공사와 블로그 게시물을 연결한다', () => {
  const file = path.join(root, 'portfolio', 'okgye-samgu-trinity-51.html');
  assert.equal(fs.existsSync(file), true);
  const html = fs.readFileSync(file, 'utf8');

  assert.match(html, /구미 옥계 삼구트리니엔 51평/);
  assert.match(html, /공사 기간 6주/);
  assert.match(html, /224442968950/);
  assert.match(html, /portfolio-assets\/projects\/okgye-samgu-trinity-51\/cover\.webp/);
  assert.ok((html.match(/class="do-gallery-photo"/g) || []).length >= 40);
});

test('상세 화면은 정적 포트폴리오 데이터를 병합하고 새 이미지 경로를 직접 사용할 수 있다', () => {
  const js = fs.readFileSync(path.join(root, 'website-redesign.js'), 'utf8');
  assert.match(js, /DAHAM_PORTFOLIO_STATIC/);
  assert.match(js, /galleryAssets\[key\].*key/);
});

