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
  'contacts.html': '77656A2F19713C4CA7A4A776705320F416AC74BC4BB97F2F26E79E3A3F89141D',
  'as.html': 'EC6B0AF3EEBFAED8FA43710223368225A3DD137E2C16B69DF22F231EF66CD58D',
  'order.html': 'BDFC3C3EC20301DAF2DA22CD26FDB172B1C83DBFDA32E1518BF6A0D3C5FDA387',
  'payment.html': 'BD35473A555B22A9B74624E6CFF2FD18028D3FADCF107D5E494B53967FCC0F5F',
  'employees.html': 'B3C9E614C4800200E81E3F4E5E786B98EA65A150E0EA21EFF4111DDBC8815B71',
  'worklog.html': 'F1965877B692D2D5E656AB01FF2BB6E484D698CE6F092EDC797642C97B5B3AB0',
  'photos.html': '97A1B058DB2333546E0A9BEC379DA504EFC71833E2E819E165F6AE10A109FEF3',
  'schedule.html': 'EC815B83518963B99D33D348F0D5C54493B599D20E9DEA28D88E67879A63EEFB',
  'price-editor.html': '224CAD5AC97BFC8382352D7F2E830B24362F6ADCA36FAB126E0308B0E51F91E8',
  'contract.html': '29BD95048D5EFFB8949F1E93C7A76F63D825478DD677299B2DF393080BD3ACAE',
  'completion.html': '22D6F7C873976ED86A465DDD9935BA0B14531748915B5BB59DFD7618016672D7',
  'notice.html': '609D313669780A69A21D0422D76B390E1FCF9E04ABC9036076C75BA4BFA274C0',
  'spec.html': '87E7A5273228846AFB845A601F9AE8D4B58A4900F4D7ECBD33B72F3F7A8E1604',
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



