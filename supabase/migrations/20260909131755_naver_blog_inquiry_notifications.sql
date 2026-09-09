alter table public.website_inquiries
  add column if not exists source_channel text not null default 'website';

alter table public.website_inquiries
  drop constraint if exists website_inquiries_source_channel_allowed;
alter table public.website_inquiries
  add constraint website_inquiries_source_channel_allowed
  check (source_channel in ('website','naver_blog'));

revoke all on table public.website_inquiries from anon, authenticated;
grant insert on table public.website_inquiries to anon;
grant select, update, delete on table public.website_inquiries to authenticated;

create or replace function private.import_website_inquiry_to_consult()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw text;
  v_records jsonb := '[]'::jsonb;
  v_record jsonb;
  v_consult_id text;
  v_company_id uuid;
  v_actor_id uuid;
  v_event_id uuid;
  v_dedupe_key text;
  v_consult_title text;
  v_source_label text;
  v_notification_body text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('daham_consult_v1'));

  select value into v_raw
    from public.sync_data
   where key = 'daham_consult_v1'
   for update;

  if found then
    begin
      v_records := v_raw::jsonb;
    exception when others then
      raise exception '상담 데이터 형식이 올바르지 않아 홈페이지 문의를 접수할 수 없습니다.' using errcode = '22023';
    end;
  end if;

  if pg_catalog.jsonb_typeof(v_records) <> 'array' then
    raise exception '상담 데이터 형식이 올바르지 않아 홈페이지 문의를 접수할 수 없습니다.' using errcode = '22023';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_array_elements(v_records) as item(record)
     where item.record ->> 'websiteInquiryId' = new.id::text
  ) then return new; end if;

  v_consult_id := 'web_' || pg_catalog.replace(new.id::text, '-', '');
  v_consult_title := case when new.source_channel = 'naver_blog' then '네이버 블로그 견적 문의' else '홈페이지 견적 문의' end;
  v_source_label := case when new.source_channel = 'naver_blog' then '네이버 블로그' else '홈페이지' end;
  v_record := pg_catalog.jsonb_build_object(
    'id', v_consult_id,
    'createdAt', new.created_at,
    'updatedAt', new.created_at,
    'consultTitle', v_consult_title,
    'consultContent', new.message,
    'name', new.name,
    'tel', new.phone,
    'email', new.email,
    'altTel', '',
    'postcode', '',
    'addr', new.address,
    'addrDetail', new.address_detail,
    'siteName', new.site_name,
    'unit', '',
    'area', new.area,
    'buildYear', '',
    'housingType', '',
    'manager', '',
    'schedDate', '',
    'schedTime', '',
    'schedPlace', '',
    'works', '',
    'scopes', '[]'::jsonb,
    'scopeDetails', '{}'::jsonb,
    'budget', new.budget,
    'moveDate', coalesce(new.move_date::text, ''),
    'memo', case when new.message = '' then '[' || v_consult_title || ' 자동 접수]' else '[' || v_source_label || ' 문의] ' || new.message end,
    'source', v_source_label,
    'survey', pg_catalog.jsonb_build_object('visitDate','','measured',false,'polycamDone',false,'polycamUrl','','photoUrls','[]'::jsonb,'note',''),
    'status', 'inquiry',
    'projId', null,
    'history', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('type','milestone','status','inquiry','at',new.created_at,'memo',''),
      pg_catalog.jsonb_build_object('type','note','text',v_consult_title || ' 자동 접수','at',new.created_at)
    ),
    'scheduleReservations', '[]'::jsonb,
    'websiteInquiryId', new.id::text
  );

  v_records := v_records || pg_catalog.jsonb_build_array(v_record);
  insert into public.sync_data(key, value, updated_at)
  values ('daham_consult_v1', v_records::text, pg_catalog.now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

  if new.source_channel = 'naver_blog' then
    select m.company_id, m.profile_id into v_company_id, v_actor_id
      from public.company_memberships m
      join public.profiles p on p.id = m.profile_id
     where m.status = 'active' and p.is_active = true
     order by case when p.role = 'owner' then 0 else 1 end, m.created_at
     limit 1;

    if v_company_id is not null and v_actor_id is not null then
      v_dedupe_key := 'website-inquiry:' || new.id::text;
      v_notification_body := new.name || ' / ' || coalesce(nullif(new.site_name,''), nullif(pg_catalog.split_part(new.address,' ',2),''), '현장 정보 미입력');
      insert into public.activity_events(company_id, actor_id, project_id, entity_type, entity_id, action, title, summary, changed_fields, target_url, dedupe_key)
      values (v_company_id, v_actor_id, null, 'consultation', v_consult_id, 'create', '신규 상담 · 네이버 블로그', '네이버 블로그 견적 문의가 접수되었습니다.', '{}'::jsonb, 'consult.html?consult=' || v_consult_id, v_dedupe_key)
      returning id into v_event_id;

      insert into public.notification_outbox(company_id, event_id, kind, title, body, target_url, dedupe_key)
      values (v_company_id, v_event_id, 'activity', '신규 상담 · 네이버 블로그', v_notification_body, 'consult.html?consult=' || v_consult_id, v_dedupe_key)
      on conflict (dedupe_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.import_website_inquiry_to_consult() from public, anon, authenticated;
