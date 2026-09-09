(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.DAHAM_INQUIRY=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var FIELDS={
    1:['name','phone'],
    2:['address','siteName','area','workScope','budget','moveDate'],
    3:['message','privacyConsent']
  };
  function text(value){return String(value==null?'':value).trim();}
  function invalid(field,message){return {valid:false,field:field,message:message};}
  function stepFields(step){return (FIELDS[Number(step)]||[]).slice();}
  function validateStep(step,values){
    step=Number(step);values=values||{};
    if(step===1&&!text(values.name))return invalid('name','성함을 입력해 주세요.');
    if(step===1&&!text(values.phone))return invalid('phone','연락처를 입력해 주세요.');
    if(step===2&&['전체 공사','부분 공사'].indexOf(text(values.workScope))<0)return invalid('workScope','공사 범위를 선택해 주세요.');
    if(step===3&&values.privacyConsent!==true)return invalid('privacyConsent','개인정보 수집 및 이용에 동의해 주세요.');
    return {valid:true,field:'',message:''};
  }
  return {stepFields:stepFields,validateStep:validateStep};
});

