const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/auth-harness');

const SESSION_KEY = 'daham_supabase_session_v1';
const PROFILE_KEY = 'daham_supabase_profile_v1';

function session(active = true, role = 'staff') {
  return {
    auth: {
      access_token: 'user-jwt',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      user: { id: 'user-1', email: 'staff@example.com' }
    },
    profile: {
      id: 'user-1', email: 'staff@example.com', display_name: '직원',
      username: 'staff@example.com', role, is_active: active
    }
  };
}

test('signup returns approval pending and removes a session issued by autoconfirm', async () => {
  const fixture = session(false);
  const h = createHarness({ routes: {
    '/auth/v1/signup': { data: fixture.auth },
    '/rest/v1/profiles': { data: [fixture.profile] },
    '/auth/v1/logout': { data: {} }
  }});

  const result = await h.auth.createAccount({
    name: '신입 직원', email: 'new@example.com', password: 'password123'
  });

  assert.equal(result.approvalPending, true);
  assert.equal(h.values.has(SESSION_KEY), false);
  assert.equal(h.values.has(PROFILE_KEY), false);
  assert.match(result.message, /관리자 승인 대기/);
});

test('signup confirmation returns to the deployed login page', async () => {
  const h = createHarness({ routes: {
    '/auth/v1/signup': { data: { user: { id: 'new-user' } } }
  }});

  await h.auth.createAccount({
    name: '신입 직원', email: 'new@example.com', password: 'password123'
  });

  const signup = h.requests.find(request => request.url.includes('/auth/v1/signup'));
  const redirectTo = new URL(signup.url).searchParams.get('redirect_to');
  assert.equal(redirectTo, 'https://lloo2059ll-star.github.io/daham-interior/login.html');
});

test('login rejects an inactive profile as approval pending and keeps business storage', async () => {
  const fixture = session(false);
  const h = createHarness({ initial: { daham_detail_v2: '[{"id":"site-1"}]' }, routes: {
    '/auth/v1/token?grant_type=password': { data: fixture.auth },
    '/rest/v1/profiles': { data: [fixture.profile] }
  }});

  await assert.rejects(() => h.auth.login('staff@example.com', 'password123'), /관리자 승인 대기/);
  assert.equal(h.values.get('daham_detail_v2'), '[{"id":"site-1"}]');
  assert.equal(h.values.has(SESSION_KEY), false);
});

test('protected page refreshes the profile and redirects a newly suspended employee', async () => {
  const fixture = session(true);
  const savedSession = { ...fixture.auth, expires_at: Math.floor(Date.now() / 1000) + 3000 };
  const h = createHarness({
    page: 'index.html',
    initial: {
      [SESSION_KEY]: JSON.stringify(savedSession),
      [PROFILE_KEY]: JSON.stringify(fixture.profile)
    },
    routes: { '/rest/v1/profiles': { data: [{ ...fixture.profile, is_active: false }] } }
  });

  assert.equal(await h.auth.ready, false);
  assert.deepEqual(h.redirects, ['login.html']);
  assert.equal(h.values.has(SESSION_KEY), false);
});

test('owner employee API lists profiles and limits updates to safe role and active fields', async () => {
  const fixture = session(true, 'owner');
  const savedSession = { ...fixture.auth, expires_at: Math.floor(Date.now() / 1000) + 3000 };
  const h = createHarness({ initial: {
    [SESSION_KEY]: JSON.stringify(savedSession),
    [PROFILE_KEY]: JSON.stringify(fixture.profile)
  }, routes: {
    '/rest/v1/profiles?select=': { data: [fixture.profile] },
    '/rest/v1/profiles?id=eq.employee-2': request => ({
      data: [{ id: 'employee-2', role: 'admin', is_active: true }],
      status: request.options.method === 'PATCH' ? 200 : 405
    })
  }});

  const rows = await h.auth.listEmployees();
  assert.equal(rows.length, 1);
  await h.auth.updateEmployee('employee-2', { role: 'admin', is_active: true, email: 'hacker@example.com' });

  const patch = h.requests.find(request => request.options.method === 'PATCH');
  assert.deepEqual(JSON.parse(patch.options.body), { role: 'admin', is_active: true });
  assert.equal(patch.options.headers.Authorization, 'Bearer user-jwt');
  await assert.rejects(() => h.auth.updateEmployee('employee-2', { role: 'owner' }), /변경할 수 없는 권한/);
});

test('non-owner cannot call employee management APIs', async () => {
  const fixture = session(true, 'admin');
  const h = createHarness({ initial: {
    [SESSION_KEY]: JSON.stringify({ ...fixture.auth, expires_at: Math.floor(Date.now() / 1000) + 3000 }),
    [PROFILE_KEY]: JSON.stringify(fixture.profile)
  }, routes: {} });

  await assert.rejects(() => h.auth.listEmployees(), /대표만/);
});
