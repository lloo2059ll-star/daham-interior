(function(root,factory){
  var api=factory(root);
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root&&root.document) root.DAHAM_PUSH=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  function isIos(userAgent){return /iphone|ipad|ipod/i.test(String(userAgent||''));}
  function isStandalone(){return !!(root.matchMedia&&root.matchMedia('(display-mode: standalone)').matches)||root.navigator&&root.navigator.standalone===true;}
  function urlBase64ToUint8Array(value){
    var padding='='.repeat((4-String(value||'').length%4)%4);
    var base64=(String(value||'')+padding).replace(/-/g,'+').replace(/_/g,'/');
    var raw=root.atob?root.atob(base64):atob(base64),out=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  function config(){return root.DAHAM_AUTH.getSupabaseConfig();}
  function headers(){return root.DAHAM_AUTH.getAuthHeaders();}
  async function rpc(name,body){
    var response=await root.fetch(config().url+'/rest/v1/rpc/'+name,{method:'POST',headers:headers(),body:JSON.stringify(body||{})});
    var data=null;try{data=await response.json();}catch(e){}
    if(!response.ok)throw new Error(data&&data.message||'알림 서버 요청에 실패했습니다.');
    return data;
  }
  async function currentSubscription(){
    if(!root.navigator||!root.navigator.serviceWorker)return null;
    var registration=await root.navigator.serviceWorker.getRegistration();
    return registration&&registration.pushManager?registration.pushManager.getSubscription():null;
  }
  function subscriptionPayload(subscription){
    var json=subscription.toJSON(),keys=json.keys||{};
    return {p_endpoint:json.endpoint,p_p256dh:keys.p256dh||'',p_auth:keys.auth||'',p_device_label:isIos(root.navigator.userAgent)?'iPhone/iPad':'Android/Web',p_user_agent:String(root.navigator.userAgent||'').slice(0,500)};
  }
  async function subscribe(){
    if(!('serviceWorker' in root.navigator)||!('PushManager' in root))throw new Error('이 휴대전화는 웹 푸시를 지원하지 않습니다.');
    if(isIos(root.navigator.userAgent)&&!isStandalone())throw new Error('Safari 공유 버튼에서 홈 화면에 추가한 뒤 다함 ERP 아이콘으로 실행하세요.');
    var permission=await root.Notification.requestPermission();
    if(permission!=='granted')throw new Error('휴대전화 설정에서 다함 ERP 알림을 허용해 주세요.');
    var registration=await root.navigator.serviceWorker.register('service-worker.js',{scope:'/'});
    var current=await registration.pushManager.getSubscription();
    if(!current){
      var publicKey=await rpc('get_push_public_key',{});
      current=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(publicKey)});
    }
    await rpc('register_push_subscription',subscriptionPayload(current));
    render('enabled');
    return current;
  }
  async function sendTest(){await rpc('enqueue_test_notification',{});return true;}
  function status(){
    if(!root.Notification)return 'unsupported';
    if(root.Notification.permission==='denied')return 'denied';
    return root.Notification.permission==='granted'?'enabled':'prompt';
  }
  function banner(){
    var doc=root.document,box=doc.getElementById('daham-push-banner');
    if(box)return box;
    box=doc.createElement('aside');box.id='daham-push-banner';box.setAttribute('role','status');
    box.style.cssText='position:fixed;left:50%;bottom:18px;z-index:99999;transform:translateX(-50%);width:min(92vw,520px);padding:14px 16px;border:1px solid #ddd8ff;border-radius:14px;background:#fff;box-shadow:0 12px 36px #18223b33;font:14px/1.45 Pretendard,Arial,sans-serif;color:#18223b';
    doc.body.appendChild(box);return box;
  }
  function render(state,message){
    if(!root.document)return;
    var box=banner();
    if(state==='enabled'){box.innerHTML='<b>휴대전화 알림 사용 중</b><div style="color:#657086;margin-top:3px">일정과 모든 업무 변경 알림을 받습니다.</div>';setTimeout(function(){box.remove();},3500);return;}
    var iosHelp=isIos(root.navigator.userAgent)&&!isStandalone()?'<div style="margin-top:5px;color:#657086">Safari 공유 → 홈 화면에 추가 후 아이콘으로 실행하세요.</div>':'';
    box.innerHTML='<b>휴대전화 알림 설정</b><div style="margin-top:3px">일정 등록·변경과 모든 업무 알림을 받으세요.</div>'+iosHelp+(message?'<div style="margin-top:5px;color:#c62828">'+String(message).replace(/[<>&]/g,'')+'</div>':'')+'<button id="daham-push-enable" style="margin-top:10px;border:0;border-radius:9px;background:#7058e8;color:#fff;padding:9px 14px;font-weight:800">알림 받기</button>';
    box.querySelector('#daham-push-enable').onclick=async function(){this.disabled=true;try{await subscribe();}catch(error){render('prompt',error.message);}finally{this.disabled=false;}};
  }
  async function init(){
    if(!root.document||!root.DAHAM_AUTH||!await root.DAHAM_AUTH.ready)return false;
    if(!root.navigator||!('serviceWorker' in root.navigator)||!root.Notification)return false;
    if(!root.document.body)await new Promise(function(resolve){root.document.addEventListener('DOMContentLoaded',resolve,{once:true});});
    if(status()==='enabled'){
      try{var sub=await currentSubscription();if(sub){await rpc('register_push_subscription',subscriptionPayload(sub));return true;}}catch(e){}
    }
    render(status());return true;
  }
  return {isIos:isIos,isStandalone:isStandalone,urlBase64ToUint8Array:urlBase64ToUint8Array,subscribe:subscribe,sendTest:sendTest,status:status,init:init};
});
