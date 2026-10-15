(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;}
  if(root){root.DAHAM_PORTFOLIO_STATIC=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function project(data){
    var base='portfolio-assets/projects/'+data.slug+'/';
    return {slug:data.slug,title:data.title,location:data.location,area:data.area,kind:data.kind,tags:data.tags,coverImage:base+'cover.webp',thumbnailImage:base+'cover-card.webp',coverPosition:data.coverPosition||'center center',photos:data.photos.map(function(name){return base+name+'.webp';})};
  }

  var PROJECTS=[
    project({slug:'prugio-castle-a-32',title:'구미 푸르지오캐슬 A단지 32평',location:'구미',area:'32평',kind:'아파트 전체 인테리어',tags:['#아파트','#32평','#전체인테리어'],photos:['living-overview','living-kitchen','living-wall','kitchen-overview','kitchen-island','kitchen-cabinet','bathroom-main','bathroom-secondary','bedroom','dressing-room','hallway','stone-detail']}),
    project({slug:'geochang-prugio-34',title:'거창 푸르지오 34평',location:'거창',area:'34평',kind:'아파트 전체 인테리어',tags:['#아파트','#34평','#전체인테리어'],photos:['living-main','living-wide','kitchen-overview','kitchen-cabinet','bathroom-main','bathroom-tub','entry','bedroom','hallway','lighting-detail']}),
    project({slug:'bonggok-hyunjin-36',title:'봉곡 현진에버빌 38평',location:'구미 봉곡',area:'38평',kind:'아파트 전체 인테리어',tags:['#아파트','#38평','#전체인테리어'],photos:['living-main','living-kitchen','kitchen','bathroom-main','bathroom-secondary','entry','bedroom','room-storage','hallway','bathroom-detail']}),
    project({slug:'imeun-kolon-35',title:'임은동 코오롱하늘채 35평',location:'구미 임은동',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],photos:['living-storage','living-main','kitchen','bathroom-main','bathroom-secondary','entry-storage','bedroom','vanity','balcony','storage']}),
    project({slug:'songjeong-house-23',title:'송정 주택·상가 23평',location:'구미 송정동',area:'23평',kind:'주택·상가 리모델링',tags:['#주택','#23평','#리모델링'],photos:['living-kitchen','living-tv','kitchen','bathroom-main','bathroom-secondary','entry','storage','living-alt']}),
    project({slug:'okgye-epyeon-35',title:'옥계 e편한세상 35평',location:'구미 옥계',area:'35평',kind:'아파트 전체 인테리어',tags:['#아파트','#35평','#전체인테리어'],photos:['whole-space','living','dining','kitchen-dining','kitchen','bedroom','vanity']}),
    project({slug:'songjeong-dongyang-42',title:'송정동 동양한신 42평',location:'구미 송정동',area:'42평',kind:'아파트 전체 인테리어',tags:['#아파트','#42평','#전체인테리어'],photos:['living','living-window','living-kitchen','kitchen','kitchen-close','hallway','storage-detail']}),
    project({slug:'daegu-sangin-hwasung',title:'대구 화성 상인화이츠 33평',location:'대구',area:'33평',kind:'아파트 전체 인테리어',tags:['#아파트','#33평','#대구','#전체인테리어'],photos:['living-main','living-alt','kitchen','kitchen-detail','kitchen-hall','bedroom-storage','bathroom','hallway']}),
    project({"slug":"gangbyeon-kolon-34","title":"구미 강변 코오롱하늘채 34평","location":"구미","area":"34평","kind":"아파트 인테리어","tags":["#아파트","#34평","#인테리어"],"photos":["living","kitchen","hallway","bedroom","bathroom","bathroom-secondary"]}),
    project({"slug":"sandong-ssangyong-34","title":"구미 산동 쌍용예가 34평","location":"구미 산동","area":"34평","kind":"아파트 인테리어","tags":["#아파트","#34평","#인테리어"],"photos":["living","kitchen","kitchen-storage","hallway","hallway-reverse","entry"]}),
    project({"slug":"samgu-trinity-36","title":"구미 삼구트리니엔 36평","location":"구미","area":"36평","kind":"아파트 인테리어","tags":["#아파트","#36평","#인테리어"],"photos":["living","kitchen","kitchen-storage","bathroom","shower","bedroom","balcony-door","entry"]}),
    project({"slug":"okgye-samgu-trinity-51","title":"구미 옥계 삼구트리니엔 51평","location":"구미 옥계","area":"51평","kind":"아파트 전체 인테리어","tags":["#구미인테리어","#옥계인테리어","#삼구트리니엔","#51평인테리어"],"photos":["bathroom-off-01","bathroom-on-01","bathroom-off-02","bathroom-on-02","bathroom-off-03","bathroom-on-03","bathroom-off-04","bathroom-on-04","bathroom-off-05","bathroom-on-05","bathroom-on-06","bathroom-on-07","room-off-01","room-on-01","room-off-02","room-on-02","room-off-03","room-on-03","room-off-04","room-on-04","hall-off-01","hall-on-01","hall-off-02","hall-on-02","hall-off-03","hall-on-03","hall-off-04","hall-on-04","living-off-01","living-on-01","living-off-02","living-on-02","living-off-03","living-on-03","living-off-04","living-on-04","living-off-05","living-on-05","kitchen-off-01","kitchen-on-01","kitchen-off-02","kitchen-on-02","kitchen-off-03","kitchen-on-03","kitchen-off-04","kitchen-on-04","kitchen-off-05","kitchen-on-05"]}),
    project({"slug":"songjeong-samwoo-32","title":"구미 송정동 삼우타운 32평","location":"구미 송정동","area":"32평","kind":"아파트 인테리어","tags":["#아파트","#32평","#인테리어"],"photos":["hallway","living","storage","bathroom","kitchen","dining"]}),
    project({"slug":"wonho-prugio-34","title":"구미 원호 푸르지오 34평","location":"구미 원호","area":"34평","kind":"아파트 인테리어","tags":["#아파트","#34평","#인테리어"],"photos":["living","kitchen","dining","bathroom","hallway","vanity","entry"]}),
    project({"slug":"wonho-prugio-renovation-34","title":"구미 원호 푸르지오 34평 리모델링","location":"구미 원호","area":"34평","kind":"아파트 인테리어","tags":["#아파트","#34평","#인테리어"],"photos":["living","living-window","hallway","vanity","bedroom","kitchen","entry-door"]}),
    project({"slug":"indong-restaurant-50","title":"구미 인동 50평 식당 인테리어","location":"구미 인동","area":"50평","kind":"식당 인테리어","tags":["#상가","#50평","#인테리어"],"photos":["dining","dining-reverse","wall","seating","counter","lighting"]}),
    project({"slug":"sinpyeong-salon-40","title":"구미 신평동 40평 미용실 인테리어","location":"구미 신평동","area":"40평","kind":"미용실 인테리어","tags":["#상가","#40평","#인테리어"],"photos":["salon","counter","seating","storage","mirror","detail"]})
  ];

  function copyProject(item){return Object.assign({},item,{tags:item.tags.slice(),photos:item.photos.slice()});}
  function listProjects(){return PROJECTS.map(copyProject);}
  function findProject(slug){var key=String(slug||'').trim();for(var i=0;i<PROJECTS.length;i+=1){if(PROJECTS[i].slug===key)return copyProject(PROJECTS[i]);}return null;}

  function cardImageForProject(slug,image){
    var item=findProject(slug);if(!item)return image;
    var known=[item.coverImage,'/'+item.coverImage,'https://daham-interior.com/'+item.coverImage,'https://www.daham-interior.com/'+item.coverImage];
    return known.indexOf(image)>=0?item.thumbnailImage:image;
  }
  return {listProjects:listProjects,findProject:findProject,cardImageForProject:cardImageForProject};
});
