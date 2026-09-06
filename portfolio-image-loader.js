(function(root){
  'use strict';

  var FILES={
    'portfolio-covers':'portfolio-assets/v2-covers.webp',
    'portfolio-galleries':'portfolio-assets/v2-gallery.webp'
  };
  var cache={};

  function load(key){
    if(cache[key])return cache[key];
    var file=FILES[key];
    if(!file)return Promise.reject(new Error('포트폴리오 이미지를 찾을 수 없습니다.'));
    cache[key]=Promise.resolve(file);
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
