const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'estimate.html'), 'utf8');

function printCss(source) {
  const blocks = [];
  let cursor = 0;
  while ((cursor = source.indexOf('@media print', cursor)) !== -1) {
    const open = source.indexOf('{', cursor);
    let depth = 1;
    let end = open + 1;
    while (depth && end < source.length) {
      if (source[end] === '{') depth++;
      if (source[end] === '}') depth--;
      end++;
    }
    blocks.push(source.slice(open + 1, end - 1));
    cursor = end;
  }
  return blocks.join('\n');
}

function printedDisplay(css, element) {
  let winner = null;
  let order = 0;
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = match[2];
    const display = declarations.match(/display\s*:\s*([^;!}]+)\s*(!important)?/i);
    if (!display) continue;
    for (const rawSelector of match[1].split(',')) {
      const selector = rawSelector.trim();
      const selectorsByElement = {
        'summary-bar': ['.summary-bar', '#edit-view>.summary-bar'],
        'client-panel': ['.client-panel', '#edit-view>.client-panel'],
      };
      const matches = selectorsByElement[element] && selectorsByElement[element].includes(selector);
      if (!matches) continue;
      const specificity = (selector.match(/#/g) || []).length * 100 + (selector.match(/\./g) || []).length * 10;
      const candidate = { value: display[1].trim(), important: Boolean(display[2]), specificity, order: order++ };
      if (!winner || candidate.important > winner.important ||
          (candidate.important === winner.important && candidate.specificity > winner.specificity) ||
          (candidate.important === winner.important && candidate.specificity === winner.specificity && candidate.order > winner.order)) {
        winner = candidate;
      }
    }
  }
  return winner && winner.value;
}

test('estimate print hides the sticky editing summary bar', () => {
  assert.equal(printedDisplay(printCss(html), 'summary-bar'), 'none');
});

test('estimate print hides the editable client form', () => {
  assert.equal(printedDisplay(printCss(html), 'client-panel'), 'none');
});
