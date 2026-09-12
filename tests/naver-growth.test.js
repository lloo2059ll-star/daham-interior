const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const slugs = ['prugio-castle-a-32','imeun-kolon-35','bonggok-hyunjin-36','okgye-epyeon-35'];
const projects = require('../portfolio-static-domain.js');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const links = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];

test('homepage exposes four Gumi detail links before JavaScript loads', () => {
  const section = read('index.html').match(/<nav\b[^>]*class="local-project-links"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(section, 'static project navigation missing');
  const items = links(section[1]);
  assert.equal(items.length, 4);
  for (const slug of slugs) {
    const item = items.find(m => m[1] === `portfolio/${slug}.html`);
    assert.ok(item, `missing ${slug}`);
    assert.ok(fs.existsSync(path.join(root, item[1])));
    assert.ok(item[2].includes(projects.findProject(slug).title));
  }
});

for (const slug of slugs) {
  test(`${slug} links to all other priority cases with correct titles`, () => {
    const html = read(`portfolio/${slug}.html`);
    const section = html.match(/<section\b[^>]*class="related-projects"[^>]*>([\s\S]*?)<\/section>/);
    assert.ok(section, 'related cases missing');
    const items = links(section[1]);
    assert.equal(items.length, 3);
    assert.equal(new Set(items.map(m => m[1])).size, 3);
    for (const target of slugs.filter(s => s !== slug)) {
      const item = items.find(m => m[1] === `${target}.html`);
      assert.ok(item);
      assert.ok(item[2].includes(projects.findProject(target).title));
      assert.ok(fs.existsSync(path.resolve(root, 'portfolio', item[1])));
    }
  });
}

test('confirmed blog posts connect to matching project pages without invented post URLs', () => {
  for (const [slug,post] of [['prugio-castle-a-32','224374166211'],['imeun-kolon-35','224357157310']]) {
    const item = links(read(`portfolio/${slug}.html`)).find(m => m[1] === `https://blog.naver.com/lloo0347ll/${post}`);
    assert.ok(item, `missing confirmed blog post for ${slug}`);
    assert.match(item[0], /rel="noopener noreferrer"/);
  }
});
