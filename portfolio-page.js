(function(){
'use strict';
var api=window.DAHAM_PORTFOLIO_STATIC;
var images=window.DAHAM_PORTFOLIO_IMAGES;
var rows=api?api.listProjects():[];
var list=document.getElementById('portfolio-list');
var modal=document.getElementById('project-modal');
var title=document.getElementById('project-title');
var meta=document.getElementById('project-meta');
var gallery=document.getElementById('project-gallery');
var close=document.querySelector('.project-close');

function esc(value){var d=document.createElement('div');d.textContent=String(value==null?'':value);return d.innerHTML;}
function coverPosition(index){return index===0?'0%':(index/(rows.length-1)*100)+'%';}
function galleryPosition(projectIndex,photoIndex){
  var index=projectIndex*8+photoIndex;
  var col=index%8,row=Math.floor(index/8);
  var x=col===0?0:(col/7*100);
  var y=row===0?0:(row/7*100);
  return x+'% '+y+'%';
}
function card(row){return '<button class="portfolio-project" type="button" data-project="'+esc(row.slug)+'"><div class="portfolio-project-photo" style="background-image:var(--portfolio-cover-sprite);background-position:'+coverPosition(row.coverIndex)+' 0"></div><div class="portfolio-project-copy"><h2>'+esc(row.title)+'</h2><div class="portfolio-project-meta">'+esc([row.location,row.area].filter(Boolean).join(' · '))+'</div><div class="portfolio-project-line"><span>'+esc(row.kind)+'</span><b>'+row.photoCount+' PHOTOS →</b></div></div></button>';}

function renderCards(){if(!list)return;list.innerHTML=rows.map(card).join('');}
function openProject(slug,updateHash){
  var row=api&&api.findProject(slug);if(!row||!images)return;
  var projectIndex=rows.findIndex(function(item){return item.slug===row.slug;});
  title.textContent=row.title;
  meta.textContent=[row.location,row.area,row.kind].filter(Boolean).join(' · ');
  gallery.innerHTML='<div class="portfolio-loading">사진을 불러오는 중입니다.</div>';
  modal.classList.add('open');document.body.style.overflow='hidden';
  if(updateHash)history.replaceState(null,'','#'+row.slug);
  images.load('portfolio-galleries').then(function(url){
    gallery.innerHTML='';
    for(var i=0;i<row.photoCount;i+=1){
      var el=document.createElement('div');
      el.className='project-gallery-photo';
      el.setAttribute('role','img');
      el.setAttribute('aria-label',row.title+' 시공 사진 '+(i+1));
      el.style.backgroundImage='url("'+url+'")';
      el.style.backgroundPosition=galleryPosition(projectIndex,i);
      gallery.appendChild(el);
    }
  }).catch(function(){gallery.innerHTML='<div class="portfolio-loading">사진을 불러오지 못했습니다.</div>';});
}
function closeProject(){if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';if(location.hash)history.replaceState(null,'',location.pathname+location.search);}

renderCards();
if(images){images.applyCoverSprite().catch(function(){});}
if(list)list.addEventListener('click',function(e){var btn=e.target.closest('[data-project]');if(btn)openProject(btn.getAttribute('data-project'),true);});
if(modal)modal.addEventListener('click',function(e){if(e.target===modal)closeProject();});
if(close)close.addEventListener('click',closeProject);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal&&modal.classList.contains('open'))closeProject();});
if(location.hash)openProject(decodeURIComponent(location.hash.slice(1)),false);
})();
