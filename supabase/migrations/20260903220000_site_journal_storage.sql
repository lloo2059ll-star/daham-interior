create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.site_journals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  project_id text not null,
  work_date date not null,
  trade text,
  content text not null default '',
  visit_type text not null check (visit_type in ('visit', 'remote', 'none')),
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1 check (version > 0),
  deleted_at timestamptz,
  unique (id, company_id)
);

create table if not exists public.site_journal_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  journal_id uuid not null references public.site_journals(id),
  storage_path text not null unique,
  thumbnail_path text,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-fA-F]{64}$'),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  status text not null check (status in ('uploading', 'ready', 'failed', 'missing')),
  sort_order integer not null check (sort_order >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (journal_id, company_id) references public.site_journals(id, company_id)
);

create table if not exists public.completion_archives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  project_id text not null,
  status text not null check (status in ('queued', 'processing', 'ready', 'failed')),
  snapshot_at timestamptz not null,
  journal_count integer not null check (journal_count >= 0),
  photo_count integer not null check (photo_count >= 0),
  source_bytes bigint not null check (source_bytes >= 0),
  pdf_path text,
  zip_path text,
  zip_bytes bigint check (zip_bytes is null or zip_bytes > 0),
  zip_sha256 text check (zip_sha256 is null or zip_sha256 ~ '^[0-9a-fA-F]{64}$'),
  error_code text,
  error_message text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists site_journals_company_project_date_idx
  on public.site_journals(company_id, project_id, work_date desc);
create index if not exists site_journals_active_company_project_date_idx
  on public.site_journals(company_id, project_id, work_date desc)
  where deleted_at is null;
create index if not exists site_journal_photos_journal_sort_idx
  on public.site_journal_photos(journal_id, sort_order);
create index if not exists site_journal_photos_company_status_idx
  on public.site_journal_photos(company_id, status)
  where deleted_at is null;
create index if not exists site_journal_photos_active_journal_sort_idx
  on public.site_journal_photos(journal_id, sort_order)
  where deleted_at is null;
create unique index if not exists completion_archives_one_active_request_idx
  on public.completion_archives(company_id, project_id)
  where status in ('queued', 'processing');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-journal-originals', 'site-journal-originals', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('site-journal-thumbnails', 'site-journal-thumbnails', false, null, array['image/jpeg', 'image/png', 'image/webp']),
  ('completion-archives', 'completion-archives', false, null, array['application/pdf', 'application/zip', 'application/json'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.site_journals enable row level security;
alter table public.site_journal_photos enable row level security;
alter table public.completion_archives enable row level security;

grant select, insert, update, delete on table public.site_journals to authenticated;
grant select, insert, update, delete on table public.site_journal_photos to authenticated;
grant select, insert, update, delete on table public.completion_archives to authenticated;

create or replace function private.is_active_company_owner_or_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.company_memberships m
      join public.profiles p on p.id = m.profile_id
     where m.company_id = p_company_id
       and m.profile_id = (select auth.uid())
       and m.status = 'active'
       and p.is_active = true
       and p.role in ('owner', 'admin')
  );
$$;

grant usage on schema private to authenticated;
revoke execute on function private.is_active_company_owner_or_admin(uuid) from public, anon;
grant execute on function private.is_active_company_owner_or_admin(uuid) to authenticated;

create or replace function private.can_delete_verified_original(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.completion_archives a
      join public.company_memberships m
        on m.company_id = a.company_id
       and m.profile_id = (select auth.uid())
       and m.status = 'active'
      join public.profiles p
        on p.id = m.profile_id
       and p.is_active = true
       and p.role in ('owner', 'admin')
     where a.company_id::text = split_part(p_path, '/', 1)
       and a.project_id = split_part(p_path, '/', 2)
       and a.status = 'ready'
       and a.completed_at is not null
       and a.zip_path is not null
       and a.zip_bytes is not null
       and a.zip_bytes > 0
       and a.zip_sha256 is not null
  );
$$;

revoke execute on function private.can_delete_verified_original(text) from public, anon;
grant execute on function private.can_delete_verified_original(text) to authenticated;

create or replace function private.prevent_site_journal_audit_reassignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'site_journals'
     and new.author_id is distinct from old.author_id then
    raise exception 'site journal author is immutable' using errcode = '42501';
  end if;
  if tg_table_name = 'site_journal_photos'
     and new.created_by is distinct from old.created_by then
    raise exception 'site journal photo creator is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function private.prevent_site_journal_audit_reassignment() from public, anon, authenticated;

drop trigger if exists site_journals_author_immutable on public.site_journals;
create trigger site_journals_author_immutable
before update of author_id on public.site_journals
for each row execute function private.prevent_site_journal_audit_reassignment();

drop trigger if exists site_journal_photos_created_by_immutable on public.site_journal_photos;
create trigger site_journal_photos_created_by_immutable
before update of created_by on public.site_journal_photos
for each row execute function private.prevent_site_journal_audit_reassignment();

create policy site_journals_company_read on public.site_journals
for select to authenticated
using (private.is_active_company_member(company_id));

create policy site_journals_company_insert on public.site_journals
for insert to authenticated
with check (private.is_active_company_member(company_id) and author_id = (select auth.uid()));

create policy site_journals_company_update on public.site_journals
for update to authenticated
using (private.is_active_company_member(company_id))
with check (private.is_active_company_member(company_id));

create policy site_journals_company_delete on public.site_journals
for delete to authenticated
using (private.is_active_company_member(company_id));

create policy site_journal_photos_company_read on public.site_journal_photos
for select to authenticated
using (private.is_active_company_member(company_id));

create policy site_journal_photos_company_insert on public.site_journal_photos
for insert to authenticated
with check (private.is_active_company_member(company_id) and created_by = (select auth.uid()));

create policy site_journal_photos_company_update on public.site_journal_photos
for update to authenticated
using (private.is_active_company_member(company_id))
with check (private.is_active_company_member(company_id));

create policy site_journal_photos_company_delete on public.site_journal_photos
for delete to authenticated
using (private.is_active_company_member(company_id));

create policy completion_archives_company_read on public.completion_archives
for select to authenticated
using (private.is_active_company_member(company_id));

create policy completion_archives_owner_admin_insert on public.completion_archives
for insert to authenticated
with check (
  private.is_active_company_owner_or_admin(company_id)
  and created_by = (select auth.uid())
);

create policy completion_archives_owner_admin_update on public.completion_archives
for update to authenticated
using (private.is_active_company_owner_or_admin(company_id))
with check (private.is_active_company_owner_or_admin(company_id));

create policy completion_archives_owner_admin_delete on public.completion_archives
for delete to authenticated
using (private.is_active_company_owner_or_admin(company_id));

create policy site_journal_objects_read on storage.objects
for select to authenticated
using (
  bucket_id in ('site-journal-originals', 'site-journal-thumbnails')
  and private.is_active_company_member((storage.foldername(name))[1]::uuid)
);

create policy site_journal_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id in ('site-journal-originals', 'site-journal-thumbnails')
  and private.is_active_company_member((storage.foldername(name))[1]::uuid)
);

create policy site_journal_original_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'site-journal-originals'
  and private.can_delete_verified_original(name)
);

create policy site_journal_thumbnail_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'site-journal-thumbnails'
  and private.is_active_company_owner_or_admin((storage.foldername(name))[1]::uuid)
);

create policy completion_archive_objects_read on storage.objects
for select to authenticated
using (
  bucket_id = 'completion-archives'
  and private.is_active_company_member((storage.foldername(name))[1]::uuid)
);

create policy completion_archive_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'completion-archives'
  and private.is_active_company_owner_or_admin((storage.foldername(name))[1]::uuid)
);

create policy completion_archive_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'completion-archives'
  and private.is_active_company_owner_or_admin((storage.foldername(name))[1]::uuid)
);
