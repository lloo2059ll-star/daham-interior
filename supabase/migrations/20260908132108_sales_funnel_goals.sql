create table if not exists public.sales_funnel_goals (
  company_id uuid not null references public.companies(id) on delete cascade,
  month date not null,
  inquiry_target integer not null check (inquiry_target >= 0),
  site_visit_target integer not null check (site_visit_target >= 0),
  estimate_meeting_target integer not null check (estimate_meeting_target >= 0),
  contract_target integer not null check (contract_target >= 0),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, month),
  check (month = date_trunc('month', month)::date)
);

create index if not exists sales_funnel_goals_company_month_idx on public.sales_funnel_goals(company_id, month desc);

create or replace function private.set_sales_funnel_goal_audit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_sales_funnel_goal_audit() from public, anon, authenticated;
drop trigger if exists sales_funnel_goals_audit on public.sales_funnel_goals;
create trigger sales_funnel_goals_audit before insert or update on public.sales_funnel_goals
for each row execute function private.set_sales_funnel_goal_audit();

alter table public.sales_funnel_goals enable row level security;
revoke all on table public.sales_funnel_goals from anon;
revoke all on table public.sales_funnel_goals from authenticated;
grant select, insert, update on table public.sales_funnel_goals to authenticated;

drop policy if exists sales_funnel_goals_select on public.sales_funnel_goals;
create policy sales_funnel_goals_select on public.sales_funnel_goals for select to authenticated
using (private.is_active_company_owner_or_admin(company_id));

drop policy if exists sales_funnel_goals_insert on public.sales_funnel_goals;
create policy sales_funnel_goals_insert on public.sales_funnel_goals for insert to authenticated
with check (private.is_active_company_owner_or_admin(company_id));

drop policy if exists sales_funnel_goals_update on public.sales_funnel_goals;
create policy sales_funnel_goals_update on public.sales_funnel_goals for update to authenticated
using (private.is_active_company_owner_or_admin(company_id))
with check (private.is_active_company_owner_or_admin(company_id));
