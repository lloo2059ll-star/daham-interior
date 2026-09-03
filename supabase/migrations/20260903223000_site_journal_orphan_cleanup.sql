create or replace function private.can_cleanup_unreferenced_site_journal_original(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_company_member(split_part(p_path, '/', 1)::uuid)
     and exists (
       select 1 from storage.objects o
        where o.bucket_id = 'site-journal-originals'
          and o.name = p_path
          and o.owner_id = (select auth.uid()::text)
     )
     and not exists (
       select 1 from public.site_journal_photos p
        where p.storage_path = p_path
          and p.deleted_at is null
     );
$$;

revoke execute on function private.can_cleanup_unreferenced_site_journal_original(text) from public, anon;
grant execute on function private.can_cleanup_unreferenced_site_journal_original(text) to authenticated;

drop policy if exists site_journal_original_objects_delete on storage.objects;
create policy site_journal_original_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'site-journal-originals'
  and (
    private.can_delete_verified_original(name)
    or private.can_cleanup_unreferenced_site_journal_original(name)
  )
);
