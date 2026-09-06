(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;}
  if(root){root.DAHAM_PORTFOLIO_STATIC=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var PROJECTS=[
    {slug:'prugio-castle-a-32',title:'구미 푸르지오캐슬 A단지 32평',location:'구미',area:'32평',kind:'아파트 전체 인테리어',tags:['#아파트','#32평','#전체인테리어'],coverImage:'portfolio-assets/prugio-castle-a-32.svg#cover',galleryImage:'portfolio-assets/prugio-castle-a-32.svg#gallery'},
    {slug:'geochang-prugio-34',title:'거창 푸르지오 34평',location:'거창',area:'34평',kind:'아파트 전체 인테리어',tags:['#아파트','#34평','#전체인테리어'],coverImage:'portfolio-assets/geochang-prugio-34.svg#cover',galleryImage:'portfolio-assets/geochang-prugio-34.svg#gallery'},
    {slug:'bonggok-hyunjin-36',title:'봉곡 현진에버빌 36평',location:'구미 봉곡',area:'36평',kind:'아파트 전체 인테리어',tags:['#아파트','#36평','#전체인테리어'],coverImage:'portfolio-assets/bonggok-hyunjin-36.svg#cover',galleryImage:'portfolio-assets/bonggok-hyunjin-36.svg#gallery'},
    {slug:'imeun-kolon-35',title:'임은동 코오롱하늘채 35평',location:'구미 임은동',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],coverImage:'portfolio-assets/imeun-kolon-35.svg#cover',galleryImage:'portfolio-assets/imeun-kolon-35.svg#gallery'},
    {slug:'songjeong-house-23',title:'송정 주택·상가 23평',location:'구미 송정동',area:'23평',kind:'주택·상가 리모델링',tags:['#주택','#23평','#리모델링'],coverImage:'portfolio-assets/songjeong-house-23.svg#cover',galleryImage:'portfolio-assets/songjeong-house-23.svg#gallery'},
    {slug:'okgye-epyeon-35',title:'옥계 e편한세상 35평',location:'구미 옥계',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],coverImage:'portfolio-assets/okgye-epyeon-35.svg#cover',galleryImage:'portfolio-assets/okgye-epyeon-35.svg#gallery'},
    {slug:'songjeong-dongyang-42',title:'송정동 동양한신 42평',location:'구미 송정동',area:'42평',kind:'아파트 전체 인테리어',tags:['#아파트','#42평','#전체인테리어'],coverImage:'portfolio-assets/songjeong-dongyang-42.svg#cover',galleryImage:'portfolio-assets/songjeong-dongyang-42.svg#gallery'},
    {slug:'daegu-sangin-hwasung',title:'대구 화성 상인화이츠',location:'대구',area:'',kind:'아파트 인테리어',tags:['#아파트','#대구','#인테리어'],coverImage:'portfolio-assets/daegu-sangin-hwasung.svg#cover',galleryImage:'portfolio-assets/daegu-sangin-hwasung.svg#gallery'}
  ];

  function copyProject(project){return Object.assign({},project,{tags:project.tags.slice()});}
  function listProjects(){return PROJECTS.map(copyProject);}
  function findProject(slug){var key=String(slug||'').trim();for(var i=0;i<PROJECTS.length;i+=1){if(PROJECTS[i].slug===key)return copyProject(PROJECTS[i]);}return null;}

  return {listProjects:listProjects,findProject:findProject};
});
