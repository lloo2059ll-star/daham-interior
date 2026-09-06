(function(root){
  'use strict';
  var FILES={
    'portfolio-covers':'portfolio-assets/covers.webp.b64',
    'portfolio-galleries':'portfolio-assets/gallery.webp.b64'
  };
  var cache={};

  function toBlobUrl(base64){
    var raw=atob(String(base64||'').replace(/\s+/g,''));
    var bytes=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i+=1)bytes[i]=raw.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
  }

  function load(key){
    if(cache[key])return cache[key];
    var file=FILES[key];
    if(!file)return Promise.reject(new Error('포트폴리오 이미지를 찾을 수 없습니다.'));
    cache[key]=fetch(file,{cache:'force-cache'})
      .then(function(response){if(!response.ok)throw new Error('포트폴리오 이미지 로딩 실패');return response.text();})
      .then(toBlobUrl);
    return cache[key];
  }

  function applyCoverSprite(){
    return load('portfolio-covers').then(function(url){
      document.documentElement.style.setProperty('--portfolio-cover-sprite','url("'+url+'")');
      document.documentElement.classList.add('portfolio-images-ready');
      return url;
    });
  }

  function applyGalleryAtlas(){
    return load('portfolio-galleries').then(function(url){
      document.documentElement.style.setProperty('--portfolio-gallery-atlas','url("'+url+'")');
      return url;
    });
  }

  root.DAHAM_PORTFOLIO_IMAGES={load:load,applyCoverSprite:applyCoverSprite,applyGalleryAtlas:applyGalleryAtlas};
})(typeof window!=='undefined'?window:this);
