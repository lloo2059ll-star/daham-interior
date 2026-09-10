(function(){
'use strict';
var SUPABASE_URL='https://famqvwnsustbxuizohni.supabase.co';
var SUPABASE_KEY='sb_publishable_Rm1rOYizfT6ichTlh2la9w_G4O7fTNf';
var api=window.DAHAM_PORTFOLIO_STATIC;
var rows=api?api.listProjects():[];
var sb=(window.supabase&&window.DAHAM_WEBSITE_PUBLIC)?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
var list=document.getElementById('portfolio-list');
var modal=document.getElementById('project-modal');
var title=document.getElementById('project-title');
var meta=document.getElementById('project-meta');
var gallery=document.getElementById('project-gallery');
var close=document.querySelector('.project-close');
var PORTFOLIO_FIELDS='id,slug,title,location,area_pyeong,style,summary,cover_image_url,gallery_image_urls,sort_order';
var PORTFOLIO_LEGACY_FIELDS='id,slug,title,location,area_pyeong,style,summary,cover_image_url,sort_order';

function esc(value){var d=document.createElement('div');d.textContent=String(value==null?'':value);return d.innerHTML;}
function projectBySlug(slug){return rows.find(function(row){return row.slug===slug;})||null;}
function card(row){return '<a class="portfolio-project" href="portfolio-detail.html?project='+encodeURIComponent(row.slug)+'" data-project="'+esc(row.slug)+'"><div class="portfolio-project-photo"><img src="'+esc(row.coverImage)+'" alt="'+esc(row.title)+'" loading="lazy" style="object-position:'+esc(row.coverPosition||'center center')+'"></div><div class="portfolio-project-copy"><h2>'+esc(row.title)+'</h2><div class="portfolio-project-meta">'+esc([row.location,row.area].filter(Boolean).join(' · '))+'</div><div class="portfolio-project-line"><span>'+esc(row.kind)+'</span><b>'+row.photos.length+' PHOTOS →</b></div></div></a>';}
function renderCards(){if(list)list.innerHTML=rows.map(card).join('');}

function mergePublishedRows(published){
  (published||[]).forEach(function(raw){
    var row=DAHAM_WEBSITE_PUBLIC.normalizePortfolioRow(raw);
    var current=projectBySlug(row.slug);
    if(!current)return;
    if(row.coverImageUrl)current.coverImage=row.coverImageUrl;
    if(row.galleryImageUrls.length)current.photos=row.galleryImageUrls.slice();
  });
  renderCards();
  if(location.hash&&modal.classList.contains('open'))openProject(decodeURIComponent(location.hash.slice(1)),false);
}

function isMissingGalleryColumn(error){return Boolean(error&&/gallery_image_urls/i.test(String(error.message||error.details||'')));}
function fetchPublishedRows(fields){return sb.from('website_portfolio').select(fields).eq('is_published',true);}

function loadPublishedRows(){
  if(!sb)return;
  fetchPublishedRows(PORTFOLIO_FIELDS).then(function(result){
    if(result.error&&isMissingGalleryColumn(result.error))return fetchPublishedRows(PORTFOLIO_LEGACY_FIELDS);
    return result;
  }).then(function(result){if(result.error)throw result.error;mergePublishedRows(result.data||[]);}).catch(function(){});
}

function openProject(slug,updateHash){
  var row=projectBySlug(slug);if(!row)return;
  title.textContent=row.title;
  meta.textContent=[row.location,row.area,row.kind].filter(Boolean).join(' · ');
  gallery.innerHTML='<div class="portfolio-loading">사진을 불러오는 중입니다.</div>';
  modal.classList.add('open');document.body.style.overflow='hidden';
  if(updateHash)history.replaceState(null,'','#'+row.slug);
  gallery.innerHTML='';
  row.photos.forEach(function(url,index){
    var figure=document.createElement('figure');figure.className='project-gallery-photo';
    var img=document.createElement('img');img.src=url;img.alt=row.title+' 시공 사진 '+(index+1);img.loading='lazy';
    img.addEventListener('error',function(){figure.classList.add('is-error');figure.innerHTML='<span>사진을 불러오지 못했습니다.</span>';});
    figure.appendChild(img);gallery.appendChild(figure);
  });
}
function closeProject(){if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';if(location.hash)history.replaceState(null,'',location.pathname+location.search);}

renderCards();loadPublishedRows();
if(list)list.addEventListener('click',function(e){var btn=e.target.closest('[data-project]');if(btn&&e.ctrlKey===false&&e.metaKey===false){} });
if(modal)modal.addEventListener('click',function(e){if(e.target===modal)closeProject();});
if(close)close.addEventListener('click',closeProject);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal&&modal.classList.contains('open'))closeProject();});
if(location.hash)openProject(decodeURIComponent(location.hash.slice(1)),false);
})();
