const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('manifest describes an installable standalone DAHAM app', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
});

test('shared auth loads manifest and push client on every protected page', () => {
  const auth = read('auth.js');
  assert.match(auth, /rel=['"]manifest['"]/);
  assert.match(auth, /daham-push\.js/);
  assert.match(auth, /DAHAM_PUSH\.init/);
});

test('push client exports platform detection and VAPID conversion helpers', () => {
  const source = read('daham-push.js');
  const sandbox = { module: { exports: {} }, exports: {}, globalThis: {}, Uint8Array, atob: value => Buffer.from(value, 'base64').toString('binary') };
  vm.runInNewContext(source, sandbox);
  const push = sandbox.module.exports;
  assert.equal(push.isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), true);
  assert.equal(push.isIos('Mozilla/5.0 (Linux; Android 14)'), false);
  assert.deepEqual(Array.from(push.urlBase64ToUint8Array('AQID')), [1, 2, 3]);
});

test('notification permission is requested only from explicit subscribe', () => {
  const source = read('daham-push.js');
  const requestIndex = source.indexOf('Notification.requestPermission');
  const subscribeIndex = source.indexOf('async function subscribe');
  const initIndex = source.indexOf('async function init');
  assert.ok(requestIndex > subscribeIndex);
  assert.ok(requestIndex < initIndex || initIndex < subscribeIndex);
  assert.doesNotMatch(source.slice(initIndex, subscribeIndex), /requestPermission/);
});

test('service worker displays pushes and opens only same-origin relative targets', () => {
  const worker = read('service-worker.js');
  assert.match(worker, /addEventListener\(['"]push['"]/);
  assert.match(worker, /showNotification/);
  assert.match(worker, /addEventListener\(['"]notificationclick['"]/);
  assert.match(worker, /new URL\(target,self\.location\.origin\)/);
  assert.match(worker, /url\.origin!==self\.location\.origin/);
});

test('subscription registration uses authenticated DAHAM headers', () => {
  const source = read('daham-push.js');
  assert.match(source, /DAHAM_AUTH\.getAuthHeaders\(\)/);
  assert.match(source, /register_push_subscription/);
  assert.doesNotMatch(source, /service[_-]?role/i);
});

test('push initialization waits until document body exists', async () => {
  const source = read('daham-push.js');
  let domReady;
  const document = {
    body: null,
    addEventListener(type, listener) {
      if (type === 'DOMContentLoaded') domReady = listener;
    },
    getElementById() { return null; },
    createElement() {
      return { style: {}, setAttribute() {}, querySelector() { return { onclick: null }; } };
    }
  };
  const sandbox = {
    module: { exports: {} }, exports: {}, document,
    navigator: { serviceWorker: {} }, Notification: { permission: 'default' },
    DAHAM_AUTH: { ready: Promise.resolve(true) }, Uint8Array,
    setTimeout() {}, atob: value => Buffer.from(value, 'base64').toString('binary')
  };
  vm.runInNewContext(source, sandbox);

  const initialized = sandbox.module.exports.init();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof domReady, 'function');
  document.body = { appendChild() {} };
  domReady();

  assert.equal(await initialized, true);
});

