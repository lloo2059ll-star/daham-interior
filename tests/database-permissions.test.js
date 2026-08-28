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
