import { createClient } from 'npm:@supabase/supabase-js@2';
import { sha256 as incrementalSha256 } from 'npm:@noble/hashes@1.7.1/sha256';
import * as domain from './domain.ts';

const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers:{...cors,'content-type':'application/json'} });
const enc = new TextEncoder();
const PASSTHROUGH_IMAGE_TYPES = ['image/heic','image/heif']; // originals stay byte-for-byte unchanged in ZIP

function crcTable() { const t=[]; for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;} return t; }
const CRC=crcTable();
function crc32(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes)c=CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u16(n:number){return new Uint8Array([n&255,(n>>>8)&255]);}
function u32(n:number){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function concat(parts:Uint8Array[]){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}

// Store-mode ZIP. Only one source object is buffered at a time; the whole archive is never assembled in memory.
function zipStream(entries:{name:string,load:()=>Promise<Uint8Array>}[]) {
  let offset=0; const central:Uint8Array[]=[];
  return new ReadableStream<Uint8Array>({
    async start(controller){
      try {
        for(const entry of entries){
          const name=enc.encode(entry.name), body=await entry.load(), crc=crc32(body);
          const local=concat([u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(body.length),u32(body.length),u16(name.length),u16(0),name]);
          controller.enqueue(local); controller.enqueue(body);
          central.push(concat([u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(body.length),u32(body.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
          offset += local.length + body.length;
        }
        const start=offset; for(const row of central){controller.enqueue(row);offset+=row.length;}
        controller.enqueue(concat([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(offset-start),u32(start),u16(0)]));
        controller.close();
      } catch(error){controller.error(error);}
    }
  });
}

function pdfBytes(journals:any[]) {
  const hex=(value:string)=>[...String(value)].map(ch=>{const cp=ch.codePointAt(0)!;return cp<=0xffff?cp.toString(16).padStart(4,'0'):'003f';}).join('').toUpperCase();
  const lines=['준공 현장일지',...journals.flatMap(j=>[`${j.work_date}  ${j.trade||'기타'}`,String(j.content||'')])].slice(0,1500),pages=[];for(let i=0;i<lines.length;i+=45)pages.push(lines.slice(i,i+45));if(!pages.length)pages.push(['준공 현장일지']);
  const fontId=3+pages.length*2,objs:string[]=[`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,''];const kids=[];
  pages.forEach((page,pageIndex)=>{const pageId=3+pageIndex*2,contentId=pageId+1;kids.push(`${pageId} 0 R`);const content=page.map((line,i)=>`BT /F1 10 Tf 40 ${800-i*17} Td <${hex(line)}> Tj ET`).join('\n');objs.push(`${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >> endobj`,`${contentId} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`);});
  objs[1]=`2 0 obj << /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >> endobj`;objs.push(`${fontId} 0 obj << /Type /Font /Subtype /Type0 /BaseFont /HYSMyeongJo-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [${fontId+1} 0 R] >> endobj`,`${fontId+1} 0 obj << /Type /Font /Subtype /CIDFontType0 /BaseFont /HYSMyeongJo-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 1 >> >> endobj`);
  let pdf='%PDF-1.4\n',offsets=[0]; for(const o of objs){offsets.push(pdf.length);pdf+=o+'\n';} const xref=pdf.length;pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer << /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return enc.encode(pdf);
}
async function sha256(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function bodyBytes(blob:Blob){return new Uint8Array(await blob.arrayBuffer());}

Deno.serve(async (req:Request) => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  let archiveId:string|undefined;
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!token) return json({error:'UNAUTHENTICATED'},401);
    const {data:{user},error:userError}=await admin.auth.getUser(token); if(userError||!user) return json({error:'UNAUTHENTICATED'},401);
    const {projectId,idempotencyKey}=await req.json();
    if(!projectId||!idempotencyKey||String(idempotencyKey).length<8) return json({error:'INVALID_REQUEST'},400);
    const {data:membership}=await admin.from('company_memberships').select('company_id,status,profiles!inner(role,is_active)').eq('profile_id',user.id).eq('status','active').eq('profiles.is_active',true).in('profiles.role',['owner','admin']).limit(1).maybeSingle();
    if(!membership || !['owner','admin'].includes((membership as any).profiles.role)) return json({error:'FORBIDDEN'},403);
    const companyId=membership.company_id;
    const {data:existing}=await admin.from('completion_archives').select('id,status').eq('company_id',companyId).eq('project_id',projectId).eq('idempotency_key',idempotencyKey).maybeSingle();
    if(existing && ['queued','processing','ready'].includes(existing.status)) return json({archiveId:existing.id,status:existing.status});
    if(existing){archiveId=existing.id;await admin.from('completion_archives').update({status:'processing',error_code:null,error_message:null,checkpoint:{stage:'snapshot'}}).eq('id',archiveId);}
    else {
      const {data:created,error}=await admin.from('completion_archives').insert({company_id:companyId,project_id:projectId,status:'processing',snapshot_at:new Date().toISOString(),journal_count:0,photo_count:0,source_bytes:0,created_by:user.id,idempotency_key:idempotencyKey,checkpoint:{stage:'snapshot'}}).select('id').single();
      if(error) throw error; archiveId=created.id;
    }
    const {data:journals,error:jError}=await admin.from('site_journals').select('id,work_date,trade,content,visit_type,created_at').eq('company_id',companyId).eq('project_id',projectId).is('deleted_at',null).order('work_date'); if(jError) throw jError;
    const ids=(journals||[]).map(j=>j.id); let photos:any[]=[];
    if(ids.length){const {data,error}=await admin.from('site_journal_photos').select('id,journal_id,storage_path,original_name,mime_type,byte_size,sha256,sort_order,site_journals!inner(work_date,trade)').in('journal_id',ids).eq('status','ready').is('deleted_at',null);if(error)throw error;photos=data||[];}
    const rows=photos.map(p=>({journalId:p.journal_id,photoId:p.id,storagePath:p.storage_path,originalName:p.original_name,mimeType:p.mime_type,byteSize:p.byte_size,sha256:p.sha256,sortOrder:p.sort_order,workDate:p.site_journals.work_date,trade:p.site_journals.trade}));
    const manifest=domain.buildManifest(rows), totals=domain.verifyManifest(manifest,{photoCount:photos.length,sourceBytes:photos.reduce((n,p)=>n+Number(p.byte_size),0),sha256:photos.map(p=>p.sha256)}), paths=domain.archivePaths(companyId,projectId,archiveId);
    await admin.from('completion_archives').update({journal_count:journals?.length||0,photo_count:totals.photoCount,source_bytes:totals.sourceBytes,snapshot_manifest:manifest,checkpoint:{stage:'artifacts'}}).eq('id',archiveId);
    const manifestBytes=enc.encode(JSON.stringify({version:1,createdAt:new Date().toISOString(),projectId,journals:journals||[],photos:manifest},null,2));
    const pdf=pdfBytes(journals||[]); await admin.storage.from('completion-archives').upload(paths.pdf,pdf,{contentType:'application/pdf',upsert:true});
    await admin.storage.from('completion-archives').upload(paths.manifest,manifestBytes,{contentType:'application/json',upsert:true});
    const loaders=manifest.map(item=>({name:item.archivePath,load:async()=>{const {data,error}=await admin.storage.from('site-journal-originals').download(item.storagePath);if(error||!data)throw Object.assign(new Error('SOURCE_OBJECT_MISSING'),{code:'SOURCE_OBJECT_MISSING'});const bytes=await bodyBytes(data);if(bytes.length!==item.byteSize)throw new Error('SOURCE_BYTES_MISMATCH');if(await sha256(bytes)!==item.sha256)throw new Error('SOURCE_HASH_MISMATCH');return bytes;}}));
    loaders.unshift({name:'현장일지.pdf',load:async()=>pdf},{name:'manifest.json',load:async()=>manifestBytes});
    const zipHasher=incrementalSha256.create(); let zipBytes=0;
    const monitored=zipStream(loaders).pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){zipHasher.update(chunk);zipBytes+=chunk.length;controller.enqueue(chunk);}}));
    const {error:zipError}=await admin.storage.from('completion-archives').upload(paths.zip,monitored,{contentType:'application/zip',upsert:true,duplex:'half'} as any);if(zipError)throw zipError;
    const zipHash=[...zipHasher.digest()].map(b=>b.toString(16).padStart(2,'0')).join('');
    await admin.from('completion_archives').update({status:'ready',pdf_path:paths.pdf,zip_path:paths.zip,zip_bytes:zipBytes,zip_sha256:zipHash,completed_at:new Date().toISOString(),checkpoint:{stage:'complete'}}).eq('id',archiveId);
    return json({archiveId,status:'ready'});
  } catch(error) {
    const code=domain.safeErrorCode(error);
    if(archiveId) await admin.from('completion_archives').update({status:'failed',error_code:code,error_message:'준공자료 생성에 실패했습니다. 다시 시도해 주세요.',checkpoint:{stage:'failed',retryable:true}}).eq('id',archiveId);
    return json({archiveId,status:'failed',error:code},500);
  }
});
