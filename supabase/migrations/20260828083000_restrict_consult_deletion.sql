create schema if not exists private;

create or replace function private.can_delete_consults()
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

revoke execute on function private.can_delete_consults() from public, anon, authenticated;

create or replace function private.protect_consult_deletions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_records jsonb;
  new_records jsonb;
begin
  if old.key <> 'daham_consult_v1' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if private.can_delete_consults() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    raise exception '상담 삭제는 대표 또는 관리자만 할 수 있습니다.' using errcode = '42501';
  end if;

  if new.key is distinct from old.key then
    raise exception '상담 삭제는 대표 또는 관리자만 할 수 있습니다.' using errcode = '42501';
  end if;

  old_records := old.value::jsonb;
  new_records := new.value::jsonb;

  if jsonb_typeof(old_records) <> 'array' or jsonb_typeof(new_records) <> 'array' then
    raise exception '상담 데이터 형식이 올바르지 않습니다.' using errcode = '22023';
  end if;

  if jsonb_array_length(new_records) < jsonb_array_length(old_records)
     or exists (
       select 1
       from jsonb_array_elements(old_records) as previous(record)
       where nullif(previous.record ->> 'id', '') is not null
         and not exists (
           select 1
           from jsonb_array_elements(new_records) as current(record)
           where current.record ->> 'id' = previous.record ->> 'id'
         )
     ) then
    raise exception '상담 삭제는 대표 또는 관리자만 할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function private.protect_consult_deletions() from public, anon, authenticated;

drop trigger if exists protect_consult_deletions on public.sync_data;
create trigger protect_consult_deletions
before update or delete on public.sync_data
for each row execute function private.protect_consult_deletions();

drop function if exists public.delete_consult_record(text);
create or replace function public.delete_consult_record(p_record_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_value text;
  current_records jsonb;
  updated_records jsonb;
  removed_count integer;
  changed_at timestamptz;
begin
  if not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and role in ('owner', 'admin')
  ) then
    raise exception '상담 삭제는 대표 또는 관리자만 할 수 있습니다.' using errcode = '42501';
  end if;

  select value
    into current_value
    from public.sync_data
   where key = 'daham_consult_v1'
   for update;

  if current_value is null then
    raise exception '삭제할 상담 데이터를 찾지 못했습니다.' using errcode = 'P0002';
  end if;

  current_records := current_value::jsonb;
  if jsonb_typeof(current_records) <> 'array' then
    raise exception '상담 데이터 형식이 올바르지 않습니다.' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(record) filter (where record ->> 'id' is distinct from p_record_id), '[]'::jsonb),
         count(*) filter (where record ->> 'id' = p_record_id)
    into updated_records, removed_count
    from jsonb_array_elements(current_records) as item(record)
  ;

  if removed_count <> 1 then
    raise exception '삭제할 상담을 찾지 못했거나 ID가 중복되어 있습니다.' using errcode = 'P0002';
  end if;

  changed_at := now();

  update public.sync_data
     set value = updated_records::text,
         updated_at = changed_at
   where key = 'daham_consult_v1';

  return jsonb_build_object('deleted',true,'id',p_record_id,'updated_at',changed_at);
end;
$$;

revoke execute on function public.delete_consult_record(text) from public, anon;
grant execute on function public.delete_consult_record(text) to authenticated;

