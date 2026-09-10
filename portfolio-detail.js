(function(){'use strict';
var api=window.DAHAM_PORTFOLIO_STATIC, slug=new URLSearchParams(location.search).get('project'), row=api&&api.findProject(slug), root=document.getElementById('detail-content');
var copy={
 'prugio-castle-a-32':'화이트와 우드 톤을 중심으로 거실과 주방의 연결감을 살린 구미 아파트 전체 인테리어입니다.',
 'geochang-prugio-34':'거실보다 주방의 동선과 수납을 먼저 설계해 생활 중심으로 완성한 거창 아파트 리모델링입니다.',
 'bonggok-hyunjin-36':'탑층의 채광과 수납을 함께 고려해 공간별 기능을 정리한 봉곡 아파트 인테리어입니다.',
 'imeun-kolon-35':'밝은 톤과 수납 계획을 바탕으로 생활 동선을 정리한 임은동 아파트 전체 인테리어입니다.'
};
function esc(v){var d=document.createElement('div');d.textContent=v||'';return d.innerHTML;}
if(!row){root.innerHTML='<div class="shell detail-loading"><h1>시공 사례를 찾을 수 없습니다.</h1><a href="portfolio.html">포트폴리오로 돌아가기</a></div>';return;}
document.title=row.title+' | 다함 인테리어';var desc=copy[row.slug]||row.title+' 실제 시공 사진과 공간별 인테리어 내용을 확인하세요.';document.querySelector('meta[name="description"]').setAttribute('content',desc);document.querySelector('link[rel="canonical"]').setAttribute('href','https://daham-interior.com/portfolio-detail.html?project='+row.slug);
root.innerHTML='<article class="detail shell"><a class="detail-back" href="portfolio.html">← 포트폴리오</a><header class="detail-head"><p class="detail-kicker">DAHAM PROJECT</p><h1>'+esc(row.title)+'</h1><p class="detail-meta">'+esc([row.location,row.area,row.kind].filter(Boolean).join(' · '))+'</p><p class="detail-summary">'+esc(desc)+'</p></header><div class="detail-rule"></div><section class="detail-section"><h2>현장 소개</h2><p>기존 공간의 불편한 동선과 수납을 확인한 뒤, 가족의 생활 방식에 맞춰 필요한 부분을 우선 정리했습니다. 사진과 함께 시공 결과를 확인해보세요.</p></section><section class="detail-gallery" aria-label="시공 사진">'+row.photos.map(function(photo,i){return '<figure><img src="portfolio-assets/projects/'+row.slug+'/'+photo+'.webp" alt="'+esc(row.title)+' 시공 사진 '+(i+1)+'" loading="lazy"><figcaption>'+esc(i<2?'완공 사진':'공간별 시공 사진')+'</figcaption></figure>';}).join('')+'</section><section class="detail-cta"><h2>비슷한 현장 상담이 필요하신가요?</h2><p>구미·김천·대구 인테리어 상담부터 현장 실측, 시공 후 A/S까지 직접 안내드립니다.</p><a href="./#footer">견적 문의하기</a></section></article>';
})();
