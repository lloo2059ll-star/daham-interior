const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260903143000_public_website_erp.sql');

function sqlText(){
  return fs.readFileSync(migrationPath, 'utf8').toLowerCase();
}

test('public website migration isolates public data with RLS and minimum grants', () => {
  const sql = sqlText();
  assert.match(sql, /create table if not exists public\.website_portfolio/);
  assert.match(sql, /create table if not exists public\.website_inquiries/);
  assert.match(sql, /alter table public\.website_portfolio enable row level security/);
  assert.match(sql, /alter table public\.website_inquiries enable row level security/);
  assert.match(sql, /revoke all on table public\.website_portfolio from anon, authenticated/);
  assert.match(sql, /revoke all on table public\.website_inquiries from anon, authenticated/);
  assert.match(sql, /grant select on table public\.website_portfolio to anon/);
  assert.match(sql, /grant insert on table public\.website_inquiries to anon/);
  assert.doesNotMatch(sql, /grant\s+select[^;]*public\.website_inquiries[^;]*to\s+anon/);
  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete)[^;]*public\.sync_data[^;]*to\s+anon/);
});

test('anonymous policies expose published portfolio rows and insert-only inquiries', () => {
  const sql = sqlText();
  assert.match(sql, /website_portfolio_public_read[\s\S]*for select[\s\S]*to anon[\s\S]*is_published = true/);
  assert.match(sql, /website_inquiries_public_insert[\s\S]*for insert[\s\S]*to anon[\s\S]*privacy_consent = true/);
  assert.match(sql, /honeypot/);
  assert.match(sql, /source = 'website'/);
});

test('inquiry trigger appends atomically to ERP consult data without public function access', () => {
  const sql = sqlText();
  assert.match(sql, /create or replace function private\.import_website_inquiry_to_consult\(\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /where key = 'daham_consult_v1'[\s\S]*for update/);
  assert.match(sql, /websiteinquiryid/);
  assert.match(sql, /'source', '홈페이지'/);
  assert.match(sql, /create trigger website_inquiry_to_consult/);
  assert.match(sql, /after insert on public\.website_inquiries/);
  assert.match(sql, /revoke all on function private\.import_website_inquiry_to_consult\(\) from public, anon, authenticated/);
});

test('integration SQL checks anon boundaries and rolls back', () => {
  const p = path.join(__dirname, '..', 'supabase', 'tests', 'website_public_security.sql');
  const sql = fs.readFileSync(p, 'utf8').toLowerCase();
  assert.match(sql, /begin\s*;/);
  assert.match(sql, /set local role anon/);
  assert.match(sql, /insert into public\.website_inquiries/);
  assert.match(sql, /daham_consult_v1/);
  assert.match(sql, /rollback\s*;/);
});
