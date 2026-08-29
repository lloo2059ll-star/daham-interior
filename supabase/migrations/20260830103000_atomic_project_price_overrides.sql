create or replace function public.update_project_price_overrides(
  p_project_id text,
  p_overrides jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_settings jsonb;
  next_settings jsonb;
begin
  if not private.can_manage_prices() then
    raise exception '단가 설정은 대표 또는 관리자만 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if nullif(btrim(p_project_id), '') is null or p_overrides is null or jsonb_typeof(p_overrides) <> 'object' then
    raise exception '올바른 견적 단가 데이터가 아닙니다.' using errcode = '22023';
  end if;

  select coalesce(value::jsonb, '{}'::jsonb)
    into current_settings
    from public.sync_data
   where key = 'daham_settings_v1'
   for update;

  current_settings := coalesce(current_settings, '{}'::jsonb);
  next_settings := jsonb_set(
    current_settings,
    '{projectPriceOverrides}',
    coalesce(current_settings->'projectPriceOverrides', '{}'::jsonb)
      || jsonb_build_object(p_project_id, p_overrides),
    true
  );

  insert into public.sync_data(key, value, updated_at)
  values ('daham_settings_v1', next_settings::text, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at;

  return next_settings::text;
end;
$$;

revoke all on function public.update_project_price_overrides(text, jsonb) from public, anon;
grant execute on function public.update_project_price_overrides(text, jsonb) to authenticated;

