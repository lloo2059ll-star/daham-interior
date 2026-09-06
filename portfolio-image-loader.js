(function(root){
  'use strict';

  var PARTS={
    'portfolio-covers':['portfolio-data/portfolio-covers.txt'],
    'prugio-castle-a-32':['portfolio-data/prugio-castle-a-32.txt'],
    'geochang-prugio-34':['portfolio-data/geochang-prugio-34.txt'],
    'bonggok-hyunjin-36':['portfolio-data/bonggok-hyunjin-36.txt'],
    'imeun-kolon-35':['portfolio-data/imeun-kolon-35.txt'],
    'songjeong-house-23':['portfolio-data/songjeong-house-23-0.txt','portfolio-data/songjeong-house-23-1.txt'],
    'okgye-epyeon-35':['portfolio-data/okgye-epyeon-35.txt'],
    'songjeong-dongyang-42':['portfolio-data/songjeong-dongyang-42.txt'],
    'daegu-sangin-hwasung':['portfolio-data/daegu-sangin-hwasung.txt']
  };
  var cache={};

  function toBlobUrl(base64){
    var raw=atob(base64);
    var bytes=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i+=1)bytes[i]=raw.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
  }

  function load(key){
    if(cache[key])return cache[key];
    var files=PARTS[key];
    if(!files)return Promise.reject(new Error('포트폴리오 이미지를 찾을 수 없습니다.'));
    cache[key]=Promise.all(files.map(function(file){
      return fetch(file,{cache:'force-cache'}).then(function(response){
        if(!response.ok)throw new Error('포트폴리오 이미지 로딩 실패');
        return response.text();
      });
    })).then(function(chunks){
      return toBlobUrl(chunks.join('').replace(/\s+/g,''));
    });
    return cache[key];
  }

  function applyCoverSprite(){
    return load('portfolio-covers').then(function(url){
      document.documentElement.style.setProperty('--portfolio-cover-sprite','url("'+url+'")');
      document.documentElement.classList.add('portfolio-images-ready');
      return url;
    });
  }

  root.DAHAM_PORTFOLIO_IMAGES={load:load,applyCoverSprite:applyCoverSprite};
})(typeof window!=='undefined'?window:this);
