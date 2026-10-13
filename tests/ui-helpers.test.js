const test = require('node:test');
const assert = require('node:assert/strict');

let helpers;
try { helpers = require('../ui-helpers.js'); } catch (_) { helpers = null; }

test('confirmAction runs the callback only after an affirmative confirmation', () => {
  assert.ok(helpers, 'ui-helpers.js must provide the shared confirmation behavior');
  let calls = 0;
  assert.equal(helpers.confirmAction('삭제할까요?', () => { calls += 1; }, () => false), false);
  assert.equal(calls, 0);
  assert.equal(helpers.confirmAction('삭제할까요?', () => { calls += 1; }, () => true), true);
  assert.equal(calls, 1);
});

test('confirmAction supports asynchronous callbacks without hiding their result', async () => {
  assert.ok(helpers, 'ui-helpers.js must provide the shared confirmation behavior');
  const result = await helpers.confirmAction('완료할까요?', async () => 'saved', () => true);
  assert.equal(result, 'saved');
});
