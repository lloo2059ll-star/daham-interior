import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "./domain.js";

declare global {
  var DAHAM_SCHEDULE_REMINDERS: {
    extractScheduleEvents(input: unknown): Array<Record<string, unknown>>;
    buildReminderRows(input: unknown): Array<Record<string, unknown>>;
  };
}

const COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8" },
});

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return json({ error: "missing_configuration" }, 500);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const cronSecret = request.headers.get("x-cron-secret") ?? "";
  const { data: allowed, error: authError } = await supabase.rpc("verify_push_cron_secret", { p_token: cronSecret });
  if (authError || allowed !== true) return json({ error: "unauthorized" }, 401);

  const { data: stored, error: readError } = await supabase.from("sync_data")
    .select("key,value").in("key", ["daham_schedule_v1", "daham_schedule_general_v1"]);
  if (readError) return json({ error: readError.message }, 500);
  const values = new Map((stored ?? []).map((row) => [row.key, row.value]));
  const events = globalThis.DAHAM_SCHEDULE_REMINDERS.extractScheduleEvents({
    construction: values.get("daham_schedule_v1") ?? [],
    general: values.get("daham_schedule_general_v1") ?? [],
  });
  const candidates = globalThis.DAHAM_SCHEDULE_REMINDERS.buildReminderRows({ now: new Date(), events, companyId: COMPANY_ID });
  const rows = candidates.map((row) => ({
    company_id: row.companyId, kind: row.kind, title: row.title, body: row.body,
    target_url: row.targetUrl, dedupe_key: row.dedupeKey, send_after: row.sendAfter, status: row.status,
  }));
  let queued = 0;
  if (rows.length) {
    const { data, error } = await supabase.from("notification_outbox")
      .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
    if (error) return json({ error: error.message }, 500);
    queued = data?.length ?? 0;
  }

  const pushResponse = await fetch(`${url}/functions/v1/send-push`, {
    method: "POST", headers: { "content-type": "application/json", "x-cron-secret": cronSecret }, body: "{}",
  });
  const pushResult = await pushResponse.json().catch(() => ({ error: "invalid_push_response" }));
  return json({ events: events.length, candidates: rows.length, queued, push: pushResult }, pushResponse.ok ? 200 : 502);
});
