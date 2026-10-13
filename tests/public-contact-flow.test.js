const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('portfolio inquiry action takes the visitor directly to the inquiry form', () => {
  const quote = read('portfolio.html').match(/<a\b[^>]*data-view="consult"[^>]*>/)[0];
  assert.match(quote, /href="(?:\.\/|\/)?inquiry\.html(?:\?[^\"]*)?"/);
});

test('every portfolio navigation and legacy header inquiry link opens the form', () => {
  for (const file of ['portfolio.html', 'portfolio-detail.html']) {
    const links = read(file).match(/<a\b[^>]*>[\s\S]*?<\/a>/g).filter(link => /견적\s*문의/.test(link));
    assert.ok(links.length, file);
    for (const link of links) assert.match(link, /href="(?:\.\/|\/)?inquiry\.html(?:\?[^\"]*)?"/, `${file}: ${link}`);
  }
});

test('homepage cards link every known project to its existing detailed case', () => {
  const source = read('website-final.js');
  const helper = source.match(/(?:var SEARCHABLE_PROJECTS=[\s\S]*?)?function projectHref\(slug\)\{[^\n]+\}/)[0];
  const api = require('../portfolio-static-domain.js');
  const context = {window:{DAHAM_PORTFOLIO_STATIC:api}};
  vm.createContext(context); vm.runInContext(helper, context);
  for (const project of api.listProjects()) {
    assert.equal(context.projectHref(project.slug), `portfolio/${project.slug}.html`, project.slug);
  }
});

test('legacy detailed case consultation action does not lead to the homepage footer', () => {
  const source = read('portfolio-detail.js');
  const cta = source.slice(source.indexOf('<section class="detail-cta">'));
  assert.match(cta, /href="inquiry\.html(?:\?[^\"]*)?"/);
  assert.doesNotMatch(cta, /href="\.\/#footer"/);
});

test('inquiry errors are outside step panels so they remain visible on all three steps', () => {
  const html = read('inquiry.html');
  let fieldsetDepth = 0, found = false;
  for (const tag of html.match(/<[^>]+>/g)) {
    if (/^<fieldset\b/.test(tag)) fieldsetDepth++;
    if (/^<\/fieldset\b/.test(tag)) fieldsetDepth--;
    if (/id="form-result"/.test(tag)) {
      found = true; assert.equal(fieldsetDepth, 0, 'error feedback is hidden with the final step');
    }
  }
  assert.ok(found);
});
