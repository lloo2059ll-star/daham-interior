const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const syncPages = ['consult.html','estimate.html','estimate-commercial.html','schedule.html','spec.html','worklog.html'];

test('every internal sync page loads auth before synchronization code', () => {
  for (const page of syncPages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const authPosition = html.indexOf('<script src="auth.js"></script>');
    const syncPosition = html.indexOf('sync_data');
    assert.ok(authPosition >= 0 && authPosition < syncPosition, `${page} must load auth.js before sync_data code`);
  }
});

test('internal sync pages use the DAHAM auth config and employee JWT without publishable-key fallback', () => {
  for (const page of syncPages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /DAHAM_AUTH\.getSupabaseConfig\(\)/, `${page} must use shared DAHAM config`);
    assert.match(html, /DAHAM_AUTH\.getAccessToken\(\)/, `${page} must read employee JWT`);
    assert.doesNotMatch(html, /_authToken\s*\|\|\s*SUPA_KEY/, `${page} must not authorize as the publishable role`);
  }
});

test('public schedule sharing remains isolated from internal sync_data', () => {
  const html = fs.readFileSync(path.join(root, 'schedule-view.html'), 'utf8');
  assert.match(html, /daham_backup/);
  assert.doesNotMatch(html, /sync_data/);
});
