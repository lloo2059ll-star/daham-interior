-- Keep site periods consistent even when an older client saves blank dates.
CREATE OR REPLACE FUNCTION public.schedule_periods_from_tasks(payload text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE data jsonb; site jsonb; task jsonb; result jsonb := '[]'; info jsonb;
  first_day date; last_day date; start_day date; end_day date; start_text text; end_text text;
BEGIN
  data := payload::jsonb;
  IF jsonb_typeof(data) IS DISTINCT FROM 'array' THEN RETURN payload; END IF;
  FOR site IN SELECT value FROM jsonb_array_elements(data) LOOP
    IF jsonb_typeof(site) IS DISTINCT FROM 'object' OR jsonb_typeof(site->'tasks') IS DISTINCT FROM 'array' THEN
      result := result || jsonb_build_array(site); CONTINUE;
    END IF;
    first_day := NULL; last_day := NULL;
    FOR task IN SELECT value FROM jsonb_array_elements(site->'tasks') LOOP
      IF coalesce(task->>'kind','') NOT IN ('','construction') OR coalesce(task->>'status','') IN ('cancelled','canceled') THEN CONTINUE; END IF;
      start_text := task->>'start';
      IF start_text IS NULL OR start_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN CONTINUE; END IF;
      BEGIN
        start_day := start_text::date;
        IF to_char(start_day,'YYYY-MM-DD') <> start_text THEN CONTINUE; END IF;
      EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN CONTINUE;
      END;
      end_day := start_day; end_text := task->>'end';
      IF end_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        BEGIN
          IF to_char(end_text::date,'YYYY-MM-DD') = end_text AND end_text::date >= start_day THEN end_day := end_text::date; END IF;
        EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN NULL;
        END;
      END IF;
      first_day := least(first_day,start_day); last_day := greatest(last_day,end_day);
    END LOOP;
    info := CASE WHEN jsonb_typeof(site->'info') = 'object' THEN site->'info' ELSE '{}'::jsonb END;
    IF first_day IS NOT NULL THEN
      info := info || jsonb_build_object('start',to_char(first_day,'YYYY-MM-DD'),'end',to_char(last_day,'YYYY-MM-DD'));
      site := site || jsonb_build_object('info',info,'periodSource','tasks');
    ELSIF site->>'periodSource' = 'tasks' THEN
      site := (site - 'periodSource') || jsonb_build_object('info',info || '{"start":"","end":""}'::jsonb);
    END IF;
    result := result || jsonb_build_array(site);
  END LOOP;
  RETURN result::text;
END $$;

CREATE OR REPLACE FUNCTION public.sync_schedule_periods()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.value := public.schedule_periods_from_tasks(NEW.value);
  RETURN NEW;
END $$;

CREATE TRIGGER sync_schedule_periods
BEFORE INSERT OR UPDATE OF value ON public.sync_data
FOR EACH ROW WHEN (NEW.key = 'daham_schedule_v1')
EXECUTE FUNCTION public.sync_schedule_periods();

UPDATE public.sync_data
SET value = public.schedule_periods_from_tasks(value), updated_at = now()
WHERE key = 'daham_schedule_v1'
AND value IS DISTINCT FROM public.schedule_periods_from_tasks(value);
