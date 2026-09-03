begin;

do $$
declare
  staff_id uuid;
  company_id uuid;
  journal_id uuid := gen_random_uuid();
  photo_id uuid := gen_random_uuid();
  orphan_path text;
  referenced_path text;
  referenced_delete_blocked boolean := false;
begin
  select p.id, m.company_id into staff_id, company_id
    from public.profiles p join public.company_memberships m on m.profile_id = p.id
   where p.role = 'staff' and p.is_active = true and m.status = 'active' limit 1;
  if staff_id is null then raise exception 'active staff fixture is required'; end if;
  orphan_path := company_id::text || '/__orphan_cleanup__/' || journal_id::text || '/orphan/photo.jpg';
  referenced_path := company_id::text || '/__orphan_cleanup__/' || journal_id::text || '/referenced/photo.jpg';
  insert into public.site_journals(id, company_id, project_id, work_date, visit_type, author_id)
  values (journal_id, company_id, '__orphan_cleanup__', current_date, 'visit', staff_id);
  insert into storage.objects(bucket_id, name, owner_id) values ('site-journal-originals', orphan_path, staff_id), ('site-journal-originals', referenced_path, staff_id);
  insert into public.site_journal_photos(id, company_id, journal_id, storage_path, original_name, mime_type, byte_size, sha256, status, sort_order, created_by)
  values (photo_id, company_id, journal_id, referenced_path, 'photo.jpg', 'image/jpeg', 1, repeat('a',64), 'ready', 0, staff_id);
  perform set_config('request.jwt.claim.sub', staff_id::text, true);
end $$;

set local role authenticated;

do $$
declare
  orphan_path text;
  referenced_path text;
  referenced_delete_blocked boolean := false;
begin
  select name into orphan_path from storage.objects where bucket_id = 'site-journal-originals' and name like '%/orphan/photo.jpg';
  select name into referenced_path from storage.objects where bucket_id = 'site-journal-originals' and name like '%/referenced/photo.jpg';
  delete from storage.objects where bucket_id = 'site-journal-originals' and name = orphan_path;
  if exists (select 1 from storage.objects where bucket_id = 'site-journal-originals' and name = orphan_path) then
    raise exception 'orphan original cleanup unexpectedly failed';
  end if;
  begin
    delete from storage.objects where bucket_id = 'site-journal-originals' and name = referenced_path;
  exception when insufficient_privilege then referenced_delete_blocked := true;
  end;
  if not referenced_delete_blocked then raise exception 'referenced original cleanup unexpectedly succeeded'; end if;
end $$;

rollback;

