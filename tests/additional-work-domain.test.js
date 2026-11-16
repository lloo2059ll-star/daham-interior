const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const modulePath = path.join(__dirname, '..', 'additional-work-domain.js');

const domain = () => require(modulePath);

test('blank form keeps all data and total blank with seven writing rows', () => {
  const D = domain(), draft = D.createBlankDraft();
  assert.equal(draft.items.length, 7);
  for (const name of ['site','customer','date','vat','notes','confirmedOn']) assert.equal(draft[name], '');
  assert.ok(draft.items.every(row => row.description === '' && row.amount === ''));
  assert.equal(D.calculateTotal(draft.items), null);
  assert.equal(D.formatAmount(null), '');
});

test('money accepts pasted grouping and deduction amounts without treating blank as zero', () => {
  const D = domain();
  for (const [raw, expected] of [['',null],['   ',null],['0',0],['250,000',250000],['-50,000',-50000],[125000,125000]]) {
    assert.equal(D.parseAmount(raw), expected);
  }
  assert.equal(D.formatAmount(0), '0');
  assert.equal(D.formatAmount(-50000), '-50,000');
});

test('invalid money is rejected instead of silently dropping characters or rounding', () => {
  const D = domain();
  for (const value of ['25만원','12,34','1,000oops','250000.5','1e6',Infinity,'9007199254740992']) {
    assert.throws(() => D.parseAmount(value));
  }
});

test('total handles blank rows, deductions and explicit zero and rejects unsafe sums', () => {
  const D = domain();
  assert.equal(D.calculateTotal([{amount:'250,000'},{amount:''},{amount:'-50,000'},{amount:'0'}]), 200000);
  assert.equal(D.calculateTotal([{amount:'0'}]), 0);
  assert.throws(() => D.calculateTotal([{amount:'12,34'}]));
  assert.throws(() => D.calculateTotal([{amount:'9007199254740991'},{amount:'1'}]));
});

test('rendered document escapes all user input and preserves line breaks', () => {
  const D = domain(), draft = D.createBlankDraft();
  draft.site = '<img src=x onerror=alert(1)>';
  draft.customer = 'A & B';
  draft.notes = '<script>bad()</script>';
  draft.items[0] = {description:'도어 <교체>\n필름 & 마감',amount:'250000'};
  const html = D.renderDocument(draft);
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('도어 &lt;교체&gt;<br>필름 &amp; 마감'));
  assert.ok(html.includes('250,000'));
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
});

test('rendering preserves a draft and selected VAT label without inventing tax charges', () => {
  const D = domain(), draft = D.createBlankDraft();
  draft.vat = 'excluded';
  draft.items[0] = {description:'추가 작업',amount:'250000'};
  const original = JSON.stringify(draft), html = D.renderDocument(draft);
  assert.equal(JSON.stringify(draft), original);
  assert.ok(html.includes('250,000'));
  assert.ok(!html.includes('275,000'));
  assert.ok(html.includes('별도'));
});

test('normalization copies input and retains filled rows beyond the blank minimum', () => {
  const D = domain(), raw = {site:'현장',items:Array.from({length:10},(_,i)=>({description:'작업 '+i,amount:String(i)}))};
  const draft = D.normalizeDraft(raw);
  assert.equal(draft.items.length, 10);
  draft.items[0].description = 'changed';
  assert.equal(raw.items[0].description, '작업 0');
  assert.equal(D.normalizeDraft({items:null}).items.length, 7);
});
