drop policy if exists site_journal_photos_company_delete on public.site_journal_photos;
drop policy if exists site_journal_photos_creator_delete on public.site_journal_photos;

create policy site_journal_photos_creator_delete on public.site_journal_photos
for delete to authenticated
using (
  private.is_active_company_member(company_id)
  and created_by = (select auth.uid())
);

