const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pages = [...fs.readdirSync(root).filter(f => f.endsWith('.html')), ...fs.readdirSync(path.join(root, 'portfolio')).filter(f => f.endsWith('.html')).map(f => 'portfolio/' + f)];
test('each public redesign document has one primary heading for its initial page', () => {
 for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (!html.includes('id="dh-owl"')) continue;
  const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(headings.length, 1, file + ' must expose one document H1 including hidden screens');
  const initial = html.match(/data-initial-screen="([^"]+)"/)?.[1] || 'home';
  const classes = {home:'do-seo-title',portfolio:'do-heading',detail:'do-project-title',story:'do-story-heading',about:'do-about-heading',sns:'do-heading',consult:'do-heading'};
  assert.ok(headings[0][0].includes(classes[initial]), file + ' must retain its own page heading');
  if (initial === 'detail') assert.ok(!/PORTFOLIO|DAHAM STORY|ABOUT|CONSULTANT/.test(headings[0][1]), file);
 }
});
