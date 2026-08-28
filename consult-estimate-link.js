(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.DAHAM_CONSULT_ESTIMATE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var WALLPAPER={
    '베스트':[{min:24,max:29,ref:'0_0'},{min:30,max:39,ref:'0_1'},{min:40,max:49,ref:'0_2'}],
    '디아망':[{min:30,max:39,ref:'0_3'},{min:40,max:49,ref:'0_4'}]
  };
  var FLOOR={
    wood:{'597×597':'1_4','165×1200':'1_5','325×805':'1_6','98×805':'1_7','650×650':'1_8'},
    vinyl:{'2.2T':'1_0','3.2T':'1_1','5.0T':'1_2'}
  };
  var ENTRANCE_REFS={};
  for(var i=0;i<30;i++) ENTRANCE_REFS['11_'+i]=true;

  function areaNumber(value){
    var n=Number(String(value==null?'':value).replace(/[^0-9.]/g,''));
    return Number.isFinite(n)&&n>0?n:0;
  }
  function wallpaperRef(area,grade){
    var bands=WALLPAPER[grade]||[];
    for(var i=0;i<bands.length;i++) if(area>=bands[i].min&&area<=bands[i].max) return bands[i].ref;
    return null;
  }
  function autoItems(payload){
    payload=payload||{};
    var details=payload.scopeDetails||{};
    var area=areaNumber(payload.area);
    var out=[];
    var wall=details['도배']||{};
    var wallRef=wallpaperRef(area,wall.grade);
    if(wallRef) out.push({ref:wallRef,qty:1,scope:'도배'});

    var floor=details['바닥']||{};
    var floorRef=FLOOR.vinyl[floor.vinyl]||FLOOR.wood[floor.wood]||null;
    if(floorRef&&area) out.push({ref:floorRef,qty:area,scope:'바닥'});

    var entrance=details['중문']||{};
    if(ENTRANCE_REFS[entrance.itemRef]) out.push({ref:entrance.itemRef,qty:1,scope:'중문'});
    return out;
  }

  return {WALLPAPER:WALLPAPER,FLOOR:FLOOR,ENTRANCE_REFS:ENTRANCE_REFS,autoItems:autoItems};
});

