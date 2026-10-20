import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "./domain.js";

declare global {
  var DAHAM_SCHEDULE_REMINDERS: {
    extractScheduleEvents(input: unknown): Array<Record<string, unknown>>;
    buildReminderRows(input: unknown): Array<Record<string, unknown>>;
    extractMaterialEvents(input: unknown): Array<Record<string, unknown>>;
    buildMaterialReminderRows(input: unknown): Array<Record<string, unknown>>;
    obsoleteMaterialReminderIds(jobs: unknown, events: unknown, now: unknown): string[];
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

  const options = await request.json().catch(() => ({}));
  const dryRun = options?.dryRun === true;
  const now = dryRun && options?.previewNow ? new Date(options.previewNow) : new Date();
  if (!Number.isFinite(now.getTime())) return json({ error: "invalid_preview_time" }, 400);

  const { data: stored, error: readError } = await supabase.from("sync_data")
    .select("key,value").in("key", ["daham_schedule_v1", "daham_schedule_general_v1"]);
  if (readError) return json({ error: readError.message }, 500);
  const values = new Map((stored ?? []).map((row) => [row.key, row.value]));
  const events = globalThis.DAHAM_SCHEDULE_REMINDERS.extractScheduleEvents({
    construction: values.get("daham_schedule_v1") ?? [],
    general: values.get("daham_schedule_general_v1") ?? [],
  });
  const domain = globalThis.DAHAM_SCHEDULE_REMINDERS;
  const materialEvents = domain.extractMaterialEvents({ construction: values.get("daham_schedule_v1") ?? [] });
  const materialCandidates = domain.buildMaterialReminderRows({ now, events: materialEvents, companyId: COMPANY_ID });
  const candidates = domain.buildReminderRows({ now, events, companyId: COMPANY_ID }).concat(materialCandidates);
  if (dryRun) return json({ revision: "2026-10-20-material-d7", dryRun: true, events: events.length,
    materialSchedules: materialEvents.length, materialCandidates: materialCandidates.length,
    upcoming: materialEvents, candidates: materialCandidates });

  // Read current schedules on every run: deleted, completed and rescheduled work is never kept queued.
  const { data: pending, error: pendingError } = await supabase.from("notification_outbox")
    .select("id,status,dedupe_key").eq("kind", "material_order_week").eq("status", "pending");
  if (pendingError) return json({ error: pendingError.message }, 500);
  const obsolete = domain.obsoleteMaterialReminderIds(pending ?? [], materialEvents, now);
  if (obsolete.length) {
    const { error } = await supabase.from("notification_outbox").update({ status: "cancelled", last_error: "schedule_changed_or_removed" })
      .eq("kind", "material_order_week").eq("status", "pending").in("id", obsolete);
    if (error) return json({ error: error.message }, 500);
  }
  // A date moved away and then back can reuse its unsent cancelled key; sent rows are immutable.
  if (materialCandidates.length) {
    const { error } = await supabase.from("notification_outbox").update({ status: "pending", last_error: null })
      .eq("kind", "material_order_week").eq("status", "cancelled")
      .in("dedupe_key", materialCandidates.map((row) => row.dedupeKey));
    if (error) return json({ error: error.message }, 500);
  }
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
  return json({ revision: "2026-10-20-material-d7", events: events.length, materialSchedules: materialEvents.length,
    materialCandidates: materialCandidates.length, cancelled: obsolete.length, candidates: rows.length, queued, push: pushResult }, pushResponse.ok ? 200 : 502);
});
