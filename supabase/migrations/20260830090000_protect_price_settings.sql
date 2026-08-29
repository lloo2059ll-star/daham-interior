create schema if not exists private;

create or replace function private.can_manage_prices()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and role in ('owner', 'admin')
  );
$$;

revoke execute on function private.can_manage_prices() from public, anon, authenticated;

create or replace function private.protect_price_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_key text;
begin
  target_key := case when tg_op = 'delete' then old.key else new.key end;
  if target_key <> 'daham_settings_v1'
     and not (tg_op = 'update' and old.key = 'daham_settings_v1') then
    return case when tg_op = 'delete' then old else new end;
  end if;

  if not private.can_manage_prices() then
    raise exception '단가 설정은 대표 또는 관리자만 변경할 수 있습니다.' using errcode = '42501';
  end if;

  return case when tg_op = 'delete' then old else new end;
end;
$$;

revoke execute on function private.protect_price_settings() from public, anon, authenticated;

drop trigger if exists protect_price_settings on public.sync_data;
create trigger protect_price_settings
before insert or update or delete on public.sync_data
for each row execute function private.protect_price_settings();

