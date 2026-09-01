(function(){
  'use strict';
  if(window.DAHAM_AUTH) return;

  const SUPABASE_URL='https://famqvwnsustbxuizohni.supabase.co';
  const SUPABASE_KEY='sb_publishable_Rm1rOYizfT6ichTlh2la9w_G4O7fTNf';
  const SESSION_KEY='daham_supabase_session_v1';
  const PROFILE_KEY='daham_supabase_profile_v1';
  const page=location.pathname.split('/').pop()||'index.html';
  const publicPages=['login.html','signup.html'];

  if(!publicPages.includes(page)&&window.document){
    const style=document.createElement('style');
    style.id='daham-auth-cloak';
    style.textContent='html{visibility:hidden}';
    (document.head||document.documentElement).appendChild(style);
  }

  const readJSON=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}};
  const writeJSON=(key,val)=>localStorage.setItem(key,JSON.stringify(val));
  const clearAuth=()=>{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(PROFILE_KEY)};

  async function request(path,{method='GET',body=null,token=null,headers:extraHeaders={}}={}){
    const headers={'apikey':SUPABASE_KEY,'Content-Type':'application/json',...extraHeaders};
    if(token) headers.Authorization='Bearer '+token;
    const res=await fetch(SUPABASE_URL+path,{method,headers,body:body==null?undefined:JSON.stringify(body)});
    let data=null;
    try{data=await res.json()}catch(e){}
    if(!res.ok){
      const message=data?.msg||data?.message||data?.error_description||data?.error||'서버 요청에 실패했습니다.';
      const err=new Error(message); err.status=res.status; err.data=data; throw err;
    }
    return data;
  }

  function saveSession(data){
    if(!data?.access_token) return null;
    const expiresAt=Math.floor(Date.now()/1000)+(Number(data.expires_in)||3600);
    const session={
      access_token:data.access_token,
      refresh_token:data.refresh_token,
      expires_at:expiresAt,
      user:data.user||null
    };
    writeJSON(SESSION_KEY,session);
    return session;
  }

  async function loadProfile(session){
    if(!session?.access_token||!session?.user?.id) return null;
    const rows=await request('/rest/v1/profiles?id=eq.'+encodeURIComponent(session.user.id)+'&select=id,email,username,display_name,role,is_active&limit=1',{token:session.access_token});
    const p=rows?.[0]||null;
    if(p){writeJSON(PROFILE_KEY,p);return p}
    return null;
  }

  async function refreshSession(){
    let session=readJSON(SESSION_KEY);
    if(!session?.refresh_token) return null;
    try{
      const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
      session=saveSession(data);
      await loadProfile(session);
      return session;
    }catch(e){clearAuth();return null}
  }

  async function ensureSession(){
    let session=readJSON(SESSION_KEY);
    if(!session?.access_token) return null;
    const now=Math.floor(Date.now()/1000);
    if(!session.expires_at||session.expires_at-now<120) session=await refreshSession();
    if(!session) return null;
    try{await loadProfile(session)}catch(e){clearAuth();return null}
    const profile=readJSON(PROFILE_KEY);
    if(!profile||profile.is_active!==true){clearAuth();return null}
    return session;
  }

  const ready=(async()=>{
    if(publicPages.includes(page)) return true;
    const session=await ensureSession();
    if(!session){location.replace('login.html');return false}
    const cloak=window.document?.getElementById('daham-auth-cloak');
    if(cloak) cloak.remove();
    return true;
  })();

  function loadPushClient(){
    if(publicPages.includes(page)||!window.document)return;
    if(!document.querySelector("link[rel='manifest']")){
      const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='manifest.json';document.head.appendChild(manifest);
    }
    if(document.getElementById('daham-push-client'))return;
    const script=document.createElement('script');script.id='daham-push-client';script.src='daham-push.js?v=20260902-1';
    script.onload=()=>window.DAHAM_PUSH&&window.DAHAM_PUSH.init();document.head.appendChild(script);
  }

  ready.then(ok=>{if(ok)loadPushClient()});

  function requireOwner(){
    const profile=readJSON(PROFILE_KEY);
    if(profile?.role!=='owner'||profile?.is_active!==true) throw new Error('직원 관리는 대표만 사용할 수 있습니다.');
    return readJSON(SESSION_KEY);
  }

  window.DAHAM_AUTH={
    ready,
    async hasAccount(){
      try{return !!(await request('/rest/v1/rpc/has_any_account',{method:'POST',body:{}}))}catch(e){return true}
    },
    isAuthenticated(){return !!readJSON(SESSION_KEY)?.access_token},
    getAccessToken(){return readJSON(SESSION_KEY)?.access_token||''},
    getSupabaseConfig(){return {url:SUPABASE_URL,key:SUPABASE_KEY}},
    getAuthHeaders(){
      const token=this.getAccessToken();
      return {'apikey':SUPABASE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'};
    },
    currentUser(){
      const p=readJSON(PROFILE_KEY), s=readJSON(SESSION_KEY);
      if(!p&&!s?.user) return null;
      return {
        id:p?.id||s?.user?.id,
        username:p?.username||p?.email||s?.user?.email||'',
        email:p?.email||s?.user?.email||'',
        name:p?.display_name||s?.user?.user_metadata?.display_name||s?.user?.email||'사용자',
        role:p?.role||'staff',
        isActive:p?.is_active!==false
      };
    },
    async createAccount({email,password,name}){
      email=(email||'').trim().toLowerCase(); name=(name||'').trim();
      if(!email||!/^\S+@\S+\.\S+$/.test(email)) throw new Error('사용할 이메일을 정확히 입력하세요.');
      if(!password||password.length<8) throw new Error('비밀번호는 8자 이상 입력하세요.');
      if(!name) throw new Error('사용자 이름을 입력하세요.');
      const redirectTo=new URL('login.html',location.href).href;
      const data=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',body:{email,password,data:{display_name:name,username:email}}});
      if(data?.access_token){
        const session=saveSession(data);
        try{await loadProfile(session)}catch(e){}
        try{await request('/auth/v1/logout',{method:'POST',token:session.access_token})}catch(e){}
        clearAuth();
      }
      return {
        user:data?.user||null,
        needsConfirmation:!data?.access_token,
        approvalPending:true,
        message:'가입이 완료되었습니다. 관리자 승인 대기 중입니다.'+(!data?.access_token?' 이메일 인증도 완료해 주세요.':'')
      };
    },
    async login(identifier,password){
      const email=(identifier||'').trim().toLowerCase();
      if(!email||!password) throw new Error('아이디와 비밀번호를 입력하세요.');
      try{
        const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
        const session=saveSession(data);
        const profile=await loadProfile(session);
        if(!profile){clearAuth();throw new Error('프로필을 찾을 수 없습니다. 관리자에게 문의하세요.')}
        if(profile.is_active!==true){clearAuth();throw new Error('관리자 승인 대기 중입니다.')}
        return this.currentUser();
      }catch(e){
        clearAuth();
        if(e.message?.includes('Email not confirmed')) throw new Error('이메일 인증을 완료한 뒤 로그인하세요.');
        if(e.message==='관리자 승인 대기 중입니다.'||e.message?.startsWith('프로필을 찾을 수 없습니다.')) throw e;
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    },
    async listEmployees(){
      const session=requireOwner();
      return request('/rest/v1/profiles?select=id,email,username,display_name,role,is_active&order=display_name.asc',{token:session.access_token});
    },
    async updateEmployee(id,changes){
      const session=requireOwner();
      const current=readJSON(PROFILE_KEY);
      if(!id||id===current?.id) throw new Error('대표 계정은 변경할 수 없습니다.');
      const safe={};
      if(Object.prototype.hasOwnProperty.call(changes||{},'is_active')) safe.is_active=changes.is_active===true;
      if(Object.prototype.hasOwnProperty.call(changes||{},'role')){
        if(!['staff','admin'].includes(changes.role)) throw new Error('변경할 수 없는 권한입니다.');
        safe.role=changes.role;
      }
      if(!Object.keys(safe).length) throw new Error('변경할 항목이 없습니다.');
      const rows=await request('/rest/v1/profiles?id=eq.'+encodeURIComponent(id)+'&select=id,email,username,display_name,role,is_active',{
        method:'PATCH',body:safe,token:session.access_token,headers:{Prefer:'return=representation'}
      });
      return rows?.[0]||null;
    },
    async logout(){
      const session=readJSON(SESSION_KEY);
      try{if(session?.access_token) await request('/auth/v1/logout',{method:'POST',token:session.access_token})}catch(e){}
      clearAuth(); location.href='login.html';
    }
  };
})();
