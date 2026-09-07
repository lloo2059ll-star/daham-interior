const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const htmlPath = path.join(__dirname, '..', 'website-admin.html');
function html(){ return fs.readFileSync(htmlPath, 'utf8'); }

test('website admin uses ERP authentication and safe domain projection', () => {
  const src = html();
  assert.match(src, /auth\.js/);
  assert.match(src, /website-admin-domain\.js/);
  assert.match(src, /DAHAM_AUTH\.ready/);
  assert.match(src, /daham_proj_index_v1/);
  assert.match(src, /daham_detail_v2___/);
});

test('website admin publishes to the isolated public portfolio table', () => {
  const src = html();
  assert.match(src, /from\('website_portfolio'\)/);
  assert.match(src, /onConflict:'source_project_id'/);
  assert.match(src, /is_published/);
  assert.doesNotMatch(src, /cl-name/);
  assert.doesNotMatch(src, /cl-tel/);
});

test('website admin edits ordered gallery urls for the current static projects', () => {
  const src = html();
  assert.match(src, /portfolio-static-domain\.js/);
  assert.match(src, /id="gallery-list"/);
  assert.match(src, /id="gallery-url"/);
  assert.match(src, /id="gallery-add"/);
  assert.match(src, /data-gallery-up/);
  assert.match(src, /data-gallery-down/);
  assert.match(src, /data-gallery-remove/);
  assert.match(src, /data-gallery-cover/);
  assert.match(src, /gallery_image_urls/);
});

test('website admin preserves legacy portfolio editing before the gallery migration runs', () => {
  const src = html();
  assert.match(src, /gallerySchemaReady/);
  assert.match(src, /isMissingGalleryColumn/);
  assert.match(src, /delete record\.gallery_image_urls/);
});
