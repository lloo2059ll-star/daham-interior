'use strict';

self.addEventListener('push',function(event){
  var data={};try{data=event.data?event.data.json():{};}catch(e){data={body:event.data?event.data.text():'다함 ERP 알림'};}
  event.waitUntil(self.registration.showNotification(data.title||'다함 ERP',{
    body:data.body||'새로운 알림이 있습니다.',icon:'daham-icon.svg',badge:'daham-icon.svg',
    tag:data.tag||undefined,renotify:!!data.renotify,data:{target:data.target||'index.html'}
  }));
});

self.addEventListener('notificationclick',function(event){
  event.notification.close();
  var target=event.notification.data&&event.notification.data.target||'index.html';
  var url=new URL(target,self.location.origin);
  if(url.origin!==self.location.origin)url=new URL('index.html',self.location.origin);
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    for(var i=0;i<list.length;i++){
      if('navigate' in list[i]&&'focus' in list[i])return list[i].navigate(url.href).then(function(client){return client.focus();});
    }
    return clients.openWindow?clients.openWindow(url.href):undefined;
  }));
});
