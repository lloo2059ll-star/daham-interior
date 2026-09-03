const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../worklog.html'),'utf8');const css=fs.readFileSync(path.join(__dirname,'../operations-ui.css'),'utf8');const client=fs.readFileSync(path.join(__dirname,'../completion-archive-client.js'),'utf8');
test('approved four-step creation screen includes counts, safety notice, retry and ready-only downloads',()=>{['현장일지 확인','원본 사진 정리','PDF 보고서 생성','ZIP 보관 완료','원본은 삭제되지 않습니다','다시 시도','PDF 보기','ZIP 다운로드'].forEach(x=>assert.match(html,new RegExp(x)));assert.match(html,/disabled/);});
test('viewer exposes integrity, journal navigation, preview and search landmarks',()=>{['무결성 확인 완료','현장일지 PDF','일지 내용 또는 공종 검색','archive-viewer','archive-integrity','archive-folders','archive-paper'].forEach(x=>assert.match(html,new RegExp(x)));});
test('client uses authenticated function, bounded signed URLs and ready guard',()=>{assert.match(client,/functions\/v1\/create-completion-archive/);assert.match(client,/expiresIn:300/);assert.match(client,/status!==['"]ready/);assert.doesNotMatch(client,/service_role|SERVICE_ROLE/);});
test('responsive archive surfaces are scoped in operations stylesheet',()=>{assert.match(css,/archive-modal/);assert.match(css,/@media[\s\S]*archive-viewer/);});

