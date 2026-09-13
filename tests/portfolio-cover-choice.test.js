const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../portfolio-static-domain');
test('card images optimize known covers but preserve a published replacement', () => {
  const project = domain.listProjects()[0];
  assert.equal(domain.cardImageForProject(project.slug,project.coverImage),project.thumbnailImage);
  assert.equal(domain.cardImageForProject(project.slug,'https://daham-interior.com/'+project.coverImage),project.thumbnailImage);
  const replacement = 'https://images.example.com/new-cover.webp';
  assert.equal(domain.cardImageForProject(project.slug,replacement),replacement);
  assert.equal(domain.cardImageForProject('custom-project',replacement),replacement);
});
