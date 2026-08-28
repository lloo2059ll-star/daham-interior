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

test('estimate editor reflows inside tablet width without horizontal scrolling', () => {
  const css = tabletOverride('estimate.html');
  assert.match(css, /@media\s+screen\s+and\s*\(min-width:\s*768px\)\s+and\s*\(max-width:\s*1024px\)/);
  assert.match(css, /\.v2-project-shell\s*\{[^}]*max-width\s*:\s*100%[^}]*overflow-x\s*:\s*visible/s);
  assert.match(css, /\.v2-workgrid\s*\{[^}]*grid-template-areas\s*:\s*["']summary summary["']\s*["']side center["']/s);
  assert.match(css, /\.v2-workgrid\s*\{[^}]*grid-template-columns\s*:\s*140px\s+minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.v2-right\s*\{[^}]*grid-area\s*:\s*summary[^}]*grid-template-columns\s*:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.v2-summary-card\s*\{[^}]*grid-template-columns\s*:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.v2-head-actions\s*\{[^}]*flex-wrap\s*:\s*wrap/s);
  assert.match(css, /\.v2-project-head\s*\{[^}]*flex-direction\s*:\s*row\s*!important/s);
  assert.match(css, /\.toolbar\s*>\s*div:first-child\s*\{[^}]*flex\s*:\s*1\s+1\s+100%[^}]*flex-wrap\s*:\s*wrap/s);
  assert.match(css, /\.v2-project-tabs\s*\{[^}]*flex-wrap\s*:\s*wrap[^}]*overflow\s*:\s*visible/s);
  assert.match(css, /body\.v2-customer-view\s+\.v2-workgrid\s*\{[^}]*grid-template-areas\s*:\s*["']summary["']\s*["']center["'][^}]*grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /#tb-edit-btns\s+\.hide-sm,[^}]*#tb-list-btns\s+\.hide-sm\s*\{[^}]*display\s*:\s*inline-flex\s*!important/s);
});

test('tablet overrides keep estimate information visible and leave phone and print rules alone', () => {
  for (const file of ['estimate.html', 'estimate-commercial.html']) {
    const css = tabletOverride(file);
    assert.doesNotMatch(css, /display\s*:\s*none/i);
    assert.doesNotMatch(css, /@media\s+print/i);
    assert.doesNotMatch(css, /max-width\s*:\s*(?:520|767)px/i);
    assert.match(css, /\.items-tbl\s*\{[^}]*width\s*:\s*100%[^}]*min-width\s*:\s*0[^}]*table-layout\s*:\s*fixed/s);
    assert.match(css, /\.sec-summary\s*\{[^}]*display\s*:\s*flex\s*!important/s);
    assert.match(css, /box-sizing\s*:\s*border-box/);
    assert.match(css, /@media\s+screen\s+and\s*\(min-width:\s*1025px\)\s+and\s*\(max-width:\s*1366px\)/);
  }
  assert.match(tabletOverride('estimate-commercial.html'), /\.summary-bar\s*\{[^}]*display\s*:\s*grid[^}]*grid-template-columns\s*:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
});
