const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const website = require('../website-public-domain.js');
const conversion = require('../website-conversion-domain.js');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('inquiry attribution uses Naver Blog only for an explicit or referred blog visit', () => {
  assert.equal(
    website.detectSourceChannel('https://daham-interior.com/inquiry.html', 'https://blog.naver.com/daham'),
    'naver_blog',
  );
  assert.equal(
    website.detectSourceChannel('https://daham-interior.com/inquiry.html?source=naver_blog', ''),
    'naver_blog',
  );
  assert.equal(
    website.detectSourceChannel('https://daham-interior.com/inquiry.html?source=website_guide', 'https://daham-interior.com/gumi-apartment-interior.html'),
    'website',
  );
});

test('conversion events keep only approved names and non-sensitive context', () => {
  assert.deepEqual(
    conversion.buildEvent('inquiry_start', {location: 'homepage_hero', pagePath: '/', phone: '010-2059-0347'}),
    {name: 'inquiry_start', params: {cta_location: 'homepage_hero', page_path: '/'}},
  );
  assert.deepEqual(
    conversion.buildEvent('generate_lead', {location: 'inquiry_page', pagePath: '/inquiry.html'}),
    {name: 'generate_lead', params: {cta_location: 'inquiry_page', page_path: '/inquiry.html'}},
  );
  assert.equal(conversion.buildEvent('unknown_event', {}), null);
});

test('homepage and apartment guide expose immediate inquiry and mobile phone actions', () => {
  const homepage = read('index.html');
  const guide = read('gumi-apartment-interior.html');

  assert.match(homepage, /homepage_hero[^>]*>견적 상담하기</);
  assert.match(homepage, /class="mobile-conversion-bar"/);
  assert.match(homepage, /href="tel:01020590347"[^>]*data-conversion="phone"/);
  assert.match(guide, /guide_hero[^>]*>견적 상담하기</);
  assert.match(guide, /guide_cases[^>]*>시공 범위 상담하기</);
  assert.match(guide, /class="mobile-conversion-bar"/);
});

test('mobile conversion bar respects safe areas and stays below the inquiry modal', () => {
  const css = read('website-conversion.css');

  assert.match(css, /body\{padding-bottom:calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.modal\{z-index:1000\}/);
});

test('inquiry progress labels stay on one line with evenly flexible connectors', () => {
  const css = read('inquiry-overrides.css');

  assert.match(css, /\.progress li\{[^}]*white-space:nowrap/);
  assert.match(css, /\.progress li:not\(:last-child\):after\{[^}]*flex:1 1 20px/);
  assert.match(css, /@media \(max-width: 760px\)\{main\{display:block\}\.progress span\{display:none\}/);
});

test('inquiry headline keeps the emphasized Korean phrase together at medium widths', () => {
  const css = read('inquiry-overrides.css');

  assert.match(css, /\.intro h1\{[^}]*font-size:clamp\(38px,3\.6vw,44px\)/);
  assert.match(css, /\.intro h1 em\{[^}]*white-space:nowrap/);
});

test('public inquiry clients emit a lead only after a successful database insert', () => {
  const modalClient = read('website-final.js');
  const pageClient = read('inquiry.js');

  assert.match(modalClient, /DAHAM_CONVERSION\.track\(["']generate_lead["']/);
  assert.match(modalClient, /detectSourceChannel\(location\.href,document\.referrer\)/);
  assert.match(modalClient, /sourceChannel:sourceChannel/);
  assert.match(pageClient, /detectSourceChannel\(\s*location\.href,\s*document\.referrer/);
  assert.match(pageClient, /DAHAM_CONVERSION\.track\(["']generate_lead["']/);
});
