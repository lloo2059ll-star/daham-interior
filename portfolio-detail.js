(function(){'use strict';
var api=window.DAHAM_PORTFOLIO_STATIC, slug=new URLSearchParams(location.search).get('project'), row=api&&api.findProject(slug), root=document.getElementById('detail-content');
var copy={
 'prugio-castle-a-32':'화이트와 우드 톤을 중심으로 거실과 주방의 연결감을 살린 구미 아파트 전체 인테리어입니다.',
 'geochang-prugio-34':'거실보다 주방의 동선과 수납을 먼저 설계해 생활 중심으로 완성한 거창 아파트 리모델링입니다.',
 'bonggok-hyunjin-36':'탑층의 채광과 수납을 함께 고려해 공간별 기능을 정리한 봉곡 아파트 인테리어입니다.',
 'imeun-kolon-35':'밝은 톤과 수납 계획을 바탕으로 생활 동선을 정리한 임은동 아파트 전체 인테리어입니다.'
};
var spaces={
 'prugio-castle-a-32':[['현관','기존의 답답한 진입부를 정리하고 밝은 마감과 수납을 연결해 첫 동선을 넓혔습니다.'],['거실','화이트·우드 톤을 기본으로 벽면 질감을 더해 채광은 살리고 시선이 분산되지 않도록 했습니다.'],['주방','가구 배치를 다시 잡아 조리와 수납 동선을 분리하고 냉장고와 아일랜드의 간격을 확보했습니다.'],['욕실','타일과 수납을 단순화해 관리가 쉬운 구조로 정리하고 필요한 설비 위치를 맞췄습니다.']],
 'geochang-prugio-34':[['BEFORE · DURING','기존 구조를 확인한 뒤 주방 동선을 먼저 정리하고, 공사 중 배관과 수납 위치를 조정했습니다.'],['주방','거실보다 먼저 주방을 설계해 조리·수납·식사 동선이 겹치지 않도록 구성했습니다.'],['거실','주방과 시선이 자연스럽게 이어지도록 벽면과 조명을 정리해 넓어 보이는 중심 공간을 만들었습니다.'],['욕실','기존 설비 위치를 점검하고 타일·수납·욕실 동선을 실사용 기준으로 다시 맞췄습니다.']],
 'bonggok-hyunjin-36':[['현관','탑층의 밝은 채광을 가리지 않도록 수납을 한쪽으로 정리하고 진입 동선을 깔끔하게 만들었습니다.'],['거실','상부 공간감과 창 방향을 살려 큰 가구가 시야를 막지 않도록 배치했습니다.'],['주방','필요한 수납량을 기준으로 가구를 구성하고 조리대와 이동 공간의 균형을 맞췄습니다.'],['욕실','습기와 물 사용을 고려해 벽·바닥 마감과 수납 위치를 관리 중심으로 정리했습니다.']],
 'imeun-kolon-35':[['현관','입구에 집중되던 수납을 분산해 신발과 생활용품이 한눈에 정리되도록 구성했습니다.'],['거실','밝은 톤을 바탕으로 수납 벽면을 정리해 공간은 넓게, 생활 물건은 보이지 않게 했습니다.'],['주방','상부장과 하부장 비율을 조정해 수납은 확보하고 조리대는 답답하지 않게 만들었습니다.'],['욕실','필요한 설비를 우선 점검한 뒤 타일과 수납을 단순하게 구성해 청소와 관리가 편하도록 했습니다.']]
};
function esc(v){var d=document.createElement('div');d.textContent=v||'';return d.innerHTML;}
if(!row){root.innerHTML='<div class="shell detail-loading"><h1>시공 사례를 찾을 수 없습니다.</h1><a href="portfolio.html">포트폴리오로 돌아가기</a></div>';return;}
document.title=row.title+' | 다함 인테리어';var desc=copy[row.slug]||row.title+' 실제 시공 사진과 공간별 인테리어 내용을 확인하세요.';document.querySelector('meta[name="description"]').setAttribute('content',desc);document.querySelector('link[rel="canonical"]').setAttribute('href','https://daham-interior.com/portfolio-detail.html?project='+row.slug);
var sections=(spaces[row.slug]||[]).map(function(item){return '<section class="detail-section"><h2>'+esc(item[0])+'</h2><p>'+esc(item[1])+'</p></section>';}).join('');
root.innerHTML='<article class="detail shell"><a class="detail-back" href="portfolio.html">← 포트폴리오</a><header class="detail-head"><p class="detail-kicker">DAHAM PROJECT</p><h1>'+esc(row.title)+'</h1><p class="detail-meta">'+esc([row.location,row.area,row.kind].filter(Boolean).join(' · '))+'</p><p class="detail-summary">'+esc(desc)+'</p></header><div class="detail-rule"></div>'+sections+'<section class="detail-gallery" aria-label="시공 사진">'+row.photos.map(function(photo,i){return '<figure><img src="'+esc(photo)+'" alt="'+esc(row.title)+' 시공 사진 '+(i+1)+'" loading="lazy"><figcaption>'+esc(i<2?'완공 사진':'공간별 시공 사진')+'</figcaption></figure>';}).join('')+'</section><section class="detail-cta"><h2>비슷한 현장 상담이 필요하신가요?</h2><p>구미·김천·대구 인테리어 상담부터 현장 실측, 시공 후 A/S까지 직접 안내드립니다.</p><a href="./#footer">견적 문의하기</a></section></article>';
})();
