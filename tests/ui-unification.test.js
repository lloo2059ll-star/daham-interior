const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').toUpperCase();

const protectedHashes = {
  'consult-demo.html': '6F88BC07D467D2513F34522A666249B5C57AF7A20BC87B5E14D71630EF6EE11E',
  'design-demo.html': '1FF3C2A3D39091A53BB27E24FA9F83EF75FCBEE99418B9877AFA92A77CE6C011',
  'estimate-detail.html': 'FC6DB88AF2922FCC837DDBCB5D1D02184912FE79EC8B2C231E7491BCCFEE97A7',
  'estimate-summary.html': 'CCCCB96CAF71A79107C0E37FFF1EC6573DE8E61E26A975A8B29B12E64693E9A4',
  'index.html': '95DB5BB10363A47F092CCFD3201D0958F54729CD558F4E2008CB709416327759',
  'index.prototype.html': '0FD2908BA94B1558891F764B45D76FE34EBB47416E2BFCE3C1134FE9C5AF29B2',
  'v2-suite.css': '75B945A4C974842E52AFD2B10F514B29A84A348AE10BE1DF517E818B95848D1D',
  'v2-suite.js': '3255683CE809F27D117CD6861C0D09DA2E2A50EE691581E2D402AC3792DA57DF',
  'v2-theme.css': '1C572D773C246435EA590E97B027363A5499C40D7A960DB7CCFA4F73AAA18024'
};

const targets = {
  'operations-admin': [
    'consult.html', 'contacts.html', 'as.html', 'order.html', 'payment.html',
    'employees.html', 'worklog.html', 'photos.html', 'schedule.html', 'price-editor.html'
  ],
  'operations-document': [
    'contract.html', 'completion.html', 'notice.html', 'spec.html', 'schedule-view.html'
  ],
  'operations-auth': ['login.html', 'signup.html']
};

const functionalHashes = {
  'consult.html': 'D914C99018B05CDF359F7A105252C93A4240D01F41C89C1DBBF2FC63C2E22134',
  'contacts.html': '657A1694854B698CA05EC77C48C96BFE86D474F1A4C5C162A4B68E41959AF7CC',
  'as.html': 'AAEC0191742B80630FDB6F614B103D8A02F54DEF218C17317E3C028CA3EBE2B5',
  'order.html': 'CAAA604B16C421BF95935475A438F15A1BCC1F5A4CF2AD60906E96545F301EDB',
  'payment.html': '9DD8DDC17004E9C044D4116DECB253EE7BE844FFB73F02DE509DA32CA6F60C12',
  'employees.html': '7557036FDFA1A0A9743D473B2D8AFCA8B81F1390721299BE421DDC6704D7C49F',
  'worklog.html': 'B8C3B0B1649EE4EEA2807F6FC6052C6A136AEBBA4514447D8F5E0E2555F53005',
  'photos.html': '1B34205A54AB48C60032BDAA1F6BA6C39C141BD20EBB8CB23295121A237D29E1',
  'schedule.html': '7B8ED45DCC570320DF21BD3BF63B432C6CAD6B2FBAC25BEEDBA9F3F4EB3399D5',
  'price-editor.html': '2558C907B8B4DB5791814D95FBB1ADBC0BB57CC9E3EF0AA632167CD0244D46E0',
  'contract.html': 'CB0B0D32FF345CD3949542CFF30BCFD70F6AA3E93954FDCB5126206096D0B6A0',
  'completion.html': '905EA568E7EEE3ABF9AF3AE28ED8B91FDFDB9B437175AA016EEF813A0B1C93A6',
  'notice.html': '1ACB11AE9BB770F72411AD3542534CEA80420C41C9AE1B8A25D73F129CC1ADDD',
  'spec.html': 'B031F789BC0962379E9FFB4B41424DCE1D479A19A267973B4021FECEA4A02FE4',
  'schedule-view.html': 'BEFE00FCA1831AE902B77EDE18C25674A0884CB77A6555D669F2D7236E1317B0',
  'login.html': 'DBB71C366B3920C5DB7B57E4CDD901B67275FFE34493FFD0D4973DC018EE40FA',
  'signup.html': '89085515E2D4E729A88223C376A08ADFDCB25E9AD4DA53D3FA809B298498AB62'
};

function values(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function functionalHash(html) {
  const signature = {
    scripts: values(html, /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
    ids: values(html, /\bid=["']([^"']+)["']/gi),
    names: values(html, /\bname=["']([^"']+)["']/gi),
    handlers: values(html, /\bon(?:click|change|input|submit|blur|focus|keydown|keyup)=["']([^"']*)["']/gi),
    links: values(html, /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi),
    printBlocks: (html.match(/@media\s+print\b/gi) || []).length
  };
  return crypto.createHash('sha256').update(JSON.stringify(signature)).digest('hex').toUpperCase();
}

test('protected reference and excluded files stay byte-identical', () => {
  for (const [file, expected] of Object.entries(protectedHashes)) {
    assert.equal(sha256(file), expected, `${file} must remain byte-identical`);
  }
});
test('only approved production pages consume the operations visual layer', () => {
  for (const [kind, files] of Object.entries(targets)) {
    for (const file of files) {
      const html = read(file);
      assert.match(html, /<link\s+rel=["']stylesheet["']\s+href=["']operations-ui\.css(?:\?[^"']+)?["']\s*\/?>/i, `${file} must load operations-ui.css`);
      const body = html.match(/<body\b([^>]*)>/i);
      assert.ok(body, `${file} must contain body`);
      assert.match(body[1], /\boperations-ui\b/, `${file} must scope operations styles`);
      assert.match(body[1], new RegExp(`\\b${kind}\\b`), `${file} must use ${kind}`);
    }
  }

  for (const file of Object.keys(protectedHashes)) {
    if (!file.endsWith('.html')) continue;
    assert.doesNotMatch(read(file), /operations-ui\.css/i, `${file} must not consume operations styles`);
  }

  const approved = new Set(Object.values(targets).flat());
  for (const file of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
    if (approved.has(file)) continue;
    assert.doesNotMatch(read(file), /operations-ui\.css/i, `${file} is outside the approved operations scope`);
  }
});

test('production page scripts, hooks, links, and print contracts stay unchanged', () => {
  const mismatches = [];
  for (const [file, expected] of Object.entries(functionalHashes)) {
    const actual = functionalHash(read(file));
    if (actual !== expected) mismatches.push({ file, expected, actual });
  }
  assert.deepEqual(mismatches, [], `functional signatures changed: ${JSON.stringify(mismatches)}`);
});

test('operations stylesheet exposes scoped components and print neutrality', () => {
  const css = read('operations-ui.css');
  for (const token of ['bg', 'card', 'text', 'muted', 'line', 'nav', 'accent', 'success', 'warning', 'danger']) {
    assert.match(css, new RegExp(`--ops-${token}\\s*:`), `missing --ops-${token}`);
  }
  assert.match(css, /\.operations-ui\s+\.toolbar/);
  assert.match(css, /\.operations-ui\s+(?:\.modal|\.modal-bg|\.modal-overlay)/);
  assert.match(css, /@media\s*\([^)]*max-width\s*:\s*760px[^)]*\)/i);
  assert.match(css, /@media\s+print/i);
});

test('authentication shell keeps its full responsive width', () => {
  const css = read('operations-ui.css');
  assert.match(
    css,
    /\.operations-ui\.operations-auth\s+\.login-shell\s*\{[^}]*\bwidth\s*:\s*100%/s,
    'the grid-hosted login shell must not shrink to its content width'
  );
  assert.match(css, /\.operations-ui\.operations-auth\s*\{[^}]*\bpadding\s*:\s*0\b/s);
});

test('operations visual rules are isolated from printed documents', () => {
  const css = read('operations-ui.css');
  assert.match(css, /visual system\.[\s\S]*?@media\s+screen\s*\{/i);
  const printBlock = css.match(/@media\s+print\s*\{([\s\S]*)\}\s*$/i);
  assert.ok(printBlock, 'an explicit print-neutral block must close the stylesheet');
  assert.doesNotMatch(printBlock[1], /\b(?:width|padding|margin|display|border|box-shadow|background)\s*:/i);
});

test('document controls keep their fixed document dimensions', () => {
  const css = read('operations-ui.css');
  assert.doesNotMatch(css, /\.operations-ui\s+input\s*,/);
  assert.match(css, /\.operations-ui:not\(\.operations-document\)\s+input:not\(\[type=["']?checkbox/);
  assert.match(css, /input:not\([^}]+\):not\(\[type=["']?radio/);
});

test('price editor title row and action toolbar use a dedicated adapter', () => {
  const html = read('price-editor.html');
  const css = read('operations-ui.css');
  assert.match(html.match(/<body\b([^>]*)>/i)[1], /\boperations-price-editor\b/);
  assert.match(css, /\.operations-ui\.operations-price-editor\s+\.top\s*\{/);
  assert.match(css, /\.operations-ui\.operations-price-editor\s+\.top\s+\.toolbar\s*\{/);
});

test('mobile and tablet breakpoint layers stay screen-only', () => {
  const css = read('operations-ui.css');
  for (const width of [1024, 767, 430]) {
    assert.match(
      css,
      new RegExp(`@media\\s+screen\\s+and\\s*\\(max-width:\\s*${width}px\\)`),
      `missing ${width}px screen breakpoint`
    );
  }
  assert.doesNotMatch(css, /@media\s+screen\s+and\s*\(min-width:\s*1025px\)/);
});

test('responsive layer provides touch, overflow, modal, and long-text safety', () => {
  const css = read('operations-ui.css');
  assert.match(css, /--ops-touch-size\s*:\s*44px/);
  assert.match(css, /overflow-x\s*:\s*auto/);
  assert.match(css, /max-height\s*:\s*calc\(100dvh\s*-\s*16px\)/);
  assert.match(css, /overflow-wrap\s*:\s*anywhere/);
  assert.match(css, /overscroll-behavior-inline\s*:\s*contain/);
  assert.match(css, /@media\s+screen\s+and\s*\(hover:\s*none\)\s*,\s*screen\s+and\s*\(pointer:\s*coarse\)/);
  assert.match(css, /\.album-del-btn[\s\S]*?\.photo-del-btn[\s\S]*?min-width\s*:\s*44px/);
  assert.match(css, /\.modal-ft[\s\S]*?\.modal-foot[\s\S]*?flex-wrap\s*:\s*wrap/);
  assert.match(css, /\.operations-ui\.operations-worklog \.proj-cards/);
  assert.match(css, /\.operations-ui:not\(\.operations-document\) button/);
});

test('layout-specific production pages expose presentation adapters', () => {
  const adapters = {
    'employees.html': 'operations-employees',
    'schedule.html': 'operations-schedule',
    'photos.html': 'operations-photos',
    'worklog.html': 'operations-worklog'
  };
  for (const [file, adapter] of Object.entries(adapters)) {
    const body = read(file).match(/<body\b([^>]*)>/i);
    assert.ok(body, `${file} must contain body`);
    assert.match(body[1], new RegExp(`\\b${adapter}\\b`), `${file} must use ${adapter}`);
  }
});



