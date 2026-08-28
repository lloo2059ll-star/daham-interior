const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function tabletOverride(file) {
  const html = read(file);
  const block = html.match(/<style id="estimate-tablet-pc-layout">([\s\S]*?)<\/style>/i);
  assert.ok(block, `${file} must expose the tablet PC-layout override`);
  return block[1];
}

test('estimate editor keeps the desktop three-column workspace on tablets', () => {
  const css = tabletOverride('estimate.html');
  assert.match(css, /@media\s+screen\s+and\s*\(min-width:\s*768px\)\s+and\s*\(max-width:\s*1366px\)/);
  assert.match(css, /#edit-view\.main\s*\{[^}]*padding-bottom\s*:\s*0\s*!important[^}]*overflow\s*:\s*hidden/s);
  assert.match(css, /\.toolbar\s*\{[^}]*flex-wrap\s*:\s*nowrap\s*!important[^}]*overflow-x\s*:\s*auto/s);
  assert.match(css, /\.v2-project-shell\s*\{[^}]*height\s*:\s*calc\(100dvh\s*-\s*64px\)[^}]*overflow\s*:\s*auto/s);
  assert.match(css, /\.v2-workgrid\s*\{[^}]*grid-template-columns\s*:\s*220px\s+minmax\(720px,\s*1fr\)\s+340px\s*!important/s);
  assert.match(css, /\.v2-workgrid\s*\{[^}]*min-width\s*:\s*1316px/s);
  assert.match(css, /\.v2-right\s*\{[^}]*display\s*:\s*flex\s*!important/s);
  assert.match(css, /\.v2-side\s*\{[^}]*position\s*:\s*sticky\s*!important/s);
  assert.match(css, /\.v2-head-actions\s*\{[^}]*flex-wrap\s*:\s*nowrap/s);
  assert.match(css, /\.v2-section-nav\s*\{[^}]*flex-direction\s*:\s*column\s*!important[^}]*max-height\s*:\s*calc\(100dvh\s*-\s*175px\)/s);
});

test('tablet overrides keep estimate information visible and leave phone and print rules alone', () => {
  for (const file of ['estimate.html', 'estimate-commercial.html']) {
    const css = tabletOverride(file);
    assert.doesNotMatch(css, /display\s*:\s*none/i);
    assert.doesNotMatch(css, /@media\s+print/i);
    assert.doesNotMatch(css, /max-width\s*:\s*(?:520|767)px/i);
    assert.match(css, /\.items-tbl\s*\{[^}]*min-width\s*:\s*720px/s);
    assert.match(css, /\.sec-summary\s*\{[^}]*display\s*:\s*flex\s*!important/s);
    assert.match(css, /\.grand-total-box\s*\{[^}]*flex-direction\s*:\s*row\s*!important/s);
    assert.match(css, /#tb-edit-btns \.hide-sm[\s\S]*?#tb-list-btns \.hide-sm\s*\{[^}]*display\s*:\s*inline-flex\s*!important/s);
  }
  assert.match(tabletOverride('estimate-commercial.html'), /\.summary-bar\s*,\s*\.sb-toggle\s*\{[^}]*top\s*:\s*0/s);
});
