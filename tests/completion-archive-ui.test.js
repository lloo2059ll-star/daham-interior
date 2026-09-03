const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../worklog.html'),'utf8');const css=fs.readFileSync(path.join(__dirname,'../operations-ui.css'),'utf8');const client=fs.readFileSync(path.join(__dirname,'../completion-archive-client.js'),'utf8');
test('approved four-step creation screen includes counts, safety notice, retry and ready-only downloads',()=>{['자료 확인','원본 검증','PDF 생성','ZIP 묶기','원본 사진은 삭제되지 않습니다','다시 시도','PDF 보기','ZIP 다운로드'].forEach(x=>assert.match(html,new RegExp(x)));assert.match(html,/disabled/);});
test('viewer exposes integrity, journal navigation, preview and search landmarks',()=>{['무결성 확인 완료','현장일지 보기','준공자료 검색','archive-viewer','archive-integrity'].forEach(x=>assert.match(html,new RegExp(x)));});
test('client uses authenticated function, bounded signed URLs and ready guard',()=>{assert.match(client,/functions\/v1\/create-completion-archive/);assert.match(client,/expiresIn:300/);assert.match(client,/status!==['"]ready/);assert.doesNotMatch(client,/service_role|SERVICE_ROLE/);});
test('responsive archive surfaces are scoped in operations stylesheet',()=>{assert.match(css,/archive-modal/);assert.match(css,/@media[\s\S]*archive-viewer/);});

