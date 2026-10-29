(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DAHAM_REDESIGN_INQUIRY=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function buildPayload(api,values){
  const extras=[['유입 경로',values.referral],['공간 유형',values.spaceType],['입주 예정일',values.occupancyDate]].filter(x=>x[1]).map(x=>'['+x[0]+': '+String(x[1]).trim()+']');
  const message=extras.concat(String(values.message||'').trim()).filter(Boolean).join('\n');
  if(message.length>4000)throw new Error('문의 내용은 추가 정보를 포함해 4000자 이내로 입력해 주세요.');
  return api.buildInquiryPayload(Object.assign({},values,{message:message}));
 }
 function resolveSourceChannel(api,currentUrl,referrer,stored){
  const detected=api.detectSourceChannel(currentUrl,referrer);if(detected==='naver_blog')return detected;
  try{if(referrer&&new URL(referrer).origin!==new URL(currentUrl).origin)return 'website';}catch(error){}
  return stored==='naver_blog'?'naver_blog':'website';
 }
 function bind(form,client){
  if(!form)return;let sourceChannel=globalThis.DAHAM_WEBSITE_PUBLIC.detectSourceChannel(location.href,document.referrer);try{sourceChannel=resolveSourceChannel(globalThis.DAHAM_WEBSITE_PUBLIC,location.href,document.referrer,sessionStorage.getItem('daham_public_source'));sessionStorage.setItem('daham_public_source',sourceChannel);}catch(error){}const result=form.querySelector('.do-feedback'),submit=form.querySelector('[type=submit]');let busy=false;
  form.addEventListener('invalid',function(event){const disclosure=event.target.closest('details');if(disclosure)disclosure.open=true;},true);
  form.addEventListener('submit',async function(event){event.preventDefault();if(busy||!form.reportValidity())return;result.textContent='';busy=true;submit.disabled=true;form.setAttribute('aria-busy','true');
   try{const values=Object.fromEntries(new FormData(form));values.privacyConsent=form.elements.privacyConsent.checked;values.sourceChannel=sourceChannel;values.honeypot=values.website||'';
    const payload=buildPayload(globalThis.DAHAM_WEBSITE_PUBLIC,values);
    if(location.hostname==='127.0.0.1'||location.hostname==='localhost'){result.textContent='입력 항목 확인 완료. 로컬 확인 화면에서는 실제 상담을 접수하지 않습니다.';return;}
    if(!client)throw new Error('상담 접수 연결이 원활하지 않습니다. 010-2059-0347로 연락해 주세요.');
    const response=await client.from('website_inquiries').insert(payload);if(response.error)throw new Error('접수 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.');
    if(globalThis.DAHAM_CONVERSION)globalThis.DAHAM_CONVERSION.track('generate_lead',{location:'inquiry_page',pagePath:location.pathname});result.textContent='문의가 접수되었습니다. 확인 후 연락드리겠습니다.';form.reset();
   }catch(error){result.textContent=error.message||'문의 접수 중 오류가 발생했습니다.';}finally{busy=false;submit.disabled=false;form.removeAttribute('aria-busy');}
  });
 }
 return {buildPayload:buildPayload,resolveSourceChannel:resolveSourceChannel,bind:bind};
});

