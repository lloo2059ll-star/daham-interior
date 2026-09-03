const test = require('node:test');
const assert = require('node:assert/strict');
const website = require('../website-public-domain.js');

test('normalizePhone formats common Korean mobile numbers', () => {
  assert.equal(website.normalizePhone('010 1234 5678'), '010-1234-5678');
  assert.equal(website.normalizePhone('010-9876-5432'), '010-9876-5432');
});

test('buildInquiryPayload trims fields and keeps the public insert shape only', () => {
  const payload = website.buildInquiryPayload({
    name: ' 김다함 ',
    phone: '010 1234 5678',
    email: ' hello@example.com ',
    address: ' 경북 구미시 ',
    addressDetail: '101동',
    siteName: '푸르지오',
    area: '34',
    budget: '4천만원',
    moveDate: '2026-10-20',
    message: ' 전체 리모델링 ',
    privacyConsent: true,
    honeypot: '',
  });

  assert.deepEqual(payload, {
    name: '김다함',
    phone: '010-1234-5678',
    email: 'hello@example.com',
    address: '경북 구미시',
    address_detail: '101동',
    site_name: '푸르지오',
    area: '34',
    budget: '4천만원',
    move_date: '2026-10-20',
    message: '전체 리모델링',
    privacy_consent: true,
    honeypot: '',
    source: 'website',
  });
  assert.equal('status' in payload, false);
  assert.equal('erp_synced_at' in payload, false);
});

test('buildInquiryPayload rejects missing required consent or contact', () => {
  assert.throws(() => website.buildInquiryPayload({name: '', phone: '', privacyConsent: true}), /이름/);
  assert.throws(() => website.buildInquiryPayload({name: '홍길동', phone: '01012345678', privacyConsent: false}), /개인정보/);
});

test('safeImageUrl permits http(s) only', () => {
  assert.equal(website.safeImageUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(website.safeImageUrl('http://example.com/a.jpg'), 'http://example.com/a.jpg');
  assert.equal(website.safeImageUrl('javascript:alert(1)'), '');
  assert.equal(website.safeImageUrl('data:image/svg+xml,abc'), '');
});

test('normalizePortfolioRow exposes only homepage fields and filters unsafe image URLs', () => {
  const row = website.normalizePortfolioRow({
    id: '1', slug: 'a', title: '옥계 48평', location: '구미 옥계', area_pyeong: 48,
    style: '모던', summary: '설명', cover_image_url: 'javascript:boom()', sort_order: 3,
    client_name: '절대 노출 금지', estimate_total: 99999999,
  });
  assert.deepEqual(row, {
    id: '1', slug: 'a', title: '옥계 48평', location: '구미 옥계', areaPyeong: 48,
    style: '모던', summary: '설명', coverImageUrl: '', sortOrder: 3,
  });
});
