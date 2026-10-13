(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DAHAM_UI_HELPERS=api;
  root.dahamConfirm=function(message,callback){
    return api.confirmAction(message,callback,function(text){return root.confirm(text);});
  };
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function confirmAction(message,callback,confirmFn){
    confirmFn=confirmFn||function(text){return window.confirm(text);};
    if(!confirmFn(message))return false;
    var result=callback();
    return result===undefined?true:result;
  }
  return {confirmAction:confirmAction};
});
