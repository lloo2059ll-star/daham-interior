const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const domainPath = path.join(root, 'portfolio-static-domain.js');

test('static portfolio exposes eight curated projects', () => {
  assert.equal(fs.existsSync(domainPath), true, 'portfolio-static-domain.js should exist');
  const portfolio = require(domainPath);
  const projects = portfolio.listProjects();
  assert.equal(projects.length, 8);
  assert.equal(new Set(projects.map((project) => project.slug)).size, 8);
  assert.deepEqual(projects.map((project) => project.photos.length), [12, 10, 10, 10, 8, 7, 7, 8]);
  for (const project of projects) {
    assert.ok(project.title);
    assert.match(project.coverImage, new RegExp(`portfolio-assets/projects/${project.slug}/cover\\.webp$`));
    assert.match(project.coverPosition, /^(?:left|center|right|\d{1,3}%) (?:top|center|bottom|\d{1,3}%)$/);
    assert.equal(new Set(project.photos).size, project.photos.length);
    for (const photo of project.photos) {
      assert.match(photo, new RegExp(`^portfolio-assets/projects/${project.slug}/[a-z0-9-]+\\.webp$`));
      assert.doesNotMatch(photo, /\/\d{2}\.webp$/);
    }
    assert.ok(Array.isArray(project.tags));
  }
});

test('portfolio findProject returns a project by slug and null for unknown slugs', () => {
  const portfolio = require(domainPath);
  const first = portfolio.listProjects()[0];
  assert.equal(portfolio.findProject(first.slug).title, first.title);
  assert.equal(portfolio.findProject('missing-project'), null);
});

test('public website is wired to static portfolio browsing', () => {
  const websitePath = path.join(root, 'index.html');
  const portfolioPagePath = path.join(root, 'portfolio.html');
  assert.equal(fs.existsSync(websitePath), true);
  assert.equal(fs.existsSync(portfolioPagePath), true, 'portfolio.html should exist');
  const website = fs.readFileSync(websitePath, 'utf8');
  const portfolioPage = fs.readFileSync(portfolioPagePath, 'utf8');
  assert.match(website, /portfolio-static-domain\.js/);
  assert.match(website, /href="portfolio\.html"/);
  assert.match(portfolioPage, /portfolio-static-domain\.js/);
  assert.match(portfolioPage, /portfolio-page\.js/);
  assert.doesNotMatch(website + portfolioPage, /portfolio-image-loader\.js/);
});

test('portfolio detail keeps static photos as fallback and accepts published ordered galleries', () => {
  const html = fs.readFileSync(path.join(root, 'portfolio.html'), 'utf8');
  const page = fs.readFileSync(path.join(root, 'portfolio-page.js'), 'utf8');
  assert.match(html, /@supabase\/supabase-js/);
  assert.match(html, /website-public-domain\.js/);
  assert.match(page, /gallery_image_urls/);
  assert.match(page, /mergePublishedRows/);
  assert.match(page, /row\.galleryImageUrls\.length/);
  assert.match(page, /row\.photos/);
});

test('portfolio detail retries published overrides without the gallery column before migration', () => {
  const page = fs.readFileSync(path.join(root, 'portfolio-page.js'), 'utf8');
  assert.match(page, /isMissingGalleryColumn/);
  assert.match(page, /PORTFOLIO_LEGACY_FIELDS/);
});

test('portfolio cards apply curated cover positions without cropping detail photos', () => {
  const page = fs.readFileSync(path.join(root, 'portfolio-page.js'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'website-final.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'portfolio-page.css'), 'utf8');
  assert.match(page, /coverPosition/);
  assert.match(home, /coverPosition/);
  assert.match(css, /\.project-gallery-photo img\{[^}]*height:auto/);
});

test('homepage hero background points to an existing curated image', () => {
  const css = fs.readFileSync(path.join(root, 'website-final.css'), 'utf8');
  const heroPath = css.match(/--hero-image:url\("([^"]+)"\)/)?.[1];
  assert.ok(heroPath);
  assert.equal(fs.existsSync(path.join(root, heroPath)), true, `missing hero image: ${heroPath}`);
});

test('Bonggok Hyunjin top-floor project uses the confirmed 38-pyeong area', () => {
  const portfolio = require(domainPath);
  const project = portfolio.findProject('bonggok-hyunjin-36');
  assert.equal(project.area, '38평');
  assert.match(project.title, /38평/);
  assert.ok(project.tags.includes('#38평'));
});

test('priority portfolio detail documents have unique searchable metadata and visible content', () => {
  const slugs = ['prugio-castle-a-32', 'imeun-kolon-35', 'bonggok-hyunjin-36', 'okgye-epyeon-35'];
  const titles = new Set();
  const descriptions = new Set();
  for (const slug of slugs) {
    const html = fs.readFileSync(path.join(root, 'portfolio', `${slug}.html`), 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    assert.ok(title);
    assert.ok(description);
    assert.equal(titles.has(title), false);
    assert.equal(descriptions.has(description), false);
    titles.add(title);
    descriptions.add(description);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://daham-interior\\.com/portfolio/${slug}\\.html">`));
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.match(html, /기존 상태|설계 판단|주요 시공|완공 결과/);
    assert.match(html, /견적 문의/);
    assert.match(html, /href="\.\.\/inquiry\.html"/);
  }
});
