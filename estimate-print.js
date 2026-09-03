(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.DAHAM_ESTIMATE_PRINT=api;api.bind(root,root.document);}
})(typeof self!=='undefined'?self:this,function(){
  'use strict';

  function moveChildren(source,target){
    if(!source||!target)return;
    while(source.firstChild)target.appendChild(source.firstChild);
  }

  function bind(root,document){
    root.addEventListener('beforeprint',function(){
      moveChildren(document.getElementById('v2-sections-host'),document.getElementById('sections-container'));
    });
    root.addEventListener('afterprint',function(){
      moveChildren(document.getElementById('sections-container'),document.getElementById('v2-sections-host'));
    });
  }

  return {bind:bind,moveChildren:moveChildren};
});
