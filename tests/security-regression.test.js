const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPages = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const publicPages = new Set(['login.html', 'signup.html']);

test('every internal page starts the shared auth guard from head', () => {
  for (const page of htmlPages.filter(name => !publicPages.has(name))) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const authPosition = html.indexOf('<script src="auth.js"></script>');
    const headEnd = html.toLowerCase().indexOf('</head>');
    assert.ok(authPosition >= 0, `${page} is missing auth.js`);
    assert.ok(authPosition < headEnd, `${page} loads auth.js after protected content can render`);
  }
});

test('only login and compatibility signup pages are public', () => {
  assert.deepEqual([...publicPages].sort(), ['login.html', 'signup.html']);
  assert.match(fs.readFileSync(path.join(root, 'login.html'), 'utf8'), /DAHAM_AUTH\.login/);
  assert.match(fs.readFileSync(path.join(root, 'signup.html'), 'utf8'), /login\.html#signup/);
});

test('tracked frontend contains no service-role or secret Supabase key', () => {
  const files = fs.readdirSync(root).filter(name => /\.(?:html|js|json)$/.test(name));
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /service[_-]?role/i, `${file} contains a service-role marker`);
    assert.doesNotMatch(source, /sb_secret_/i, `${file} contains a secret Supabase key`);
  }
});

test('auth cleanup is scoped to auth storage keys', () => {
  const source = fs.readFileSync(path.join(root, 'auth.js'), 'utf8');
  const removals = [...source.matchAll(/localStorage\.removeItem\(([^)]+)\)/g)].map(match => match[1]);
  assert.deepEqual(removals, ['SESSION_KEY', 'PROFILE_KEY']);
  assert.doesNotMatch(source, /localStorage\.clear\s*\(/);
});
