(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;}
  if(root){root.DAHAM_PORTFOLIO_STATIC=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var PROJECTS=[
    {slug:'prugio-castle-a-32',title:'구미 푸르지오캐슬 A단지 32평',location:'구미',area:'32평',kind:'아파트 전체 인테리어',tags:['#아파트','#32평','#전체인테리어'],coverIndex:0,galleryKey:'prugio-castle-a-32'},
    {slug:'geochang-prugio-34',title:'거창 푸르지오 34평',location:'거창',area:'34평',kind:'아파트 전체 인테리어',tags:['#아파트','#34평','#전체인테리어'],coverIndex:1,galleryKey:'geochang-prugio-34'},
    {slug:'bonggok-hyunjin-36',title:'봉곡 현진에버빌 36평',location:'구미 봉곡',area:'36평',kind:'아파트 전체 인테리어',tags:['#아파트','#36평','#전체인테리어'],coverIndex:2,galleryKey:'bonggok-hyunjin-36'},
    {slug:'imeun-kolon-35',title:'임은동 코오롱하늘채 35평',location:'구미 임은동',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],coverIndex:3,galleryKey:'imeun-kolon-35'},
    {slug:'songjeong-house-23',title:'송정 주택·상가 23평',location:'구미 송정동',area:'23평',kind:'주택·상가 리모델링',tags:['#주택','#23평','#리모델링'],coverIndex:4,galleryKey:'songjeong-house-23'},
    {slug:'okgye-epyeon-35',title:'옥계 e편한세상 35평',location:'구미 옥계',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],coverIndex:5,galleryKey:'okgye-epyeon-35'},
    {slug:'songjeong-dongyang-42',title:'송정동 동양한신 42평',location:'구미 송정동',area:'42평',kind:'아파트 전체 인테리어',tags:['#아파트','#42평','#전체인테리어'],coverIndex:6,galleryKey:'songjeong-dongyang-42'},
    {slug:'daegu-sangin-hwasung',title:'대구 화성 상인화이츠',location:'대구',area:'',kind:'아파트 전체 인테리어',tags:['#아파트','#대구','#전체인테리어'],coverIndex:7,galleryKey:'daegu-sangin-hwasung'}
  ];

  function copyProject(project){return Object.assign({},project,{tags:project.tags.slice()});}
  function listProjects(){return PROJECTS.map(copyProject);}
  function findProject(slug){var key=String(slug||'').trim();for(var i=0;i<PROJECTS.length;i+=1){if(PROJECTS[i].slug===key)return copyProject(PROJECTS[i]);}return null;}

  return {listProjects:listProjects,findProject:findProject};
});
