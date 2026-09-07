const test = require('node:test');
const assert = require('node:assert/strict');
const admin = require('../website-admin-domain.js');

test('extractProjectPublicMeta never carries client name or phone', () => {
  const meta = admin.extractProjectPublicMeta({
    id: 'project-123',
    client: {
      'cl-name': '고객 실명',
      'cl-tel': '010-0000-0000',
      'cl-addr': '경상북도 구미시 옥계동 123-45 101동 202호',
      'cl-area': '48',
      'cl-start': '2026-09-10',
      'cl-end': '2026-10-20',
    },
    sectionTotals: {total: 50000000},
    margins: {profit: 15},
  });

  assert.deepEqual(meta, {
    sourceProjectId: 'project-123',
    suggestedLocation: '경상북도 구미시',
    areaPyeong: 48,
    startDate: '2026-09-10',
    endDate: '2026-10-20',
  });
  assert.equal(JSON.stringify(meta).includes('고객 실명'), false);
  assert.equal(JSON.stringify(meta).includes('010-0000-0000'), false);
  assert.equal(JSON.stringify(meta).includes('50000000'), false);
});

test('buildPortfolioRecord produces only the public table fields', () => {
  const record = admin.buildPortfolioRecord(
    {sourceProjectId:'project-123',suggestedLocation:'경상북도 구미시',areaPyeong:48,startDate:'',endDate:''},
    {title:'옥계 현진에버빌 48평',location:'구미 옥계',style:'화이트 우드',summary:'전체 리모델링',coverImageUrl:'https://example.com/cover.jpg',galleryImageUrls:['https://example.com/living.jpg','javascript:bad','https://example.com/living.jpg','./portfolio-assets/bath.webp'],sortOrder:'2',isPublished:true}
  );

  assert.deepEqual(record, {
    source_project_id: 'project-123',
    slug: 'project-project-123',
    title: '옥계 현진에버빌 48평',
    location: '구미 옥계',
    area_pyeong: 48,
    style: '화이트 우드',
    summary: '전체 리모델링',
    cover_image_url: 'https://example.com/cover.jpg',
    gallery_image_urls: ['https://example.com/living.jpg', './portfolio-assets/bath.webp'],
    sort_order: 2,
    is_published: true,
  });
});

test('normalizeGalleryUrls keeps safe unique image urls in the chosen order', () => {
  assert.deepEqual(admin.normalizeGalleryUrls([
    ' https://example.com/living.jpg ',
    'javascript:alert(1)',
    '/portfolio/entry.webp',
    'https://example.com/living.jpg',
    '',
  ]), ['https://example.com/living.jpg', '/portfolio/entry.webp']);
  assert.deepEqual(admin.normalizeGalleryUrls('https://example.com/a.jpg\n./portfolio/b.jpg\nhttps://example.com/a.jpg'), [
    'https://example.com/a.jpg', './portfolio/b.jpg'
  ]);
});

test('slugify is stable and safe for URL paths', () => {
  assert.equal(admin.slugify(' Project 123 / Test '), 'project-123-test');
  assert.equal(admin.slugify(''), 'project');
});

test('buildPortfolioRecord preserves the approved slug for a static portfolio project', () => {
  const record = admin.buildPortfolioRecord(
    {sourceProjectId:'portfolio-static:geochang-prugio-34',staticSlug:'geochang-prugio-34',suggestedLocation:'거창',areaPyeong:34},
    {title:'거창 푸르지오 34평',galleryImageUrls:[]}
  );
  assert.equal(record.slug, 'geochang-prugio-34');
});
