begin;

do $$
declare
  owner_id uuid;
  admin_id uuid;
  staff_id uuid;
  company_id uuid;
  foreign_company_id uuid := gen_random_uuid();
begin
  select p.id, m.company_id into owner_id, company_id from public.profiles p
  join public.company_memberships m on m.profile_id = p.id
  where p.role = 'owner' and p.is_active = true and m.status = 'active' limit 1;
  select p.id into admin_id from public.profiles p join public.company_memberships m on m.profile_id = p.id
  where p.role = 'admin' and p.is_active = true and m.status = 'active' and m.company_id = company_id limit 1;
  select p.id into staff_id from public.profiles p join public.company_memberships m on m.profile_id = p.id
  where p.role = 'staff' and p.is_active = true and m.status = 'active' and m.company_id = company_id limit 1;
  if owner_id is null or admin_id is null or staff_id is null or company_id is null then
    raise exception 'active same-company owner admin and staff fixtures are required';
  end if;
  insert into public.companies(id, name) values (foreign_company_id, '__sales_funnel_foreign_company__');
  insert into public.sales_funnel_goals(company_id, month, inquiry_target, site_visit_target, estimate_meeting_target, contract_target, created_by, updated_by)
  values (foreign_company_id, date '2026-09-01', 99, 99, 99, 99, owner_id, owner_id);
  perform set_config('test.sales_funnel.owner_id', owner_id::text, true);
  perform set_config('test.sales_funnel.admin_id', admin_id::text, true);
  perform set_config('test.sales_funnel.staff_id', staff_id::text, true);
  perform set_config('test.sales_funnel.company_id', company_id::text, true);
  perform set_config('test.sales_funnel.foreign_company_id', foreign_company_id::text, true);
end $$;

set local role authenticated;

do $$
declare
  staff_id uuid := current_setting('test.sales_funnel.staff_id')::uuid;
  target_company_id uuid := current_setting('test.sales_funnel.company_id')::uuid;
  foreign_company_id uuid := current_setting('test.sales_funnel.foreign_company_id')::uuid;
  blocked boolean := false;
begin
  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  begin
    insert into public.sales_funnel_goals(company_id, month, inquiry_target, site_visit_target, estimate_meeting_target, contract_target, created_by, updated_by)
    values (target_company_id, date '2026-09-01', 10, 6, 4, 2, staff_id, staff_id);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'staff goal insert unexpectedly succeeded'; end if;
  if exists (select 1 from public.sales_funnel_goals where company_id = foreign_company_id) then
    raise exception 'cross-company goal read unexpectedly succeeded';
  end if;
end $$;

do $$
declare
  owner_id uuid := current_setting('test.sales_funnel.owner_id')::uuid;
  target_company_id uuid := current_setting('test.sales_funnel.company_id')::uuid;
begin
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  insert into public.sales_funnel_goals(company_id, month, inquiry_target, site_visit_target, estimate_meeting_target, contract_target, created_by, updated_by)
  values
    (target_company_id, date '2026-08-01', 8, 5, 3, 1, owner_id, owner_id),
    (target_company_id, date '2026-09-01', 10, 6, 4, 2, owner_id, owner_id);
  if not exists (select 1 from public.sales_funnel_goals where company_id = target_company_id and month = date '2026-09-01') then
    raise exception 'owner goal insert unexpectedly failed';
  end if;
end $$;

do $$
declare
  admin_id uuid := current_setting('test.sales_funnel.admin_id')::uuid;
  target_company_id uuid := current_setting('test.sales_funnel.company_id')::uuid;
begin
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  update public.sales_funnel_goals set inquiry_target = 12
  where company_id = target_company_id and month = date '2026-09-01';
  if not exists (select 1 from public.sales_funnel_goals where company_id = target_company_id and month = date '2026-09-01' and inquiry_target = 12) then
    raise exception 'admin goal update unexpectedly failed';
  end if;
  if not exists (select 1 from public.sales_funnel_goals where company_id = target_company_id and month = date '2026-08-01' and inquiry_target = 8) then
    raise exception 'september update changed august goal';
  end if;
end $$;

rollback;
