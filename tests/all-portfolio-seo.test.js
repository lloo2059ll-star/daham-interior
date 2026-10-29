const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const projects = require('../portfolio-static-domain').listProjects();
const weeks = {"prugio-castle-a-32": 4, "geochang-prugio-34": 4, "bonggok-hyunjin-36": 4, "imeun-kolon-35": 4, "songjeong-house-23": 6, "okgye-epyeon-35": 3, "songjeong-dongyang-42": 4, "daegu-sangin-hwasung": 4, "gangbyeon-kolon-34": 4, "sandong-ssangyong-34": 3, "samgu-trinity-36": 4, "okgye-samgu-trinity-51": 6, "songjeong-samwoo-32": 4, "wonho-prugio-34": 3, "wonho-prugio-renovation-34": 3, "indong-restaurant-50": 4, "sinpyeong-salon-40": 4};
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
  assert.equal(projects.find(project => project.slug === 'daegu-sangin-hwasung').area,'33평');
  projects.forEach((project) => {
    const html = fs.readFileSync(path.join(root,'portfolio',`${project.slug}.html`),'utf8');
    assert.ok(html.includes(`공사 기간 ${weeks[project.slug]}주`),project.slug);
    assert.ok(html.includes(project.area),project.slug);
  });
});
