begin;

do $$
declare
  staff_id uuid;
  owner_id uuid;
  test_id text := '__consult_delete_security_test__';
  blocked_update boolean := false;
  blocked_key_change boolean := false;
  blocked_row_delete boolean := false;
  blocked_rpc boolean := false;
  missing_record_rejected boolean := false;
  rpc_result jsonb;
begin
  select id into staff_id from public.profiles where role = 'staff' and is_active = true limit 1;
  select id into owner_id from public.profiles where role = 'owner' and is_active = true limit 1;
  if staff_id is null or owner_id is null then
    raise exception 'active owner and staff fixtures are required';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update public.sync_data
     set value = (value::jsonb || jsonb_build_array(jsonb_build_object('id', test_id)))::text
   where key = 'daham_consult_v1';

  perform set_config('request.jwt.claim.sub', staff_id::text, true);
  begin
    update public.sync_data
       set value = (
         select coalesce(jsonb_agg(record) filter (where record ->> 'id' is distinct from test_id), '[]'::jsonb)::text
         from jsonb_array_elements(value::jsonb) as item(record)
       )
     where key = 'daham_consult_v1';
  exception when insufficient_privilege then blocked_update := true;
  end;
  begin
    update public.sync_data set key = 'renamed_consults' where key = 'daham_consult_v1';
  exception when insufficient_privilege then blocked_key_change := true;
  end;
  begin
    delete from public.sync_data where key = 'daham_consult_v1';
  exception when insufficient_privilege then blocked_row_delete := true;
  end;
  begin
    perform public.delete_consult_record(test_id);
  exception when insufficient_privilege then blocked_rpc := true;
  end;

  if not (blocked_update and blocked_key_change and blocked_row_delete and blocked_rpc) then
    raise exception 'staff deletion protection was incomplete';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  rpc_result := public.delete_consult_record(test_id);
  if rpc_result ->> 'deleted' <> 'true' then
    raise exception 'owner RPC did not delete the consultation';
  end if;
  begin
    perform public.delete_consult_record('__missing__');
  exception when no_data_found then missing_record_rejected := true;
  end;
  if not missing_record_rejected then
    raise exception 'missing consultation was not rejected';
  end if;
end $$;

rollback;

