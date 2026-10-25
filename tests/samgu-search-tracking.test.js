const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const casePath = '/portfolio/okgye-samgu-trinity-51.html';
const html = fs.readFileSync(path.join(root, casePath), 'utf8');

test('standalone Samgu page measures a consultation click without claiming a completed lead', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)src="([^"]+)"[^>]*><\/script>/g)];
  const shared = scripts.filter(match => /website-(conversion-domain|analytics)\.js$/.test(match[2]));
  assert.equal(shared.length, 2, 'standalone case must load its existing measurement scripts');
  assert.match(shared[0][2], /website-conversion-domain\.js$/);
  assert.match(shared[1][2], /website-analytics\.js$/);
  const listeners = {};
  const context = vm.createContext({URL, URLSearchParams,
    location: new URL('https://daham-interior.com' + casePath),
    document: {referrer: '', head: {appendChild() {}}, createElement() {return {};},
      addEventListener(name, listener) {listeners[name] = listener;}},
  });
  context.window = context;
  for (const match of shared) {
    assert.match(match[1], /\bdefer\b/);
    const file = path.resolve(root, 'portfolio', match[2]);
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  }
  assert.ok(context.dataLayer.some(args => args[0] === 'config'));
  const cta = html.match(/<a\b[^>]*href="\.\.\/inquiry\.html[^>]*>/)?.[0];
  assert.ok(cta);
  assert.match(cta, /source=website_project/);
  const attrs = Object.fromEntries([...cta.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const target = {getAttribute(name) {return attrs[name] || '';},
    matches(selector) {return selector === '[data-conversion="inquiry"]' && attrs['data-conversion'] === 'inquiry';}};
  listeners.click({target: {closest() {return target;}}});
  const events = context.dataLayer.filter(args => args[0] === 'event');
  assert.equal(events.length, 1);
  assert.equal(events[0][1], 'inquiry_click');
  assert.equal(events[0][2].page_path, casePath);
  assert.equal(events[0][2].cta_location, 'samgu_51_case');
});

test('Samgu breadcrumbs describe the visible canonical navigation', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const breadcrumb = blocks.find(item => item['@type'] === 'BreadcrumbList');
  assert.ok(breadcrumb);
  assert.deepEqual(breadcrumb.itemListElement.map(item => item.item), [
    'https://daham-interior.com/', 'https://daham-interior.com/portfolio.html',
    'https://daham-interior.com' + casePath,
  ]);
  assert.deepEqual(breadcrumb.itemListElement.map(item => item.position), [1,2,3]);
  assert.match(html, /<nav[^>]*aria-label="현재 위치"/);
  assert.match(html, /aria-current="page"[^>]*>[^<]*삼구트리니엔 51평/);
});

test('Samgu gallery defers offscreen photos without delaying the cover', () => {
  const gallery = [...html.matchAll(/<a class="do-gallery-photo"[^>]*>\s*(<img\b[^>]*>)/g)].map(m => m[1]);
  assert.ok(gallery.length >= 40);
  for (const img of gallery) assert.match(img, /loading="lazy"/);
  const cover = html.match(/<section class="case-hero">\s*(<img\b[^>]*>)/)[1];
  assert.doesNotMatch(cover, /loading="lazy"/);
});
