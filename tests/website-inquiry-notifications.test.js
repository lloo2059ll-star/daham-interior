const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
test('both website and blog inquiries enqueue channel-specific private notifications', () => {
  const dir = path.join(__dirname, '../supabase/migrations');
  const file = fs.readdirSync(dir).find(f => f.endsWith('_website_inquiry_notifications.sql'));
  assert.ok(file, 'website notification fix migration exists');
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  assert.match(sql, /if new.source_channel in \('website', 'naver_blog'\) then/);
  assert.match(sql, /'신규 상담 · ' \|\| v_source_label/);
  assert.match(sql, /v_consult_title \|\| '가 접수되었습니다.'/);
  assert.match(sql, /on conflict \(dedupe_key\) do nothing/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function private/);
  assert.doesNotMatch(sql.slice(sql.indexOf('insert into public.notification_outbox')), /new\.phone|new\.message|new\.address_detail/);
});
