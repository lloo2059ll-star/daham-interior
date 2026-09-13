const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const confirmed = [
  ['gangbyeon-kolon-34','34평',4],['sandong-ssangyong-34','34평',3],
  ['samgu-trinity-36','36평',4],['songjeong-samwoo-32','32평',4],
  ['wonho-prugio-34','34평',3],['wonho-prugio-renovation-34','34평',3],
  ['indong-restaurant-50','50평',4],['sinpyeong-salon-40','40평',4]
];
test('eight approved new cases preserve confirmed facts and exclude rejected projects', () => {
  const domain = require('../portfolio-static-domain');
  assert.equal(domain.listProjects().length,16);
  for (const [slug,area,weeks] of confirmed) {
    const project = domain.findProject(slug);
    assert.ok(project,slug);
    assert.equal(project.area,area);
    const html = fs.readFileSync(path.join(__dirname,'..','portfolio',slug+'.html'),'utf8');
    assert.ok(html.includes(`공사 기간 ${weeks}주`),slug);
    assert.ok(project.photos.length >= 5,slug);
  }
  const titles = domain.listProjects().map(p=>p.title).join(' ');
  assert.doesNotMatch(titles,/평범식당|청빈|중흥에코시티|파라디아|지코바/);
  assert.match(domain.findProject('indong-restaurant-50').title,/식당/);
  assert.match(domain.findProject('sinpyeong-salon-40').title,/미용실/);
});
