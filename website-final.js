(function(){
'use strict';
var SUPABASE_URL='https://famqvwnsustbxuizohni.supabase.co';
var SUPABASE_KEY='sb_publishable_Rm1rOYizfT6ichTlh2la9w_G4O7fTNf';
var INSTAGRAM_URL='https://www.instagram.com/daham.co/';
var sb=(window.supabase&&window.DAHAM_WEBSITE_PUBLIC)?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
var portfolioGrid=document.getElementById('portfolio-grid');var modal=document.getElementById('inquiry-modal');var form=document.getElementById('inquiry-form');var result=document.getElementById('inquiry-result');var submit=document.getElementById('inquiry-submit');
function esc(value){var d=document.createElement('div');d.textContent=String(value==null?'':value);return d.innerHTML;}
function portfolioCard(p){var meta=[p.location,p.areaPyeong?p.areaPyeong+'평':''].filter(Boolean).join(' ');var tags=[p.style?'#'+p.style.replace(/\s+/g,''):'','#DAHAM'].filter(Boolean).join(' ');var image=p.coverImageUrl?'<img src="'+esc(p.coverImageUrl)+'" alt="'+esc(p.title)+'" loading="lazy">':'';return '<article class="portfolio-card"><div class="portfolio-photo">'+image+'</div><div class="portfolio-body"><div class="portfolio-title">'+esc(p.title||'DAHAM PROJECT')+'</div><div class="portfolio-kind">'+esc(meta||'전체 인테리어')+'</div><div class="portfolio-tags">'+esc(tags)+'</div><span class="card-arrow">→</span></div></article>';}
function renderPortfolio(rows){if(!rows||!rows.length)return;portfolioGrid.innerHTML=rows.slice(0,4).map(function(row){return portfolioCard(DAHAM_WEBSITE_PUBLIC.normalizePortfolioRow(row));}).join('');}
function loadPortfolio(){if(!sb)return;sb.from('website_portfolio').select('id,slug,title,location,area_pyeong,style,summary,cover_image_url,sort_order').eq('is_published',true).order('sort_order',{ascending:true}).limit(4).then(function(res){if(res.error)throw res.error;renderPortfolio(res.data||[]);}).catch(function(){});}
function bindInstagram(){
  document.querySelectorAll('.insta-btn,.social-icon.instagram').forEach(function(link){
    link.href=INSTAGRAM_URL;link.target='_blank';link.rel='noopener noreferrer';
  });
  var quick=document.querySelector('.quick-links');
  if(quick&&!quick.querySelector('[data-instagram-link]')){
    var link=document.createElement('a');link.href=INSTAGRAM_URL;link.target='_blank';link.rel='noopener noreferrer';link.textContent='인스타그램';link.setAttribute('data-instagram-link','');quick.appendChild(link);
  }
}
function openInquiry(e){if(e)e.preventDefault();result.textContent='';result.className='result';modal.classList.add('open');document.body.style.overflow='hidden';setTimeout(function(){document.getElementById('inq-name').focus();},10);}function closeInquiry(){modal.classList.remove('open');document.body.style.overflow='';}
document.querySelectorAll('[data-open-inquiry]').forEach(function(btn){btn.addEventListener('click',openInquiry);});document.querySelectorAll('[data-close-inquiry]').forEach(function(btn){btn.addEventListener('click',closeInquiry);});modal.addEventListener('click',function(e){if(e.target===modal)closeInquiry();});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.classList.contains('open'))closeInquiry();});
form.addEventListener('submit',async function(e){e.preventDefault();result.textContent='';result.className='result';submit.disabled=true;try{if(!sb)throw new Error('잠시 후 다시 시도해주세요.');var payload=DAHAM_WEBSITE_PUBLIC.buildInquiryPayload({name:form.elements.name.value,phone:form.elements.phone.value,email:form.elements.email.value,siteName:form.elements.siteName.value,address:form.elements.address.value,addressDetail:form.elements.addressDetail.value,area:form.elements.area.value,budget:form.elements.budget.value,moveDate:form.elements.moveDate.value,message:form.elements.message.value,privacyConsent:document.getElementById('inq-privacy').checked,honeypot:form.elements.website.value});var response=await sb.from('website_inquiries').insert(payload);if(response.error)throw response.error;result.textContent='문의가 접수되었습니다. 확인 후 연락드리겠습니다.';result.className='result success';form.reset();}catch(err){result.textContent=err&&err.message?err.message:'문의 접수 중 오류가 발생했습니다.';result.className='result error';}finally{submit.disabled=false;}});
bindInstagram();
loadPortfolio();
})();
