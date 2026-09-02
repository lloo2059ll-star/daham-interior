import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const subject = Deno.env.get("VAPID_SUBJECT")!;
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) {
    return json({ error: "missing_configuration" }, 500);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const requestSecret = request.headers.get("x-cron-secret") ?? "";
  const legacySecret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
  const legacyAllowed = !!legacySecret && request.headers.get("authorization") === `Bearer ${legacySecret}`;
  const { data: rpcAllowed } = requestSecret
    ? await supabase.rpc("verify_push_cron_secret", { p_token: requestSecret })
    : { data: false };
  if (!legacyAllowed && rpcAllowed !== true) return json({ error: "unauthorized" }, 401);

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: jobs, error: jobsError } = await supabase
    .from("notification_outbox")
    .select("id,company_id,title,body,target_url,attempt_count")
    .eq("status", "pending")
    .lte("send_after", new Date().toISOString())
    .order("created_at")
    .limit(25);

  if (jobsError) return json({ error: jobsError.message }, 500);
  let sentJobs = 0;
  let failedJobs = 0;

  for (const job of jobs ?? []) {
    await supabase.from("notification_outbox").update({
      status: "sending",
      attempt_count: job.attempt_count + 1,
    }).eq("id", job.id).eq("status", "pending");

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("company_id", job.company_id)
      .eq("is_active", true);

    if (subscriptionsError) {
      await supabase.from("notification_outbox").update({ status: "failed", last_error: subscriptionsError.message }).eq("id", job.id);
      failedJobs += 1;
      continue;
    }

    let delivered = 0;
    const errors: string[] = [];
    const payload = JSON.stringify({ title: job.title, body: job.body, target: job.target_url, tag: job.id });
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload, { TTL: 3600 });
        delivered += 1;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0);
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id);
        }
        errors.push(`${statusCode || "push"}:${(error as Error).message}`);
      }
    }

    const total = subscriptions?.length ?? 0;
    const status = delivered === total ? "sent" : delivered > 0 ? "partial" : "failed";
    await supabase.from("notification_outbox").update({
      status,
      sent_at: delivered > 0 ? new Date().toISOString() : null,
      last_error: errors.join(" | ").slice(0, 2000) || null,
    }).eq("id", job.id);
    if (status === "failed") failedJobs += 1;
    else sentJobs += 1;
  }

  return json({ processed: jobs?.length ?? 0, sent: sentJobs, failed: failedJobs });
});
