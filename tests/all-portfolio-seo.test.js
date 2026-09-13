const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const projects = require('../portfolio-static-domain').listProjects();
const weeks = [4,4,4,4,6,3,4,4];
test('every public case has a crawlable document, sitemap entry and static list link', () => {
  const list = fs.readFileSync(path.join(root,'portfolio.html'),'utf8');
  const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  for (const project of projects) {
    const relative = `portfolio/${project.slug}.html`;
    assert.ok(fs.existsSync(path.join(root, relative)), relative);
    const html = fs.readFileSync(path.join(root, relative),'utf8');
    assert.ok(html.includes(`https://daham-interior.com/${relative}`));
    assert.ok(list.includes(`href="${relative}"`));
    assert.ok(sitemap.includes(`<loc>https://daham-interior.com/${relative}</loc>`));
    for (const photo of project.photos) {
      assert.ok(fs.existsSync(path.join(root,photo)), photo);
      assert.ok(html.includes(`../${photo}`), photo);
    }
  }
});
test('case pages show user confirmed area and construction duration', () => {
  assert.equal(projects[7].area,'33평');
  projects.forEach((project,i) => {
    const html = fs.readFileSync(path.join(root,'portfolio',`${project.slug}.html`),'utf8');
    assert.ok(html.includes(`공사 기간 ${weeks[i]}주`),project.slug);
    assert.ok(html.includes(project.area),project.slug);
  });
});
