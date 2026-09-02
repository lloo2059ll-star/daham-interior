const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('login page provides employee signup inputs and approval-pending feedback', () => {
  const html = read('login.html');
  assert.match(html, /id="loginTab"/);
  assert.match(html, /id="signupTab"/);
  assert.match(html, /id="signupName"/);
  assert.match(html, /id="signupEmail"/);
  assert.match(html, /id="signupPassword"/);
  assert.match(html, /id="signupPasswordConfirm"/);
  assert.match(html, /관리자 승인 대기/);
  assert.match(html, /DAHAM_AUTH\.createAccount/);
});

test('legacy signup page safely forwards to the combined login page', () => {
  const html = read('signup.html');
  assert.match(html, /location\.replace\(['"]login\.html#signup['"]\)/);
  assert.doesNotMatch(html, /관리자 계정 만들기/);
});

test('employee page is guarded for owner and uses the employee management APIs', () => {
  const html = read('employees.html');
  assert.match(html, /DAHAM_AUTH\.ready/);
  assert.match(html, /role\s*!==\s*['"]owner['"]/);
  assert.match(html, /DAHAM_AUTH\.listEmployees/);
  assert.match(html, /DAHAM_AUTH\.updateEmployee/);
  assert.match(html, /role:\s*role/);
  assert.match(html, /is_active:\s*!employee\.is_active/);
});

test('dashboard employee link starts hidden and is revealed only for owner', () => {
  const html = read('index.html');
  assert.match(html, /id="employeesLink"[^>]*hidden/);
  assert.match(html, /u\.role===['"]owner['"]/);
  assert.match(html, /employeesLink\.hidden=false/);
});

test('dashboard navigation exposes the commercial estimate workspace', () => {
  const html = read('index.html');
  assert.match(html, /<a href="estimate-commercial\.html"><span class="ico">[^<]+<\/span>상가 견적<\/a>/);
});
