-- Public website data is deliberately separated from ERP sync_data.

create table if not exists public.website_portfolio (
  id uuid primary key default gen_random_uuid(),
  source_project_id text not null unique,
  slug text not null unique,
  title text not null,
  location text not null default '',
  area_pyeong numeric(6,1),
  style text not null default '',
  summary text not null default '',
  cover_image_url text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint website_portfolio_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,127}$'),
  constraint website_portfolio_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint website_portfolio_location_len check (char_length(location) <= 120),
  constraint website_portfolio_style_len check (char_length(style) <= 120),
  constraint website_portfolio_summary_len check (char_length(summary) <= 2000),
  constraint website_portfolio_cover_len check (char_length(cover_image_url) <= 2048),
  constraint website_portfolio_area_positive check (area_pyeong is null or area_pyeong > 0)
);

create table if not exists public.website_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null default '',
  address text not null default '',
  address_detail text not null default '',
  site_name text not null default '',
  area text not null default '',
  budget text not null default '',
  move_date date,
  message text not null default '',
  privacy_consent boolean not null default false,
  honeypot text not null default '',
  source text not null default 'website',
  erp_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint website_inquiries_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint website_inquiries_phone_len check (char_length(btrim(phone)) between 7 and 30),
  constraint website_inquiries_email_len check (char_length(email) <= 254),
  constraint website_inquiries_address_len check (char_length(address) <= 300),
  constraint website_inquiries_address_detail_len check (char_length(address_detail) <= 200),
  constraint website_inquiries_site_name_len check (char_length(site_name) <= 160),
  constraint website_inquiries_area_len check (char_length(area) <= 40),
  constraint website_inquiries_budget_len check (char_length(budget) <= 80),
  constraint website_inquiries_message_len check (char_length(message) <= 4000),
  constraint website_inquiries_honeypot_empty check (honeypot = ''),
  constraint website_inquiries_source_website check (source = 'website'),
  constraint website_inquiries_privacy_required check (privacy_consent = true)
);

alter table public.website_portfolio enable row level security;
alter table public.website_inquiries enable row level security;

revoke all on table public.website_portfolio from anon, authenticated;
revoke all on table public.website_inquiries from anon, authenticated;

grant select on table public.website_portfolio to anon;
grant select, insert, update, delete on table public.website_portfolio to authenticated;
grant insert on table public.website_inquiries to anon;
grant select, update, delete on table public.website_inquiries to authenticated;

drop policy if exists website_portfolio_public_read on public.website_portfolio;
create policy website_portfolio_public_read
on public.website_portfolio
for select
to anon
using (is_published = true);

drop policy if exists website_portfolio_staff_read on public.website_portfolio;
create policy website_portfolio_staff_read
on public.website_portfolio
for select
to authenticated
using (private.is_active_staff());

drop policy if exists website_portfolio_staff_insert on public.website_portfolio;
create policy website_portfolio_staff_insert
on public.website_portfolio
for insert
to authenticated
with check (private.is_active_staff());

drop policy if exists website_portfolio_staff_update on public.website_portfolio;
create policy website_portfolio_staff_update
on public.website_portfolio
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

drop policy if exists website_portfolio_staff_delete on public.website_portfolio;
create policy website_portfolio_staff_delete
on public.website_portfolio
for delete
to authenticated
using (private.is_active_staff());

drop policy if exists website_inquiries_public_insert on public.website_inquiries;
create policy website_inquiries_public_insert
on public.website_inquiries
for insert
to anon
with check (
  privacy_consent = true
  and honeypot = ''
  and source = 'website'
  and char_length(btrim(name)) between 1 and 80
  and char_length(btrim(phone)) between 7 and 30
);

drop policy if exists website_inquiries_staff_read on public.website_inquiries;
create policy website_inquiries_staff_read
on public.website_inquiries
for select
to authenticated
using (private.is_active_staff());

drop policy if exists website_inquiries_staff_update on public.website_inquiries;
create policy website_inquiries_staff_update
on public.website_inquiries
for update
to authenticated
using (private.is_active_staff())
with check (private.is_active_staff());

drop policy if exists website_inquiries_staff_delete on public.website_inquiries;
create policy website_inquiries_staff_delete
on public.website_inquiries
for delete
to authenticated
using (private.is_active_staff());

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
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('daham_consult_v1'));

  select value
    into v_raw
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
    select 1
      from pg_catalog.jsonb_array_elements(v_records) as item(record)
     where item.record ->> 'websiteInquiryId' = new.id::text
  ) then
    return new;
  end if;

  v_consult_id := 'web_' || pg_catalog.replace(new.id::text, '-', '');
  v_record := pg_catalog.jsonb_build_object(
    'id', v_consult_id,
    'createdAt', new.created_at,
    'updatedAt', new.created_at,
    'consultTitle', '홈페이지 견적 문의',
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
    'memo', case when new.message = '' then '[홈페이지 견적 문의 자동 접수]' else '[홈페이지 문의] ' || new.message end,
    'source', '홈페이지',
    'survey', pg_catalog.jsonb_build_object('visitDate','','measured',false,'polycamDone',false,'polycamUrl','','photoUrls','[]'::jsonb,'note',''),
    'status', 'inquiry',
    'projId', null,
    'history', pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('type','note','text','홈페이지 견적 문의 자동 접수','at',new.created_at)),
    'scheduleReservations', '[]'::jsonb,
    'websiteInquiryId', new.id::text
  );

  v_records := v_records || pg_catalog.jsonb_build_array(v_record);

  insert into public.sync_data(key, value, updated_at)
  values ('daham_consult_v1', v_records::text, pg_catalog.now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function private.import_website_inquiry_to_consult() from public, anon, authenticated;

drop trigger if exists website_inquiry_to_consult on public.website_inquiries;
create trigger website_inquiry_to_consult
after insert on public.website_inquiries
for each row execute function private.import_website_inquiry_to_consult();
