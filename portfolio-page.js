(function(){
'use strict';
var api=window.DAHAM_PORTFOLIO_STATIC;
var rows=api?api.listProjects():[];
var list=document.getElementById('portfolio-list');
var modal=document.getElementById('project-modal');
var title=document.getElementById('project-title');
var meta=document.getElementById('project-meta');
var gallery=document.getElementById('project-gallery');
var close=document.querySelector('.project-close');

function esc(value){var d=document.createElement('div');d.textContent=String(value==null?'':value);return d.innerHTML;}
function card(row){return '<button class="portfolio-project" type="button" data-project="'+esc(row.slug)+'"><div class="portfolio-project-photo"><img src="'+esc(row.coverImage)+'" alt="'+esc(row.title)+'" loading="lazy"></div><div class="portfolio-project-copy"><h2>'+esc(row.title)+'</h2><div class="portfolio-project-meta">'+esc([row.location,row.area].filter(Boolean).join(' · '))+'</div><div class="portfolio-project-line"><span>'+esc(row.kind)+'</span><b>'+row.photos.length+' PHOTOS →</b></div></div></button>';}

function renderCards(){if(!list)return;list.innerHTML=rows.map(card).join('');}
function openProject(slug,updateHash){
  var row=api&&api.findProject(slug);if(!row)return;
  title.textContent=row.title;
  meta.textContent=[row.location,row.area,row.kind].filter(Boolean).join(' · ');
  gallery.innerHTML='<div class="portfolio-loading">사진을 불러오는 중입니다.</div>';
  modal.classList.add('open');document.body.style.overflow='hidden';
  if(updateHash)history.replaceState(null,'','#'+row.slug);
  gallery.innerHTML='';
  row.photos.forEach(function(url,index){
    var figure=document.createElement('figure');
    figure.className='project-gallery-photo';
    var img=document.createElement('img');
    img.src=url;img.alt=row.title+' 시공 사진 '+(index+1);img.loading='lazy';
    img.addEventListener('error',function(){figure.classList.add('is-error');figure.innerHTML='<span>사진을 불러오지 못했습니다.</span>';});
    figure.appendChild(img);gallery.appendChild(figure);
  });
}
function closeProject(){if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';if(location.hash)history.replaceState(null,'',location.pathname+location.search);}

renderCards();
if(list)list.addEventListener('click',function(e){var btn=e.target.closest('[data-project]');if(btn)openProject(btn.getAttribute('data-project'),true);});
if(modal)modal.addEventListener('click',function(e){if(e.target===modal)closeProject();});
if(close)close.addEventListener('click',closeProject);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal&&modal.classList.contains('open'))closeProject();});
if(location.hash)openProject(decodeURIComponent(location.hash.slice(1)),false);
})();
