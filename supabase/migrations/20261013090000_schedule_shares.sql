create table if not exists public.schedule_shares (
  id text primary key,
  data jsonb not null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  constraint schedule_shares_id_format check (id ~ '^share_[a-z0-9]{8,80}$')
);

alter table public.schedule_shares enable row level security;
revoke all on table public.schedule_shares from anon, authenticated;
grant select on table public.schedule_shares to anon;
grant select, insert, update, delete on table public.schedule_shares to authenticated;

drop policy if exists schedule_shares_public_read on public.schedule_shares;
create policy schedule_shares_public_read on public.schedule_shares
for select to anon using (expires_at > now());

drop policy if exists schedule_shares_staff_read on public.schedule_shares;
create policy schedule_shares_staff_read on public.schedule_shares
for select to authenticated using (private.is_active_staff());

drop policy if exists schedule_shares_staff_insert on public.schedule_shares;
create policy schedule_shares_staff_insert on public.schedule_shares
for insert to authenticated with check (private.is_active_staff());

drop policy if exists schedule_shares_staff_update on public.schedule_shares;
create policy schedule_shares_staff_update on public.schedule_shares
for update to authenticated using (private.is_active_staff()) with check (private.is_active_staff());

drop policy if exists schedule_shares_staff_delete on public.schedule_shares;
create policy schedule_shares_staff_delete on public.schedule_shares
for delete to authenticated using (private.is_active_staff());

create index if not exists schedule_shares_expires_at_idx on public.schedule_shares(expires_at);
create index if not exists schedule_shares_created_by_idx on public.schedule_shares(created_by);
