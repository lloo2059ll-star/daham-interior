-- RLS decides which profile rows may be changed. The table-level UPDATE
-- privilege is also required before Postgres evaluates those policies.
grant update on table public.profiles to authenticated;
