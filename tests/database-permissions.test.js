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
test('database migration protects price settings writes with active owner or admin authorization', () => {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const sql = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
    .join('\n')
    .toLowerCase();

  assert.match(sql, /create\s+trigger\s+protect_price_settings/);
  assert.match(sql, /daham_settings_v1/);
  assert.match(sql, /role\s+in\s*\(\s*'owner'\s*,\s*'admin'\s*\)/);
  assert.match(sql, /is_active\s*=\s*true/);
  assert.match(sql, /before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+public\.sync_data/);
});

test('database integration script proves staff denial and owner price settings update with rollback', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'tests', 'price_settings_security.sql'),
    'utf8',
  ).toLowerCase();
  assert.match(sql, /set_config\('request\.jwt\.claim\.sub',\s*staff_id::text/);
  assert.match(sql, /daham_settings_v1/);
  assert.match(sql, /raise exception 'staff price update unexpectedly succeeded'/);
  assert.match(sql, /set_config\('request\.jwt\.claim\.sub',\s*owner_id::text/);
  assert.match(sql, /rollback\s*;/);
});

test('project price overrides are merged atomically through the protected settings record', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/20260830103000_atomic_project_price_overrides.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.update_project_price_overrides/);
  assert.match(sql, /private\.can_manage_prices\(\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /projectPriceOverrides/);
  assert.match(sql, /grant execute .* to authenticated/i);
});

test('site journal migration creates private, company-scoped journal and archive storage', () => {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const migrationName = fs.readdirSync(migrationsDir)
    .find((name) => /_site_journal_storage\.sql$/.test(name));
  assert.ok(migrationName, 'site journal storage migration is required');

  const sql = fs.readFileSync(path.join(migrationsDir, migrationName), 'utf8').toLowerCase();

  assert.match(sql, /create table if not exists public\.site_journals/);
  assert.match(sql, /create table if not exists public\.site_journal_photos/);
  assert.match(sql, /create table if not exists public\.completion_archives/);
  assert.match(sql, /version bigint not null default 1 check \(version > 0\)/);
  assert.match(sql, /visit_type text not null check \(visit_type in \('visit', 'remote', 'none'\)\)/);
  assert.match(sql, /byte_size bigint not null check \(byte_size > 0\)/);
  assert.match(sql, /status text not null check \(status in \('uploading', 'ready', 'failed', 'missing'\)\)/);
  assert.match(sql, /status text not null check \(status in \('queued', 'processing', 'ready', 'failed'\)\)/);
  assert.match(sql, /site_journals_active_company_project_date_idx[\s\S]*where deleted_at is null/);
  assert.match(sql, /site_journal_photos_active_journal_sort_idx[\s\S]*where deleted_at is null/);
  assert.match(sql, /completion_archives_one_active_request_idx[\s\S]*where status in \('queued', 'processing'\)/);
  assert.match(sql, /'site-journal-originals'[\s\S]*false[\s\S]*26214400/);
  assert.match(sql, /'site-journal-thumbnails'[\s\S]*false/);
  assert.match(sql, /'completion-archives'[\s\S]*false/);
  assert.match(sql, /alter table public\.site_journals enable row level security/);
  assert.match(sql, /alter table public\.site_journal_photos enable row level security/);
  assert.match(sql, /alter table public\.completion_archives enable row level security/);
  assert.match(sql, /grant select, insert, update, delete on table public\.site_journals to authenticated/);
  assert.match(sql, /grant select, insert, update, delete on table public\.site_journal_photos to authenticated/);
  assert.match(sql, /role in \('owner', 'admin'\)/);
  assert.match(sql, /on storage\.objects\s+for insert to authenticated/);
  assert.match(sql, /private\.is_active_company_member/);
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\]/);
  assert.match(sql, /create or replace function private\.can_delete_verified_original\(p_path text\)/);
  assert.match(sql, /status = 'ready'[\s\S]*completed_at is not null[\s\S]*zip_path is not null[\s\S]*zip_bytes is not null[\s\S]*zip_sha256 is not null/);
  assert.match(sql, /create policy site_journal_original_objects_delete on storage\.objects[\s\S]*bucket_id = 'site-journal-originals'[\s\S]*private\.can_delete_verified_original\(name\)/);
  assert.match(sql, /create policy site_journal_thumbnail_objects_delete on storage\.objects[\s\S]*bucket_id = 'site-journal-thumbnails'/);
  assert.match(sql, /create trigger site_journals_author_immutable[\s\S]*before update of author_id on public\.site_journals/);
  assert.match(sql, /create trigger site_journal_photos_created_by_immutable[\s\S]*before update of created_by on public\.site_journal_photos/);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/);
});

test('site journal SQL security test proves company isolation and archive authorization with rollback', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'tests', 'site_journal_storage_security.sql'),
    'utf8',
  ).toLowerCase();

  assert.match(sql, /set local role authenticated/);
  assert.match(sql, /same-company staff journal write unexpectedly failed/);
  assert.match(sql, /cross-company journal read unexpectedly succeeded/);
  assert.match(sql, /cross-company journal write unexpectedly succeeded/);
  assert.match(sql, /set_config\('test\.site_journal\.foreign_company_id'/);
  assert.match(sql, /current_setting\('test\.site_journal\.foreign_company_id'\)::uuid/);
  assert.match(sql, /staff archive creation unexpectedly succeeded/);
  assert.match(sql, /staff archive deletion unexpectedly succeeded/);
  assert.match(sql, /staff journal author reassignment unexpectedly succeeded/);
  assert.match(sql, /staff photo creator reassignment unexpectedly succeeded/);
  assert.match(sql, /owner archive creation unexpectedly failed/);
  assert.match(sql, /rollback\s*;/);
});

test('orphan original cleanup is limited to the active uploader and never ready metadata', () => {
  const root = path.join(__dirname, '..');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260903223000_site_journal_orphan_cleanup.sql'), 'utf8').toLowerCase();
  const sql = fs.readFileSync(path.join(root, 'supabase/tests/site_journal_orphan_cleanup_security.sql'), 'utf8').toLowerCase();
  assert.match(migration, /create or replace function private\.can_cleanup_unreferenced_site_journal_original/);
  assert.match(migration, /owner_id = \(select auth\.uid\(\)::text\)/);
  assert.match(migration, /not exists[\s\S]*site_journal_photos/);
  assert.match(migration, /private\.can_delete_verified_original\(name\)[\s\S]*or[\s\S]*private\.can_cleanup_unreferenced_site_journal_original\(name\)/);
  assert.match(sql, /orphan original cleanup unexpectedly failed/);
  assert.match(sql, /referenced original cleanup unexpectedly succeeded/);
  assert.match(sql, /rollback\s*;/);
});

test('site journal photo metadata cleanup is authorized to the row creator at the database', () => {
  const root = path.join(__dirname, '..');
  const migrationsDir = path.join(root, 'supabase', 'migrations');
  const migrationName = fs.readdirSync(migrationsDir)
    .find((name) => /_restrict_site_journal_photo_cleanup\.sql$/.test(name));
  assert.ok(migrationName, 'follow-up photo cleanup ownership migration is required');
  const migration = fs.readFileSync(path.join(migrationsDir, migrationName), 'utf8').toLowerCase();
  const sql = fs.readFileSync(path.join(root, 'supabase/tests/site_journal_photo_cleanup_security.sql'), 'utf8').toLowerCase();

  assert.match(migration, /drop policy if exists site_journal_photos_company_delete on public\.site_journal_photos/);
  assert.match(migration, /create policy site_journal_photos_creator_delete on public\.site_journal_photos[\s\S]*for delete to authenticated[\s\S]*private\.is_active_company_member\(company_id\)[\s\S]*created_by = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /on storage\.objects|completion_archives/);
  assert.match(sql, /staff deleted another uploader''s photo row/);
  assert.match(sql, /staff could not delete their own stale photo row/);
  assert.match(sql, /rollback\s*;/);
});
