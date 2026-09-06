const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const portfolio = require(path.join(root, 'portfolio-static-domain.js'));

test('all 60 project photos and eight covers exist and fully decode', () => {
  const projects = portfolio.listProjects();
  assert.deepEqual(projects.map((project) => project.photos.length), [8, 8, 8, 8, 7, 7, 7, 7]);
  const relativeFiles = projects.flatMap((project) => [project.coverImage, ...project.photos]);
  assert.equal(projects.reduce((sum, project) => sum + project.photos.length, 0), 60);
  for (const relativeFile of relativeFiles) {
    const file = path.join(root, relativeFile);
    assert.equal(fs.existsSync(file), true, `${relativeFile} should exist`);
    assert.ok(fs.statSync(file).size > 0, `${relativeFile} should not be empty`);
  }

  const decoder = spawnSync('python', ['-c', [
    'from PIL import Image',
    'import sys',
    'for file in sys.argv[1:]:',
    '    with Image.open(file) as image:',
    '        image.load()',
    '        assert image.format == "WEBP"',
    '        assert image.width > 0 and image.height > 0',
  ].join('\n'), ...relativeFiles.map((file) => path.join(root, file))], { encoding: 'utf8' });
  assert.equal(decoder.status, 0, decoder.stderr || decoder.stdout);
});

test('portfolio UI uses ordinary image elements with lazy loading and errors', () => {
  const page = fs.readFileSync(path.join(root, 'portfolio-page.js'), 'utf8');
  const website = fs.readFileSync(path.join(root, 'website-final.js'), 'utf8');
  assert.match(page, /document\.createElement\('img'\)/);
  assert.match(page, /row\.photos/);
  assert.match(page, /loading.*lazy/);
  assert.match(page, /사진을 불러오지 못했습니다/);
  assert.match(website, /p\.coverImage/);
  assert.doesNotMatch(page + website, /backgroundPosition|coverIndex|galleryPosition|800%/);
});
