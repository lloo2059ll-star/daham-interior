(function(){
  'use strict';
  var url='https://famqvwnsustbxuizohni.supabase.co';
  var key='sb_publishable_Rm1rOYizfT6ichTlh2la9w_G4O7fTNf';
  var sb=(window.supabase&&window.DAHAM_WEBSITE_PUBLIC)?window.supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
  var form=document.getElementById('inquiry-page-form');
  var result=document.getElementById('form-result');
  var submit=document.getElementById('submit-inquiry');
  function show(message,type){result.textContent=message;result.className='result '+(type||'');}
  form.addEventListener('submit',async function(event){
    event.preventDefault();show('');
    if(!form.reportValidity())return;
    submit.disabled=true;
    try{
      if(!sb)throw new Error('잠시 후 다시 시도해 주세요.');
      var payload=DAHAM_WEBSITE_PUBLIC.buildInquiryPayload({
        name:form.elements.name.value,phone:form.elements.phone.value,address:form.elements.address.value,
        siteName:form.elements.siteName.value,area:form.elements.area.value,budget:form.elements.budget.value,
        moveDate:form.elements.moveDate.value,message:form.elements.message.value,workScope:form.elements.workScope.value,
        sourceLabel:'네이버 블로그',privacyConsent:document.getElementById('privacy').checked,honeypot:form.elements.website.value
      });
      var response=await sb.from('website_inquiries').insert(payload);
      if(response.error)throw response.error;
      form.reset();show('문의가 접수되었습니다. 확인 후 순서대로 연락드리겠습니다.','success');
    }catch(error){show(error&&error.message?error.message:'문의 접수 중 오류가 발생했습니다.','error');}
    finally{submit.disabled=false;}
  });
})();
