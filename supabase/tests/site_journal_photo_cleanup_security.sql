begin;

do $$
declare
  staff_id uuid;
  other_uploader_id uuid;
  company_id uuid;
  journal_id uuid := gen_random_uuid();
  staff_photo_id uuid := gen_random_uuid();
  other_photo_id uuid := gen_random_uuid();
begin
  select p.id, m.company_id
    into staff_id, company_id
    from public.profiles p
    join public.company_memberships m on m.profile_id = p.id
   where p.role = 'staff'
     and p.is_active = true
     and m.status = 'active'
   limit 1;

  select p.id
    into other_uploader_id
    from public.profiles p
    join public.company_memberships m on m.profile_id = p.id
   where p.id <> staff_id
     and p.is_active = true
     and m.company_id = company_id
     and m.status = 'active'
   limit 1;

  if staff_id is null or other_uploader_id is null or company_id is null then
    raise exception 'two active same-company uploaders including staff are required';
  end if;

  insert into public.site_journals(id, company_id, project_id, work_date, visit_type, author_id)
  values (journal_id, company_id, '__photo_cleanup_security__', current_date, 'visit', staff_id);

  insert into public.site_journal_photos(
    id, company_id, journal_id, storage_path, original_name, mime_type,
    byte_size, sha256, status, sort_order, created_by
  ) values
    (
      staff_photo_id, company_id, journal_id,
      company_id::text || '/__photo_cleanup_security__/' || journal_id::text || '/' || staff_photo_id::text || '/own.jpg',
      'own.jpg', 'image/jpeg', 1, repeat('a', 64), 'ready', 0, staff_id
    ),
    (
      other_photo_id, company_id, journal_id,
      company_id::text || '/__photo_cleanup_security__/' || journal_id::text || '/' || other_photo_id::text || '/other.jpg',
      'other.jpg', 'image/jpeg', 1, repeat('b', 64), 'ready', 1, other_uploader_id
    );

  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  perform set_config('test.site_journal.staff_photo_id', staff_photo_id::text, true);
  perform set_config('test.site_journal.other_photo_id', other_photo_id::text, true);
end $$;

set local role authenticated;

do $$
declare
  staff_photo_id uuid := current_setting('test.site_journal.staff_photo_id')::uuid;
  other_photo_id uuid := current_setting('test.site_journal.other_photo_id')::uuid;
begin
  delete from public.site_journal_photos where id = other_photo_id;
  if not exists (select 1 from public.site_journal_photos where id = other_photo_id) then
    raise exception 'staff deleted another uploader''s photo row';
  end if;

  delete from public.site_journal_photos where id = staff_photo_id;
  if exists (select 1 from public.site_journal_photos where id = staff_photo_id) then
    raise exception 'staff could not delete their own stale photo row';
  end if;
end $$;

rollback;

