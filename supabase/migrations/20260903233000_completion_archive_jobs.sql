alter table public.completion_archives
  add column if not exists idempotency_key text,
  add column if not exists checkpoint jsonb not null default '{}'::jsonb,
  add column if not exists snapshot_manifest jsonb not null default '[]'::jsonb;

create unique index if not exists completion_archives_idempotency_idx
  on public.completion_archives(company_id, project_id, idempotency_key)
  where idempotency_key is not null;

alter table public.completion_archives
  add constraint completion_archives_idempotency_key_length
  check (idempotency_key is null or length(idempotency_key) between 8 and 128) not valid;

alter table public.completion_archives validate constraint completion_archives_idempotency_key_length;


