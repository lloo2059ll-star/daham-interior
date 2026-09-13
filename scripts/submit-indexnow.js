// Notify Naver of approved public pages after their deployment.
// Run without --submit to inspect the URL list without making requests.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'indexnow-config.json'), 'utf8'));
const projects = require('../portfolio-static-domain').listProjects();
const base = 'https://' + config.host;
const payload = {
  host: config.host,
  key: config.key,
  keyLocation: base + '/' + config.key + '.txt',
  urlList: [base + '/', base + '/portfolio.html', ...projects.map(p => base + '/portfolio/' + p.slug + '.html'), base + '/gumi-apartment-interior.html', base + '/interior-cost-duration.html']
};
async function submit() {
  if (config.host !== 'daham-interior.com' || !/^[a-f0-9]{32}$/.test(config.key)) throw new Error('Invalid website key configuration');
  const keyResponse = await fetch(payload.keyLocation);
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== config.key) throw new Error('Deploy and verify the key file before submitting');
  await Promise.all(payload.urlList.map(async url => {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.status !== 200) throw new Error('Public page unavailable: ' + url + ' (' + response.status + ')');
  }));
  const response = await fetch('https://searchadvisor.naver.com/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (![200,202].includes(response.status)) throw new Error('IndexNow submission failed: HTTP ' + response.status);
  console.log(JSON.stringify({ pages: payload.urlList.length, status: response.status, meaning: response.status === 200 ? 'Submitted' : 'Received; key verification pending', indexed: 'Not guaranteed by submission' }));
}
if (process.argv.includes('--submit')) submit().catch(error => { console.error(error.message); process.exitCode = 1; });
else console.log(JSON.stringify({ pages: payload.urlList.length, urls: payload.urlList, submitCommand: 'node scripts/submit-indexnow.js --submit' },null,2));
