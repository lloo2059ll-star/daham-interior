create index if not exists site_journals_author_id_idx
  on public.site_journals(author_id);

create index if not exists site_journal_photos_created_by_idx
  on public.site_journal_photos(created_by);

create index if not exists site_journal_photos_journal_company_idx
  on public.site_journal_photos(journal_id, company_id);

create index if not exists completion_archives_created_by_idx
  on public.completion_archives(created_by);
