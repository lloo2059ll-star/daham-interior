begin;

do $$
declare
  staff_id uuid;
  owner_id uuid;
  staff_company_id uuid;
  foreign_company_id uuid := gen_random_uuid();
  staff_journal_id uuid := gen_random_uuid();
  foreign_journal_id uuid := gen_random_uuid();
  archive_id uuid := gen_random_uuid();
begin
  select p.id, m.company_id
    into staff_id, staff_company_id
    from public.profiles p
    join public.company_memberships m on m.profile_id = p.id
   where p.role = 'staff'
     and p.is_active = true
     and m.status = 'active'
   limit 1;
  select p.id into owner_id
    from public.profiles p
    join public.company_memberships m on m.profile_id = p.id
   where p.role = 'owner'
     and p.is_active = true
     and m.company_id = staff_company_id
     and m.status = 'active'
   limit 1;

  if staff_id is null or owner_id is null or staff_company_id is null then
    raise exception 'active same-company owner and staff fixtures are required';
  end if;

  insert into public.companies(id, name) values (foreign_company_id, '__site_journal_foreign_company__');
  insert into public.site_journals(id, company_id, project_id, work_date, visit_type, author_id)
  values (foreign_journal_id, foreign_company_id, '__foreign_project__', current_date, 'visit', owner_id);
  insert into public.completion_archives(id, company_id, project_id, status, snapshot_at, journal_count, photo_count, source_bytes, created_by)
  values (archive_id, staff_company_id, '__archive_permission_project__', 'ready', now(), 0, 0, 0, owner_id);

  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  perform set_config('test.site_journal.owner_id', owner_id::text, true);
  perform set_config('test.site_journal.foreign_company_id', foreign_company_id::text, true);
  perform set_config('test.site_journal.foreign_journal_id', foreign_journal_id::text, true);
  perform set_config('test.site_journal.archive_id', archive_id::text, true);
end $$;

set local role authenticated;

do $$
declare
  staff_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  owner_id uuid := current_setting('test.site_journal.owner_id')::uuid;
  staff_company_id uuid;
  staff_journal_id uuid := gen_random_uuid();
  staff_photo_id uuid := gen_random_uuid();
  foreign_company_id uuid := current_setting('test.site_journal.foreign_company_id')::uuid;
  foreign_journal_id uuid := current_setting('test.site_journal.foreign_journal_id')::uuid;
  archive_id uuid := current_setting('test.site_journal.archive_id')::uuid;
  cross_read_blocked boolean := false;
  cross_write_blocked boolean := false;
  staff_archive_create_blocked boolean := false;
  staff_archive_delete_blocked boolean := false;
  staff_author_reassignment_blocked boolean := false;
  staff_creator_reassignment_blocked boolean := false;
begin
  select m.company_id into staff_company_id
    from public.company_memberships m
   where m.profile_id = staff_id and m.status = 'active'
   limit 1;
  insert into public.site_journals(id, company_id, project_id, work_date, visit_type, author_id)
  values (staff_journal_id, staff_company_id, '__same_company_project__', current_date, 'visit', staff_id);
  insert into public.site_journal_photos(id, company_id, journal_id, storage_path, original_name, mime_type, byte_size, sha256, status, sort_order, created_by)
  values (staff_photo_id, staff_company_id, staff_journal_id, staff_company_id::text || '/__same_company_project__/' || staff_journal_id::text || '/photo/photo.jpg', 'photo.jpg', 'image/jpeg', 1, repeat('a', 64), 'ready', 0, staff_id);
  if not exists (select 1 from public.site_journals where id = staff_journal_id) then
    raise exception 'same-company staff journal write unexpectedly failed';
  end if;

  begin
    update public.site_journals set author_id = owner_id where id = staff_journal_id;
  exception when insufficient_privilege then
    staff_author_reassignment_blocked := true;
  end;
  if not staff_author_reassignment_blocked then
    raise exception 'staff journal author reassignment unexpectedly succeeded';
  end if;
  begin
    update public.site_journal_photos set created_by = owner_id where id = staff_photo_id;
  exception when insufficient_privilege then
    staff_creator_reassignment_blocked := true;
  end;
  if not staff_creator_reassignment_blocked then
    raise exception 'staff photo creator reassignment unexpectedly succeeded';
  end if;

  if exists (select 1 from public.site_journals where id = foreign_journal_id) then
    raise exception 'cross-company journal read unexpectedly succeeded';
  end if;
  begin
    insert into public.site_journals(id, company_id, project_id, work_date, visit_type, author_id)
    values (gen_random_uuid(), foreign_company_id, '__foreign_project__', current_date, 'visit', staff_id);
  exception when insufficient_privilege then
    cross_write_blocked := true;
  end;
  if not cross_write_blocked then
    raise exception 'cross-company journal write unexpectedly succeeded';
  end if;

  begin
    insert into public.completion_archives(id, company_id, project_id, status, snapshot_at, journal_count, photo_count, source_bytes, created_by)
    values (archive_id, staff_company_id, '__same_company_project__', 'queued', now(), 1, 1, 1, staff_id);
  exception when insufficient_privilege then
    staff_archive_create_blocked := true;
  end;
  if not staff_archive_create_blocked then
    raise exception 'staff archive creation unexpectedly succeeded';
  end if;

  delete from public.completion_archives where id = archive_id;
  staff_archive_delete_blocked := exists (
    select 1 from public.completion_archives where id = archive_id
  );
  if not staff_archive_delete_blocked then
    raise exception 'staff archive deletion unexpectedly succeeded';
  end if;
end $$;

reset role;

do $$
declare
  owner_id uuid;
begin
  select p.id into owner_id
    from public.profiles p
    join public.company_memberships m on m.profile_id = p.id
   where p.role = 'owner' and p.is_active = true and m.status = 'active'
   limit 1;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
end $$;

set local role authenticated;

do $$
declare
  owner_id uuid := current_setting('request.jwt.claim.sub')::uuid;
  owner_company_id uuid;
  archive_id uuid := gen_random_uuid();
begin
  select m.company_id into owner_company_id
    from public.company_memberships m
   where m.profile_id = owner_id and m.status = 'active'
   limit 1;
  insert into public.completion_archives(id, company_id, project_id, status, snapshot_at, journal_count, photo_count, source_bytes, created_by)
  values (archive_id, owner_company_id, '__same_company_project__', 'queued', now(), 1, 1, 1, owner_id);
  if not exists (select 1 from public.completion_archives where id = archive_id) then
    raise exception 'owner archive creation unexpectedly failed';
  end if;
  delete from public.completion_archives where id = archive_id;
end $$;

rollback;

