const clean=(value:unknown)=>String(value==null?'':value).trim();
export function safeFilename(value:unknown,fallback='file'){
  let name=clean(value).normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/\.{2,}/g,'.').replace(/^\.+/,'_').replace(/[. ]+$/g,'');
  if(!name||name==='.'||name==='..')name=fallback;
  const parts=name.split('.'),ext=parts.length>1?'.'+parts.pop()!.slice(0,16):'';
  return parts.join('.').slice(0,Math.max(1,120-ext.length))+ext;
}
export function buildManifest(rows:any[]=[]){
  const normalized=rows.map(row=>{
    for(const key of ['journalId','photoId','storagePath','originalName','mimeType','sha256'])if(!clean(row[key]))throw new Error('INVALID_MANIFEST_'+key.toUpperCase());
    const byteSize=Number(row.byteSize);if(!Number.isSafeInteger(byteSize)||byteSize<=0||!/^[0-9a-f]{64}$/i.test(row.sha256))throw new Error('INVALID_MANIFEST_INTEGRITY');
    const workDate=clean(row.workDate);if(!/^\d{4}-\d{2}-\d{2}$/.test(workDate))throw new Error('INVALID_WORK_DATE');
    return {journalId:clean(row.journalId),photoId:clean(row.photoId),storagePath:clean(row.storagePath),originalName:safeFilename(row.originalName,row.photoId+'.bin'),mimeType:clean(row.mimeType).toLowerCase(),byteSize,sha256:clean(row.sha256).toLowerCase(),workDate,trade:clean(row.trade)||'기타',sortOrder:Number(row.sortOrder||0)};
  }).sort((a,b)=>a.workDate.localeCompare(b.workDate)||a.trade.localeCompare(b.trade,'ko')||a.journalId.localeCompare(b.journalId)||a.sortOrder-b.sortOrder||a.photoId.localeCompare(b.photoId));
  const used=new Set<string>();return normalized.map(row=>{let key=`${row.workDate}/${safeFilename(row.trade,'기타')}/${row.originalName}`;if(used.has(key))key=key.replace(/(\.[^.]+)?$/,`-${row.photoId.slice(0,8)}$1`);used.add(key);return {...row,archivePath:'사진/'+key};});
}
export function verifyManifest(manifest:any[],expected:any){
  const photoCount=manifest.length,sourceBytes=manifest.reduce((n,x)=>n+x.byteSize,0),hashes=manifest.map(x=>x.sha256).sort();
  if(Number(expected.photoCount)!==photoCount)throw new Error('PHOTO_COUNT_MISMATCH');if(Number(expected.sourceBytes)!==sourceBytes)throw new Error('SOURCE_BYTES_MISMATCH');
  if(expected.sha256&&JSON.stringify(expected.sha256.map(String).sort())!==JSON.stringify(hashes))throw new Error('SOURCE_HASH_MISMATCH');return {photoCount,sourceBytes,sha256:hashes};
}
export function archivePaths(companyId:unknown,projectId:unknown,archiveId:unknown){const base=[clean(companyId),safeFilename(projectId,'project'),clean(archiveId)].join('/');if(!clean(companyId)||!clean(archiveId))throw new Error('INVALID_ARCHIVE_PATH');return {pdf:base+'/준공-현장일지.pdf',zip:base+'/준공-현장일지.zip',manifest:base+'/manifest.json'};}
export function safeErrorCode(error:any){return (clean(error&&(error.code||error.message)).toUpperCase().replace(/[^A-Z0-9_]/g,'_').slice(0,64)||'ARCHIVE_GENERATION_FAILED');}
