(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DAHAM_SLIDESHOW=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function create(options){let revision=0,active=Promise.resolve();const cache=new Map();
  function prepare(frame){const key=frame.src+'|'+(frame.srcset||'');if(cache.has(key))return cache.get(key);const image=Promise.resolve().then(()=>options.load(frame));cache.set(key,image);image.catch(()=>{if(cache.get(key)===image)cache.delete(key);});while(cache.size>4)cache.delete(cache.keys().next().value);return image;}
  async function show(frame){const version=++revision;let image;try{image=await prepare(frame);}catch(error){return false;}if(version!==revision)return false;const job=active.catch(()=>{}).then(async()=>{if(version!==revision)return false;await options.display(image,frame);return true;});active=job;try{return await job;}catch(error){return false;}}
  return{show:show,preload:frame=>prepare(frame).then(()=>true,()=>false)};
 }
 return{create:create};
});
