const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('database migration grants profile updates to authenticated users under RLS', () => {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const migrations = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
    : [];
  const sql = migrations
    .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
    .join('\n')
    .toLowerCase();

  assert.match(
    sql,
    /grant\s+update\s+on(?:\s+table)?\s+public\.profiles\s+to\s+authenticated\s*;/,
  );
});

test('database migration restricts consultation removal to active owner and admin users', () => {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const sql = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
    .join('\n')
    .toLowerCase();

  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.delete_consult_record/);
  assert.match(sql, /role\s+in\s*\(\s*'owner'\s*,\s*'admin'\s*\)/);
  assert.match(sql, /create\s+trigger\s+protect_consult_deletions/);
  assert.match(sql, /before\s+update\s+or\s+delete\s+on\s+public\.sync_data/);
  assert.doesNotMatch(sql, /auth\.uid\(\)\)\s+is\s+null\s+or/);
  assert.match(sql, /new\.key\s+is\s+distinct\s+from\s+old\.key/);
  assert.match(sql, /security\s+invoker[\s\S]*public\.delete_consult_record|public\.delete_consult_record[\s\S]*security\s+invoker/);
  assert.match(sql, /revoke\s+execute\s+on\s+function\s+public\.delete_consult_record\(text\)\s+from\s+public\s*,\s*anon/);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.delete_consult_record\(text\)\s+to\s+authenticated/);
});

test('database integration script exercises staff denial and owner deletion with rollback', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'tests', 'consult_delete_security.sql'),
    'utf8',
  ).toLowerCase();
  assert.match(sql, /set_config\('request\.jwt\.claim\.sub',\s*staff_id::text/);
  assert.match(sql, /update\s+public\.sync_data[\s\S]*delete\s+from\s+public\.sync_data/);
  assert.match(sql, /perform\s+public\.delete_consult_record\(test_id\)/);
  assert.match(sql, /set_config\('request\.jwt\.claim\.sub',\s*owner_id::text/);
  assert.match(sql, /rollback\s*;/);
});

