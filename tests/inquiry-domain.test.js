const test = require('node:test');
const assert = require('node:assert/strict');
const inquiry = require('../inquiry-domain.js');

test('exposes the fields owned by each inquiry step', () => {
  assert.deepEqual(inquiry.stepFields(1), ['name', 'phone']);
  assert.deepEqual(inquiry.stepFields(2), ['address', 'siteName', 'area', 'workScope', 'budget', 'moveDate']);
  assert.deepEqual(inquiry.stepFields(3), ['message', 'privacyConsent']);
});

test('validates each inquiry step independently', () => {
  assert.equal(inquiry.validateStep(1, { name: '', phone: '' }).field, 'name');
  assert.equal(inquiry.validateStep(1, { name: '홍길동', phone: '' }).field, 'phone');
  assert.equal(inquiry.validateStep(2, { workScope: '' }).field, 'workScope');
  assert.equal(inquiry.validateStep(3, { privacyConsent: false }).field, 'privacyConsent');
  assert.equal(inquiry.validateStep(3, { privacyConsent: true }).valid, true);
});

test('accepts only the two approved construction scopes', () => {
  assert.equal(inquiry.validateStep(2, { workScope: '전체 공사' }).valid, true);
  assert.equal(inquiry.validateStep(2, { workScope: '부분 공사' }).valid, true);
  assert.equal(inquiry.validateStep(2, { workScope: '셀프 공사' }).valid, false);
});

