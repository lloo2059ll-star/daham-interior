create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','active','revoked')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);

create table if not exists public.project_assignments (
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (company_id, project_id, profile_id)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  project_id text,
  entity_type text not null,
  entity_id text not null,
  action text not null check (action in ('create','update','delete','test')),
  title text not null,
  summary text not null default '',
  changed_fields jsonb not null default '{}'::jsonb,
  target_url text not null default 'index.html',
  dedupe_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text not null default '',
  user_agent text not null default '',
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_id uuid references public.activity_events(id) on delete cascade,
  kind text not null check (kind in ('activity','schedule_one_hour','all_day_morning','test')),
  title text not null,
  body text not null,
  target_url text not null default 'index.html',
  dedupe_key text not null unique,
  send_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','sending','sent','partial','failed')),
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists private.push_config (
  singleton boolean primary key default true check (singleton),
  public_key text not null,
  updated_at timestamptz not null default now()
);

create index if not exists company_memberships_profile_status_idx on public.company_memberships(profile_id,status);
create index if not exists project_assignments_profile_idx on public.project_assignments(profile_id,project_id);
create index if not exists activity_events_company_created_idx on public.activity_events(company_id,created_at desc);
create index if not exists push_subscriptions_company_active_idx on public.push_subscriptions(company_id,is_active);
create index if not exists notification_outbox_pending_idx on public.notification_outbox(status,send_after);

insert into public.companies(id,name)
values ('00000000-0000-4000-8000-000000000001','다함인테리어')
on conflict (id) do update set name=excluded.name;

insert into public.company_memberships(company_id,profile_id,status,approved_by,approved_at)
select '00000000-0000-4000-8000-000000000001',p.id,
       case when p.is_active then 'active' else 'pending' end,
       case when p.role='owner' then p.id else null end,
       case when p.is_active then now() else null end
from public.profiles p
on conflict (company_id,profile_id) do update
set status=excluded.status,
    approved_at=case when excluded.status='active' then coalesce(public.company_memberships.approved_at,now()) else public.company_memberships.approved_at end;

alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.project_assignments enable row level security;
alter table public.activity_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_outbox enable row level security;

grant select on table public.companies to authenticated;
grant select on table public.company_memberships to authenticated;
grant select on table public.project_assignments to authenticated;
grant select on table public.activity_events to authenticated;
grant select on table public.push_subscriptions to authenticated;
revoke all on table public.notification_outbox from anon,authenticated;

create or replace function private.is_active_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1 from public.company_memberships m
    join public.profiles p on p.id=m.profile_id
    where m.company_id=p_company_id and m.profile_id=(select auth.uid()) and m.status='active' and p.is_active=true
  );
$$;
grant usage on schema private to authenticated;
revoke execute on function private.is_active_company_member(uuid) from public,anon;
grant execute on function private.is_active_company_member(uuid) to authenticated;

create policy company_active_members_read on public.companies for select to authenticated
using (private.is_active_company_member(companies.id));

create policy memberships_company_read on public.company_memberships for select to authenticated
using (private.is_active_company_member(company_memberships.company_id));

create policy assignments_company_read on public.project_assignments for select to authenticated
using (private.is_active_company_member(project_assignments.company_id));

create policy events_company_read on public.activity_events for select to authenticated
using (private.is_active_company_member(activity_events.company_id));

create policy subscriptions_own_read on public.push_subscriptions for select to authenticated
using (
  profile_id=(select auth.uid()) and private.is_active_company_member(push_subscriptions.company_id)
);

create or replace function private.active_company_id(p_profile_id uuid)
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select m.company_id from public.company_memberships m
  where m.profile_id=p_profile_id and m.status='active'
  order by m.created_at limit 1;
$$;
revoke execute on function private.active_company_id(uuid) from public,anon,authenticated;

create or replace function private.can_delete_project(p_company_id uuid,p_project_id text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1 from public.profiles p
    join public.company_memberships m on m.profile_id=p.id and m.company_id=p_company_id and m.status='active'
    where p.id=(select auth.uid()) and p.is_active=true and p.role='owner'
  ) or exists (
    select 1 from public.project_assignments a
    join public.company_memberships m on m.profile_id=a.profile_id and m.company_id=a.company_id and m.status='active'
    where a.company_id=p_company_id and a.project_id=p_project_id and a.profile_id=(select auth.uid())
  );
$$;
revoke execute on function private.can_delete_project(uuid,text) from public,anon,authenticated;

create or replace function public.publish_activity(
  p_project_id text,
  p_entity_type text,
  p_entity_id text,
  p_action text,
  p_title text,
  p_summary text default '',
  p_changed_fields jsonb default '{}'::jsonb,
  p_target_url text default 'index.html',
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_company_id uuid;
  v_event_id uuid;
  v_actor_name text;
  v_dedupe text;
  v_label text;
begin
  v_company_id:=private.active_company_id((select auth.uid()));
  if v_company_id is null then raise exception '승인된 직원만 알림을 등록할 수 있습니다.' using errcode='42501'; end if;
  if p_action not in ('create','update','delete','test') then raise exception '지원하지 않는 작업입니다.' using errcode='22023'; end if;
  if coalesce(p_entity_type,'')='' or coalesce(p_entity_id,'')='' or coalesce(p_title,'')='' then raise exception '알림 필수값이 없습니다.' using errcode='22023'; end if;
  if p_target_url ~* '^[a-z][a-z0-9+.-]*:' or p_target_url like '//%' then raise exception '외부 주소는 알림 대상으로 사용할 수 없습니다.' using errcode='22023'; end if;
  select coalesce(nullif(p.display_name,''),nullif(p.username,''),p.email,'직원') into v_actor_name from public.profiles p where p.id=(select auth.uid());
  v_dedupe:=coalesce(nullif(p_dedupe_key,''),'activity:'||p_entity_type||':'||p_entity_id||':'||p_action||':'||(extract(epoch from now())::bigint/300));
  insert into public.activity_events(company_id,actor_id,project_id,entity_type,entity_id,action,title,summary,changed_fields,target_url,dedupe_key)
  values(v_company_id,(select auth.uid()),nullif(p_project_id,''),p_entity_type,p_entity_id,p_action,p_title,coalesce(p_summary,''),coalesce(p_changed_fields,'{}'::jsonb),p_target_url,v_dedupe)
  returning id into v_event_id;
  v_label:=case p_action when 'create' then '등록' when 'update' then '수정' when 'delete' then '삭제' else '테스트' end;
  insert into public.notification_outbox(company_id,event_id,kind,title,body,target_url,dedupe_key)
  values(v_company_id,v_event_id,case when p_action='test' then 'test' else 'activity' end,'['||v_label||'] '||p_title,'다함 ERP에서 확인하세요. · 변경자: '||v_actor_name,p_target_url,v_dedupe)
  on conflict (dedupe_key) do update set event_id=excluded.event_id,title=excluded.title,body=excluded.body,target_url=excluded.target_url,status='pending',send_after=now(),last_error=null;
  return v_event_id;
end;
$$;
revoke execute on function public.publish_activity(text,text,text,text,text,text,jsonb,text,text) from public,anon;
grant execute on function public.publish_activity(text,text,text,text,text,text,jsonb,text,text) to authenticated;

create or replace function public.register_push_subscription(
  p_endpoint text,p_p256dh text,p_auth text,p_device_label text default '',p_user_agent text default ''
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_company_id uuid;v_id uuid;
begin
  v_company_id:=private.active_company_id((select auth.uid()));
  if v_company_id is null then raise exception '승인된 직원만 알림을 설정할 수 있습니다.' using errcode='42501'; end if;
  if coalesce(p_endpoint,'')='' or coalesce(p_p256dh,'')='' or coalesce(p_auth,'')='' then raise exception '알림 구독 정보가 올바르지 않습니다.' using errcode='22023'; end if;
  insert into public.push_subscriptions(company_id,profile_id,endpoint,p256dh,auth,device_label,user_agent,is_active,last_seen_at)
  values(v_company_id,(select auth.uid()),p_endpoint,p_p256dh,p_auth,left(coalesce(p_device_label,''),100),left(coalesce(p_user_agent,''),500),true,now())
  on conflict (endpoint) do update set company_id=excluded.company_id,profile_id=(select auth.uid()),p256dh=excluded.p256dh,auth=excluded.auth,device_label=excluded.device_label,user_agent=excluded.user_agent,is_active=true,last_seen_at=now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.register_push_subscription(text,text,text,text,text) from public,anon;
grant execute on function public.register_push_subscription(text,text,text,text,text) to authenticated;

create or replace function public.disable_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.push_subscriptions set is_active=false,last_seen_at=now()
  where endpoint=p_endpoint and profile_id=(select auth.uid());
  return found;
end;
$$;
revoke execute on function public.disable_push_subscription(text) from public,anon;
grant execute on function public.disable_push_subscription(text) to authenticated;

create or replace function public.get_push_public_key()
returns text
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_key text;
begin
  if private.active_company_id((select auth.uid())) is null then raise exception '승인된 직원만 알림을 설정할 수 있습니다.' using errcode='42501'; end if;
  select public_key into v_key from private.push_config where singleton=true;
  if coalesce(v_key,'')='' then raise exception '푸시 공개키가 설정되지 않았습니다.' using errcode='55000'; end if;
  return v_key;
end;
$$;
revoke execute on function public.get_push_public_key() from public,anon;
grant execute on function public.get_push_public_key() to authenticated;

create or replace function public.enqueue_test_notification()
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_company_id uuid;v_role text;v_event uuid;
begin
  v_company_id:=private.active_company_id((select auth.uid()));
  select role into v_role from public.profiles where id=(select auth.uid()) and is_active=true;
  if v_company_id is null or v_role<>'owner' then raise exception '대표만 테스트 알림을 보낼 수 있습니다.' using errcode='42501'; end if;
  v_event:=public.publish_activity(null,'other','push-test-'||gen_random_uuid()::text,'test','푸시 알림 테스트','테스트 알림','{}'::jsonb,'index.html','test:'||gen_random_uuid()::text);
  return v_event;
end;
$$;
revoke execute on function public.enqueue_test_notification() from public,anon;
grant execute on function public.enqueue_test_notification() to authenticated;
