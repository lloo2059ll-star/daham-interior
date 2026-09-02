create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'daham_push_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'daham_push_cron_secret', 'Schedule reminder cron authentication');
  end if;
end
$$;

create or replace function public.verify_push_cron_secret(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_token, '') <> '' and exists (
    select 1 from vault.decrypted_secrets
    where name = 'daham_push_cron_secret' and decrypted_secret = p_token
  );
$$;
revoke all on function public.verify_push_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_push_cron_secret(text) to service_role;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'daham-schedule-reminders';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end
$$;

select cron.schedule(
  'daham-schedule-reminders',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://famqvwnsustbxuizohni.supabase.co/functions/v1/schedule-reminders',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daham_push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $cron$
);
