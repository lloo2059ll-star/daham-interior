const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const D=require('../supabase/functions/schedule-reminders/domain.js');
const worker=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'../supabase/functions/schedule-reminders/index.ts'),'utf8').replace(/^import .*;\r?\n/gm,''));
function harness(jobs=[]){
  const state={reads:0,writes:0,pushes:0,deliveries:0,jobs:new Map(jobs.map(r=>[r.dedupe_key,{...r}]))};
  const sites=[{id:'site-1',info:{addr:'한빛타운',status:'시공중'},tasks:[{id:'tile-1',name:'타일',start:'2026-10-20',status:'planned'}]}];
  class Query{
    constructor(table){this.table=table;this.filters=[];this.op='select';}
    select(){return this;}
    eq(key,value){this.filters.push(r=>r[key]===value);return this;}
    in(key,values){this.filters.push(r=>values.includes(r[key]));return this;}
    update(value){this.op='update';this.value=value;return this;}
    upsert(rows,options){assert.equal(options.onConflict,'dedupe_key');assert.equal(options.ignoreDuplicates,true);this.op='upsert';this.value=rows;return this;}
    then(resolve,reject){return Promise.resolve().then(()=>{
      if(this.table==='sync_data'){state.reads++;return {data:[{key:'daham_schedule_v1',value:JSON.stringify(sites)},{key:'daham_schedule_general_v1',value:'[]'}],error:null};}
      assert.equal(this.table,'notification_outbox');
      if(this.op==='select')return {data:[...state.jobs.values()].filter(r=>this.filters.every(f=>f(r))),error:null};
      state.writes++;
      if(this.op==='update'){
        for(const r of state.jobs.values())if(this.filters.every(f=>f(r)))Object.assign(r,this.value);
        return {data:null,error:null};
      }
      const inserted=[];for(const row of this.value)if(!state.jobs.has(row.dedupe_key)){const r={...row,id:'job-'+state.jobs.size};state.jobs.set(row.dedupe_key,r);inserted.push({id:r.id});}
      return {data:inserted,error:null};
    }).then(resolve,reject);}
  }
  const client={rpc:async(name,{p_token})=>{assert.equal(name,'verify_push_cron_secret');return {data:p_token==='valid',error:null};},from:name=>new Query(name)};
  let handler;
  class Clock extends Date{constructor(value){super(value===undefined?'2026-10-13T00:00:00Z':value);}}
  const context={DAHAM_SCHEDULE_REMINDERS:D,Date:Clock,Response,Map,Number,console,Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://example.invalid':'test-only'},serve:fn=>{handler=fn;}},createClient:()=>client,
    fetch:async(url,opts)=>{assert.equal(url,'https://example.invalid/functions/v1/send-push');assert.equal(opts.headers['x-cron-secret'],'valid');state.pushes++;for(const r of state.jobs.values())if(r.status==='pending'){r.status='sent';state.deliveries++;}return new Response(JSON.stringify({processed:state.deliveries}),{status:200});}};
  vm.createContext(context);vm.runInContext(worker,context);
  return {state,sites,call:async(body={},secret='valid')=>{const response=await handler(new Request('https://example.invalid/schedule-reminders',{method:'POST',headers:{'x-cron-secret':secret},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}};
}
test('protected live-worker dry run uses existing schedules without queue or push side effects',async()=>{
  const h=harness(),r=await h.call({dryRun:true});assert.equal(r.status,200);assert.equal(r.body.materialCandidates,1);assert.equal(r.body.upcoming[0].reminderDate,'2026-10-13');
  assert.equal(h.state.writes,0);assert.equal(h.state.pushes,0);
});
test('cron authentication rejects unauthorized calls before reading schedules or sending',async()=>{
  const h=harness(),r=await h.call({},'wrong');assert.equal(r.status,401);assert.equal(h.state.reads,0);assert.equal(h.state.pushes,0);assert.equal(h.state.writes,0);
});
test('repeated cron calls queue and deliver a material reminder once',async()=>{
  const h=harness(),a=await h.call(),b=await h.call();assert.equal(a.status,200);assert.equal(a.body.queued,1);assert.equal(b.body.queued,0);assert.equal(h.state.jobs.size,1);assert.equal(h.state.deliveries,1);
});
test('worker cancels stale queued material work but never deletes or rewrites a sent reminder',async()=>{
  const old={id:'old',dedupe_key:'material-order:site-1:tile-1:2026-10-19',kind:'material_order_week',status:'pending'};
  const sent={...old,id:'sent',dedupe_key:'material-order:site-1:tile-1:2026-10-18',status:'sent'};
  const h=harness([old,sent]);const r=await h.call();assert.equal(r.body.cancelled,1);
  assert.equal(h.state.jobs.get(old.dedupe_key).status,'cancelled');assert.equal(h.state.jobs.get(sent.dedupe_key).status,'sent');assert.equal(h.state.jobs.size,3);
});
test('returning to a previously cancelled date revives only its unsent alert',async()=>{
  const key='material-order:site-1:tile-1:2026-10-20';
  const h=harness([{id:'old',dedupe_key:key,kind:'material_order_week',status:'cancelled'}]);await h.call();
  assert.equal(h.state.jobs.size,1);assert.equal(h.state.jobs.get(key).status,'sent');assert.equal(h.state.deliveries,1);
});
test('deleted construction tasks produce no alerts and cancel the existing unsent one',async()=>{
  const key='material-order:site-1:tile-1:2026-10-20',h=harness([{id:'old',dedupe_key:key,kind:'material_order_week',status:'pending'}]);
  h.sites[0].tasks=[];const r=await h.call();assert.equal(r.body.materialSchedules,0);assert.equal(r.body.cancelled,1);assert.equal(h.state.deliveries,0);
});
