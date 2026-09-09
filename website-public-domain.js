(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.DAHAM_WEBSITE_PUBLIC=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function text(value){ return String(value==null?'':value).trim(); }

  function normalizeSourceChannel(value){ return value==='naver_blog'?'naver_blog':'website'; }

  function normalizePhone(value){
    var digits=String(value==null?'':value).replace(/\D/g,'');
    if(digits.length===11) return digits.slice(0,3)+'-'+digits.slice(3,7)+'-'+digits.slice(7);
    if(digits.length===10) return digits.slice(0,3)+'-'+digits.slice(3,6)+'-'+digits.slice(6);
    return text(value);
  }

  function safeImageUrl(value){
    var raw=text(value);
    if(!raw) return '';
    if(/^(?:\.\/|\/)(?!\/)/.test(raw)) return raw;
    try{
      var url=new URL(raw);
      return url.protocol==='https:'||url.protocol==='http:'?raw:'';
    }catch(e){ return ''; }
  }

  function normalizeGalleryUrls(values){
    var seen={};
    return (Array.isArray(values)?values:[]).map(safeImageUrl).filter(function(url){if(!url||seen[url])return false;seen[url]=true;return true;});
  }

  function buildInquiryPayload(values){
    values=values||{};
    var name=text(values.name);
    var phone=normalizePhone(values.phone);
    var workScope=text(values.workScope);
    var message=text(values.message);
    if(!name) throw new Error('이름을 입력해 주세요.');
    if(!phone) throw new Error('연락처를 입력해 주세요.');
    if(values.privacyConsent!==true) throw new Error('개인정보 수집 및 이용에 동의해 주세요.');
    if(workScope&&['전체 공사','부분 공사'].indexOf(workScope)<0) throw new Error('공사 범위를 올바르게 선택해 주세요.');
    var messageParts=[];
    if(workScope) messageParts.push('[공사 범위: '+workScope+']');
    if(message) messageParts.push(message);
    return {
      name:name,
      phone:phone,
      email:text(values.email),
      address:text(values.address),
      address_detail:text(values.addressDetail),
      site_name:text(values.siteName),
      area:text(values.area),
      budget:text(values.budget),
      move_date:text(values.moveDate)||null,
      message:messageParts.join('\n'),
      privacy_consent:true,
      honeypot:text(values.honeypot),
      source:'website',
      source_channel:normalizeSourceChannel(values.sourceChannel)
    };
  }

  function normalizePortfolioRow(row){
    row=row||{};
    return {
      id:text(row.id),
      slug:text(row.slug),
      title:text(row.title),
      location:text(row.location),
      areaPyeong:row.area_pyeong==null||row.area_pyeong===''?null:Number(row.area_pyeong),
      style:text(row.style),
      summary:text(row.summary),
      coverImageUrl:safeImageUrl(row.cover_image_url),
      galleryImageUrls:normalizeGalleryUrls(row.gallery_image_urls),
      sortOrder:Number(row.sort_order)||0
    };
  }

  return {normalizePhone:normalizePhone,normalizeSourceChannel:normalizeSourceChannel,safeImageUrl:safeImageUrl,normalizeGalleryUrls:normalizeGalleryUrls,buildInquiryPayload:buildInquiryPayload,normalizePortfolioRow:normalizePortfolioRow};
});
