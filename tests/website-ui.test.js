const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

// Final website verification intentionally spans the split HTML/CSS/JS shell.
const root = path.join(__dirname, '..');
function read(name){ return fs.readFileSync(path.join(root, name), 'utf8'); }
function html(){ return read('index.html'); }
function source(){ return [read('index.html'), read('website-final.css'), read('website-assets-fix.css'), read('website-final.js')].join('\n'); }

test('root is the public homepage and ERP has its own address', () => {
  assert.match(read('index.html'), /class="reference-home"/);
  assert.match(read('erp.html'), /DAHAM INTERIOR — Dashboard/);
  assert.match(read('website.html'), /location\.replace\(['"]\.\/['"]\)/);
});

test('public homepage keeps the approved DAHAM sections and copy', () => {
  const src = html();
  assert.match(src, /DAHAM INTERIOR/);
  assert.match(src, /공간에 가치를 더하고,/);
  assert.match(src, /일상에 편안함을 더합니다\./);
  assert.match(src, /PORTFOLIO/);
  assert.match(src, /OUR PROCESS/);
  assert.match(src, /ABOUT DAHAM/);
  assert.match(src, /CUSTOMER CENTER/);
  assert.match(src, /INSTAGRAM/);
  assert.match(src, /QUICK MENU/);
  assert.match(src, /id="inquiry-modal"/);
  assert.match(src, /견적 문의하기/);
});

test('approved desktop mockup structure replaces the old generic homepage styling', () => {
  const src = source();
  assert.match(src, /class="reference-home"/);
  assert.match(src, /--page-width:940px/);
  assert.match(src, /--header-height:78px/);
  assert.match(src, /class="hero-trust"/);
  assert.match(src, /class="portfolio-grid"/);
  assert.match(src, /grid-template-columns:repeat\(4,1fr\)/);
  assert.match(src, /class="process-grid"/);
  assert.match(src, /grid-template-columns:repeat\(6,1fr\)/);
  assert.match(src, /class="footer-panels"/);
  assert.doesNotMatch(src, /class="cta-band"/);
  assert.doesNotMatch(src, /ERP에서 공개 승인된 현장만 표시됩니다/);
});

test('homepage uses repository image assets rather than emoji process icons', () => {
  const src = source();
  assert.match(src, /portfolio-assets\/projects\/prugio-castle-a-32\/01\.webp/);
  assert.match(src, /portfolio-assets\/projects\/geochang-prugio-34\/cover\.webp/);
  assert.match(src, /website-assets\/trust-icons\.png/);
  assert.match(src, /website-assets\/process-icons\.svg/);
  assert.match(src, /website-assets\/instagram\.jpg/);
  assert.match(src, /website-assets\/misc-icons\.svg/);
  assert.doesNotMatch(src, /website-assets\/(?:hero|portfolio-cards)\.jpg|website-assets\/(?:process|misc)-icons\.png/);
  assert.doesNotMatch(src, /✦|⌖|▤|✓|◫/);
  assert.match(src, /trust-sprite/);
  assert.match(src, /process-sprite/);
});

test('homepage vector sprites are complete standalone SVG images', () => {
  const processIcons = read('website-assets/process-icons.svg');
  const miscIcons = read('website-assets/misc-icons.svg');
  assert.match(processIcons, /^<svg[^>]+viewBox="0 0 264 44"/);
  assert.equal((processIcons.match(/<g transform="translate\(/g) || []).length, 6);
  assert.match(processIcons, /<\/svg>\s*$/);
  assert.match(miscIcons, /^<svg[^>]+viewBox="0 0 180 30"/);
  assert.equal((miscIcons.match(/<g transform="translate\(/g) || []).length, 6);
  assert.match(miscIcons, /<\/svg>\s*$/);
});

test('mobile header keeps the quote button inside the viewport', () => {
  const css = read('website-assets-fix.css');
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /\.header-inner\{grid-template-columns:minmax\(0,1fr\) auto;gap:12px\}/);
  assert.match(css, /\.quote-btn\{width:108px;max-width:100%\}/);
});

test('instagram controls open the official DAHAM account in a new tab', () => {
  const src = source();
  assert.match(src, /https:\/\/www\.instagram\.com\/daham\.co\//);
  assert.match(src, /\.insta-btn/);
  assert.match(src, /\.social-icon\.instagram/);
  assert.match(src, /target='_blank'/);
  assert.match(src, /rel='noopener noreferrer'/);
  assert.match(src, /인스타그램/);
});

test('kakao consultation opens the official DAHAM Kakao channel in a new tab', () => {
  const src = source();
  assert.match(src, /https:\/\/pf\.kakao\.com\/_xnvxgTX/);
  assert.match(src, /\.kakao-btn/);
  assert.match(src, /removeAttribute\('data-open-inquiry'\)/);
  assert.match(src, /target='_blank'/);
  assert.match(src, /rel='noopener noreferrer'/);
});

test('public homepage talks only to public website tables', () => {
  const src = source();
  assert.match(src, /website-public-domain\.js/);
  assert.match(src, /from\('website_portfolio'\)/);
  assert.match(src, /from\('website_inquiries'\)/);
  assert.doesNotMatch(src, /auth\.js/);
  assert.doesNotMatch(src, /sync_data/);
  assert.doesNotMatch(src, /consult\.html/);
});

test('public inquiry stays on the website and shows in-place result state', () => {
  const src = source();
  assert.match(src, /id="inquiry-form"/);
  assert.match(src, /id="inquiry-result"/);
  assert.match(src, /문의가 접수되었습니다/);
});

test('dedicated Naver Blog inquiry page uses the existing public ERP intake safely', () => {
  const html = fs.readFileSync(path.join(root, 'inquiry.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'inquiry.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'inquiry-overrides.css'), 'utf8');
  assert.match(html, /name="workScope" value="전체 공사"/);
  assert.match(html, /name="workScope" value="부분 공사"/);
  assert.match(html, /id="privacy"/);
  for (const marker of ['data-step-panel="1"', 'data-step-panel="2"', 'data-step-panel="3"', 'id="inquiry-progress"']) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(html, /예쁜 집보다,[\s\S]*이유 있는 공간/);
  assert.match(html, /inquiry-domain\.js[\s\S]*inquiry\.js/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /letter-spacing:\s*-0\.04em/);
  assert.match(css, /letter-spacing:\s*-0\.015em/);
  assert.match(css, /\.intro h1 em\{[^}]*color:\s*inherit/);
  assert.match(js, /from\('website_inquiries'\)\.insert\(payload\)/);
  assert.match(js, /sourceChannel:'naver_blog'/);
  assert.match(js, /validateStep/);
  assert.match(js, /aria-busy/);
  assert.match(js, /\.focus\(\)/);
});

test('homepage renders static portfolio immediately and then loads published overrides', () => {
  const src = source();
  assert.match(src, /renderStaticPortfolio\(\);loadPortfolio\(\)/);
  assert.match(src, /function projectHref\(slug\)/);
  assert.match(src, /'portfolio\/'\+encodeURIComponent\(slug\)\+'\.html'/);
  assert.match(src, /'portfolio\.html#'\+encodeURIComponent\(slug\)/);
  assert.match(src, /gallery_image_urls/);
});

test('public homepage retries published overrides without the gallery column before migration', () => {
  const src = source();
  assert.match(src, /isMissingGalleryColumn/);
  assert.match(src, /PORTFOLIO_LEGACY_FIELDS/);
});

test('public homepage shows the current representative phone number', () => {
  const src = html();
  assert.equal((src.match(/010-2059-0347/g) || []).length, 2);
  assert.doesNotMatch(src, /010-5633-6807/);
});

test('search engines receive one canonical public homepage and crawlable sitemap', () => {
  const src = html();
  const portfolio = read('portfolio.html');
  const canonical = src.match(/<link rel="canonical" href="([^"]+)">/);
  const jsonLd = src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');

  assert.equal(canonical?.[1], 'https://daham-interior.com/');
  assert.match(src, /name="google-site-verification" content="YzRyfSap9nAltolhjGu60RPMk2VIeCyU9vRuWJvI6fo"/);
  assert.match(src, /name="naver-site-verification" content="6d67a23d6c96b0be6019454d4ef254afa949cd03"/);
  assert.match(portfolio, /<link rel="canonical" href="https:\/\/daham-interior\.com\/portfolio\.html">/);
  assert.equal(JSON.parse(jsonLd?.[1]).url, 'https://daham-interior.com/');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/daham-interior\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/daham-interior\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/daham-interior\.com\/portfolio\.html<\/loc>/);
  assert.doesNotMatch(sitemap, /erp\.html|login\.html|website\.html/);
});

test('homepage states the Gumi service scope in searchable text without keyword stuffing', () => {
  const src = html();
  assert.match(src, /class="local-service-summary"/);
  assert.match(src, /구미에서 아파트 전체 인테리어와 리모델링을 설계·시공하는 다함 인테리어/);
  assert.match(src, /구미 · 김천 · 대구/);
  assert.match(src, /전체 인테리어 · 주방 · 욕실 · 수납/);
  assert.ok((src.match(/구미 인테리어/g) || []).length <= 3);
});

test('homepage business schema matches the visible official business identity', () => {
  const src = html();
  const jsonLd = JSON.parse(src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]);
  assert.equal(jsonLd.taxID, '497-34-01080');
  assert.equal(jsonLd.address.streetAddress, '신시로10길 75-2');
  assert.equal(jsonLd.address.addressLocality, '구미시');
  assert.ok(jsonLd.sameAs.includes('https://blog.naver.com/lloo0347ll'));
});

test('footer Naver links point to the official blog instead of an on-page placeholder', () => {
  const src = html();
  assert.match(src, /href="https:\/\/blog\.naver\.com\/lloo0347ll"[^>]*aria-label="블로그"/);
  assert.match(src, /href="https:\/\/blog\.naver\.com\/lloo0347ll"[^>]*aria-label="네이버"/);
});

test('sitemap exposes four priority portfolio detail documents', () => {
  const sitemap = read('sitemap.xml');
  for (const slug of ['prugio-castle-a-32', 'imeun-kolon-35', 'bonggok-hyunjin-36', 'okgye-epyeon-35']) {
    assert.match(sitemap, new RegExp(`<loc>https://daham-interior\\.com/portfolio/${slug}\\.html</loc>`));
    assert.equal(fs.existsSync(path.join(root, 'portfolio', `${slug}.html`)), true);
  }
});
