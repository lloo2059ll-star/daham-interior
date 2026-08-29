begin;

do $$
declare
  staff_id uuid;
  owner_id uuid;
  original_value text;
  blocked boolean := false;
begin
  select id into staff_id from public.profiles where role = 'staff' and is_active = true limit 1;
  select id into owner_id from public.profiles where role = 'owner' and is_active = true limit 1;
  if staff_id is null or owner_id is null then
    raise exception 'active owner and staff fixtures are required';
  end if;

  select value into original_value from public.sync_data where key = 'daham_settings_v1';

  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  begin
    insert into public.sync_data(key, value, updated_at)
    values ('daham_settings_v1', '{"priceOverrides":{"forbidden":{"labor":1,"material":1}}}', now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then
    raise exception 'staff price update unexpectedly succeeded';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  insert into public.sync_data(key, value, updated_at)
  values ('daham_settings_v1', coalesce(original_value, '{}'), now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
end $$;

rollback;

