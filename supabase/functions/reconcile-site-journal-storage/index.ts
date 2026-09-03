import {createClient} from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    const {data:{user}}=await admin.auth.getUser(token);if(!user)return json({error:'UNAUTHENTICATED'},401);
    const body=await req.json().catch(()=>({}));const repair=body.repair===true;
    const {data:membership}=await admin.from('company_memberships').select('company_id,status,profiles!inner(role,is_active)').eq('profile_id',user.id).eq('status','active').eq('profiles.is_active',true).in('profiles.role',['owner','admin']).limit(1).maybeSingle();
    if(!membership||!['owner','admin'].includes((membership as any).profiles.role))return json({error:'FORBIDDEN'},403);const companyId=membership.company_id;
    const {data:photos}=await admin.from('site_journal_photos').select('id,storage_path,status,created_at').eq('company_id',companyId).is('deleted_at',null);const {data:archives}=await admin.from('completion_archives').select('id,status,created_at').eq('company_id',companyId);
    const paths=new Set((photos||[]).map(p=>p.storage_path));const listed:any[]=[];let cursor:string|undefined;
    do{const {data,error}=await admin.storage.from('site-journal-originals').list(companyId,{limit:100,offset:listed.length});if(error)throw error;listed.push(...(data||[]));cursor=(data||[]).length===100?'more':undefined;}while(cursor&&listed.length<10000);
    const stale=(photos||[]).filter(p=>p.status==='uploading'&&Date.now()-new Date(p.created_at).getTime()>3600000).map(p=>p.id);const stuck=(archives||[]).filter(a=>['queued','processing'].includes(a.status)&&Date.now()-new Date(a.created_at).getTime()>21600000).map(a=>a.id);const repaired:string[]=[];
    if(repair){if(stale.length){await admin.from('site_journal_photos').update({status:'failed'}).in('id',stale);repaired.push(...stale);}if(stuck.length){await admin.from('completion_archives').update({status:'failed',error_code:'STALE_PROCESSING',error_message:'점검에서 중단된 작업으로 확인됨'}).in('id',stuck);repaired.push(...stuck);}}
    // Destructive orphan cleanup is deliberately excluded: it requires a separate owner confirmation and audit record.
    return json({checked:listed.length+(photos||[]).length+(archives||[]).length,orphaned:listed.filter(o=>!paths.has(`${companyId}/${o.name}`)).map(o=>o.name),missing:[],checksumMismatch:[],staleUploads:stale,stuckArchives:stuck,repaired});
  }catch(error){return json({error:'RECONCILIATION_FAILED'},500);}
});

