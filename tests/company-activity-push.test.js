const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrations = path.join(__dirname, '..', 'supabase', 'migrations');
function migration() {
  const file = fs.readdirSync(migrations).find(name => name.endsWith('_company_activity_push.sql'));
  assert.ok(file, 'company activity push migration must exist');
  return fs.readFileSync(path.join(migrations, file), 'utf8');
}

test('company push migration creates every RLS protected table', () => {
  const sql = migration();
  for (const table of ['companies','company_memberships','project_assignments','activity_events','push_subscriptions','notification_outbox']) {
    assert.match(sql, new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+public\\.${table}`, 'i'), table);
    assert.match(sql, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'), `${table} RLS`);
  }
});

test('new Data API tables receive explicit grants and company-scoped policies', () => {
  const sql = migration();
  assert.match(sql, /grant\s+select[\s\S]*on\s+table\s+public\.activity_events\s+to\s+authenticated/i);
  assert.match(sql, /grant\s+select[\s\S]*on\s+table\s+public\.push_subscriptions\s+to\s+authenticated/i);
  assert.match(sql, /company_memberships[\s\S]*profile_id\s*=\s*\(select\s+auth\.uid\(\)\)[\s\S]*status\s*=\s*'active'/i);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /auth\.role\(\)/i);
});

test('membership RLS uses a non-recursive security definer helper', () => {
  const sql = migration();
  assert.match(sql, /function\s+private\.is_active_company_member\s*\(p_company_id\s+uuid\)[\s\S]*security\s+definer/i);
  assert.match(sql, /policy\s+memberships_company_read[\s\S]*private\.is_active_company_member\(company_memberships\.company_id\)/i);
  assert.doesNotMatch(sql, /policy\s+memberships_company_read[\s\S]{0,500}from\s+public\.company_memberships/i);
});

test('activity publication derives actor from auth and queues a deduplicated push', () => {
  const sql = migration();
  assert.match(sql, /function\s+public\.publish_activity/i);
  assert.match(sql, /actor_id[\s\S]*auth\.uid\(\)/i);
  assert.match(sql, /on\s+conflict\s*\(dedupe_key\)/i);
  assert.match(sql, /revoke\s+execute\s+on\s+function\s+public\.publish_activity/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.publish_activity[\s\S]*to\s+authenticated/i);
});

test('push subscription RPC only stores the current active employee device', () => {
  const sql = migration();
  assert.match(sql, /function\s+public\.register_push_subscription/i);
  assert.match(sql, /profile_id[\s\S]*auth\.uid\(\)/i);
  assert.match(sql, /on\s+conflict\s*\(endpoint\)/i);
  assert.match(sql, /status\s*=\s*'active'/i);
  assert.match(sql, /function\s+public\.get_push_public_key/i);
});

test('test notification passes a real jsonb changed-fields value', () => {
  const sql = migration();
  assert.match(sql, /publish_activity\([^;]*'\{\}'::jsonb[^;]*'index\.html'/i);
});

test('project deletion permission is owner or assigned employee and never generic admin', () => {
  const sql = migration();
  assert.match(sql, /function\s+private\.can_delete_project/i);
  assert.match(sql, /role\s*=\s*'owner'/i);
  assert.match(sql, /public\.project_assignments/i);
  assert.doesNotMatch(sql, /role\s+in\s*\([^)]*'admin'/i);
});
