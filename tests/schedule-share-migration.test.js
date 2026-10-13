const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('schedule share storage is public-read, authenticated staff-write, and expires',()=>{
  const file=path.join(__dirname,'..','supabase','migrations','20261013090000_schedule_shares.sql');
  assert.ok(fs.existsSync(file),'schedule_shares migration must exist');
  const sql=fs.readFileSync(file,'utf8');
  assert.match(sql,/create table[^;]*schedule_shares/i);
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/grant select on[^;]*schedule_shares to anon/i);
  assert.doesNotMatch(sql,/grant (insert|update|delete|all)[^;]*schedule_shares to anon/i);
  assert.match(sql,/private\.is_active_staff\(\)/i);
  assert.match(sql,/expires_at/i);
  assert.match(sql,/schedule_shares_created_by_idx/i);
});
