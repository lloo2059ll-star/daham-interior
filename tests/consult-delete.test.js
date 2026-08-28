const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { canDeleteConsult, removeConsult } = require('../consult-delete');

const root = path.join(__dirname, '..');
const consult = fs.readFileSync(path.join(root, 'consult.html'), 'utf8');

test('consult rows expose delete actions only to owner and admin', () => {
  assert.match(consult, /DAHAM_CONSULT_DELETE\.canDeleteConsult\(_currentUser\)/);
  assert.match(consult, /_canDeleteConsult\s*\?/);
  assert.match(consult, /class="consult-delete-btn"/);
  assert.match(consult, /event\.stopPropagation\(\).*deleteRecord/);
});

test('consult deletion requires confirmation and succeeds through the protected database RPC', () => {
  assert.match(consult, /window\.confirm\('정말 삭제하시겠습니까\?'\)/);
  assert.match(consult, /_sb\.rpc\('delete_consult_record',\s*\{p_record_id:id\}\)/);
  assert.match(consult, /if\s*\(!_canDeleteConsult\)/);
  assert.doesNotMatch(consult, /saveDB\(db\);closeModal\(\);renderTabs\(\);renderList\(\)/);
});

test('consult deletion roles are owner and admin only', () => {
  assert.equal(canDeleteConsult({ role: 'owner', isActive: true }), true);
  assert.equal(canDeleteConsult({ role: 'admin', isActive: true }), true);
  assert.equal(canDeleteConsult({ role: 'staff', isActive: true }), false);
  assert.equal(canDeleteConsult({ role: 'admin', isActive: false }), false);
  assert.match(consult, /DAHAM_AUTH\.ready\.then\(function\(ready\)/);
  assert.match(consult, /_currentUser\s*=\s*DAHAM_AUTH\.currentUser\(\)/);
});

test('cancelled consultation deletion never calls the database', async () => {
  let rpcCalls = 0;
  const result = await removeConsult({
    id: 'consult-1',
    user: { role: 'owner', isActive: true },
    confirmDelete: () => false,
    rpc: async () => { rpcCalls += 1; },
    loadLocal: () => [{ id: 'consult-1' }],
    saveLocal: () => assert.fail('cancel must not save'),
  });
  assert.deepEqual(result, { deleted: false, cancelled: true });
  assert.equal(rpcCalls, 0);
});

test('successful consultation deletion removes only the target from local storage', async () => {
  let saved;
  let timestamp;
  const result = await removeConsult({
    id: 'consult-1',
    user: { role: 'admin', isActive: true },
    confirmDelete: message => message === '정말 삭제하시겠습니까?',
    rpc: async id => ({ data: { deleted: true, id, updated_at: '2026-08-28T09:00:00Z' }, error: null }),
    loadLocal: () => [{ id: 'consult-1' }, { id: 'local-only' }],
    saveLocal: records => { saved = records; },
    setTimestamp: value => { timestamp = value; },
  });
  assert.equal(result.deleted, true);
  assert.deepEqual(saved, [{ id: 'local-only' }]);
  assert.equal(timestamp, '2026-08-28T09:00:00Z');
});

test('database deletion errors preserve all local consultation data', async () => {
  const original = [{ id: 'consult-1' }, { id: 'consult-2' }];
  let saved = false;
  await assert.rejects(() => removeConsult({
    id: 'consult-1',
    user: { role: 'owner', isActive: true },
    confirmDelete: () => true,
    rpc: async () => ({ data: null, error: { message: 'not found' } }),
    loadLocal: () => original,
    saveLocal: () => { saved = true; },
  }), /not found/);
  assert.equal(saved, false);
  assert.deepEqual(original, [{ id: 'consult-1' }, { id: 'consult-2' }]);
});

