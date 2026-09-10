(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;}
  if(root){root.DAHAM_PORTFOLIO_STATIC=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function project(data){
    var base='portfolio-assets/projects/'+data.slug+'/';
    return {slug:data.slug,title:data.title,location:data.location,area:data.area,kind:data.kind,tags:data.tags,coverImage:base+'cover.webp',coverPosition:data.coverPosition||'center center',photos:data.photos.map(function(name){return base+name+'.webp';})};
  }

  var PROJECTS=[
    project({slug:'prugio-castle-a-32',title:'구미 푸르지오캐슬 A단지 32평',location:'구미',area:'32평',kind:'아파트 전체 인테리어',tags:['#아파트','#32평','#전체인테리어'],photos:['living-overview','living-kitchen','living-wall','kitchen-overview','kitchen-island','kitchen-cabinet','bathroom-main','bathroom-secondary','bedroom','dressing-room','hallway','stone-detail']}),
    project({slug:'geochang-prugio-34',title:'거창 푸르지오 34평',location:'거창',area:'34평',kind:'아파트 전체 인테리어',tags:['#아파트','#34평','#전체인테리어'],photos:['living-main','living-wide','kitchen-overview','kitchen-cabinet','bathroom-main','bathroom-tub','entry','bedroom','hallway','lighting-detail']}),
    project({slug:'bonggok-hyunjin-36',title:'봉곡 현진에버빌 38평',location:'구미 봉곡',area:'38평',kind:'아파트 전체 인테리어',tags:['#아파트','#38평','#전체인테리어'],photos:['living-main','living-kitchen','kitchen','bathroom-main','bathroom-secondary','entry','bedroom','room-storage','hallway','bathroom-detail']}),
    project({slug:'imeun-kolon-35',title:'임은동 코오롱하늘채 35평',location:'구미 임은동',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],photos:['living-storage','living-main','kitchen','bathroom-main','bathroom-secondary','entry-storage','bedroom','vanity','balcony','storage']}),
    project({slug:'songjeong-house-23',title:'송정 주택·상가 23평',location:'구미 송정동',area:'23평',kind:'주택·상가 리모델링',tags:['#주택','#23평','#리모델링'],photos:['living-kitchen','living-tv','kitchen','bathroom-main','bathroom-secondary','entry','storage','living-alt']}),
    project({slug:'okgye-epyeon-35',title:'옥계 e편한세상 35평',location:'구미 옥계',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],photos:['whole-space','living','dining','kitchen-dining','kitchen','bedroom','vanity']}),
    project({slug:'songjeong-dongyang-42',title:'송정동 동양한신 42평',location:'구미 송정동',area:'42평',kind:'아파트 전체 인테리어',tags:['#아파트','#42평','#전체인테리어'],photos:['living','living-window','living-kitchen','kitchen','kitchen-close','hallway','storage-detail']}),
    project({slug:'daegu-sangin-hwasung',title:'대구 화성 상인화이츠',location:'대구',area:'',kind:'아파트 전체 인테리어',tags:['#아파트','#대구','#전체인테리어'],photos:['living-main','living-alt','kitchen','kitchen-detail','kitchen-hall','bedroom-storage','bathroom','hallway']})
  ];

  function copyProject(item){return Object.assign({},item,{tags:item.tags.slice(),photos:item.photos.slice()});}
  function listProjects(){return PROJECTS.map(copyProject);}
  function findProject(slug){var key=String(slug||'').trim();for(var i=0;i<PROJECTS.length;i+=1){if(PROJECTS[i].slug===key)return copyProject(PROJECTS[i]);}return null;}

  return {listProjects:listProjects,findProject:findProject};
});
