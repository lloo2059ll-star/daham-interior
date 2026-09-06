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
  for (const [index, project] of projects.entries()) {
    assert.ok(project.title);
    assert.match(project.coverImage, new RegExp(`portfolio-assets/projects/${project.slug}/cover\\.webp$`));
    assert.equal(project.photos.length, [8, 8, 8, 8, 7, 7, 7, 7][index]);
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
