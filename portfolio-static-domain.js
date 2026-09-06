(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;}
  if(root){root.DAHAM_PORTFOLIO_STATIC=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function project(slug,title,location,area,kind,tags,count){
    var base='portfolio-assets/projects/'+slug+'/';
    var photos=[];
    for(var i=1;i<=count;i+=1)photos.push(base+String(i).padStart(2,'0')+'.webp');
    return {slug:slug,title:title,location:location,area:area,kind:kind,tags:tags,coverImage:base+'cover.webp',photos:photos};
  }

  var PROJECTS=[
    project('prugio-castle-a-32','구미 푸르지오캐슬 A단지 32평','구미','32평','아파트 전체 인테리어',['#아파트','#32평','#전체인테리어'],8),
    project('geochang-prugio-34','거창 푸르지오 34평','거창','34평','아파트 전체 인테리어',['#아파트','#34평','#전체인테리어'],8),
    project('bonggok-hyunjin-36','봉곡 현진에버빌 36평','구미 봉곡','36평','아파트 전체 인테리어',['#아파트','#36평','#전체인테리어'],8),
    project('imeun-kolon-35','임은동 코오롱하늘채 35평','구미 임은동','35평','아파트 전체 인테리어',['#아파트','#35평','#전체인테리어'],8),
    project('songjeong-house-23','송정 주택·상가 23평','구미 송정동','23평','주택·상가 리모델링',['#주택','#23평','#리모델링'],7),
    project('okgye-epyeon-35','옥계 e편한세상 35평','구미 옥계','35평','아파트 전체 인테리어',['#아파트','#35평','#전체인테리어'],7),
    project('songjeong-dongyang-42','송정동 동양한신 42평','구미 송정동','42평','아파트 전체 인테리어',['#아파트','#42평','#전체인테리어'],7),
    project('daegu-sangin-hwasung','대구 화성 상인화이츠','대구','','아파트 전체 인테리어',['#아파트','#대구','#전체인테리어'],7)
  ];

  function copyProject(project){return Object.assign({},project,{tags:project.tags.slice(),photos:project.photos.slice()});}
  function listProjects(){return PROJECTS.map(copyProject);}
  function findProject(slug){var key=String(slug||'').trim();for(var i=0;i<PROJECTS.length;i+=1){if(PROJECTS[i].slug===key)return copyProject(PROJECTS[i]);}return null;}

  return {listProjects:listProjects,findProject:findProject};
});
