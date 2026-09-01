# Company Sharing and Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every approved DAHAM employee share all company work data and receive phone push notifications for every create/update/delete plus schedule reminders.

**Architecture:** Keep the static HTML/localStorage/`sync_data` application, add a focused browser activity module and PWA push module, and persist semantic activity events to new RLS-protected Supabase tables through authenticated RPCs. Supabase Edge Functions drain a durable outbox and create schedule reminders; server-side RPCs enforce owner-or-project-assignee deletion rights.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in tests, Service Worker Web Push, Supabase Auth/Postgres/RLS/RPC/Cron/Edge Functions, Deno.

**Spec:** `docs/superpowers/specs/2026-09-02-company-sharing-push-notifications-design.md`

## Global Constraints

- Reuse existing Supabase Auth and `profiles.is_active` approval.
- Active employees share every business category and receive every activity notification.
- One-hour and 07:00 all-day schedule reminders go to every active employee.
- Only `owner` or a profile assigned to that project may delete.
- Use `Asia/Seoul` for reminder calculation.
- Never expose VAPID private keys, secret keys, or `service_role` in frontend files.
- Enable RLS and explicit Data API grants on every new public table.
- Preserve existing localStorage keys and `sync_data` payloads.
- A failed notification must not roll back a successful business save.

---

### Task 1: Activity and Reminder Domain

**Files:**
- Create: `daham-activity-domain.js`
- Create: `tests/activity-domain.test.js`

**Interfaces:**
- Produces: `normalizeActivity(input, actor)`, `activityDedupeKey(event, bucketMs)`, `notificationCopy(event)`, `scheduleReminderCandidates(input)`.
- Consumes: plain objects only; no DOM, storage, or network.

- [ ] **Step 1: Write failing domain tests**

Test exact entity types, create/update/delete summaries, removal of phone numbers and money from lock-screen copy, five-minute update deduplication, Korean-time one-hour windows, 07:00 all-day reminders, and occurrence dedupe keys.

```js
test('one hour reminders target every active employee through one company outbox item',()=>{
  const rows=D.scheduleReminderCandidates({now:'2026-09-02T09:00:00+09:00',events:[{id:'s1',date:'2026-09-02',time:'10:00',title:'실측'}]});
  assert.deepEqual(rows.map(x=>x.dedupeKey),['schedule:s1:one-hour:2026-09-02']);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/activity-domain.test.js`
Expected: FAIL because `daham-activity-domain.js` does not exist.

- [ ] **Step 3: Implement the pure domain module**

Use a UMD wrapper matching `schedule-domain.js`. Reject unknown actions, require `entityType`, `entityId`, and `title`, strip sensitive patterns from notification bodies, and return deterministic dedupe keys.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/activity-domain.test.js`
Expected: all activity domain tests pass.

- [ ] **Step 5: Commit**

```bash
git add daham-activity-domain.js tests/activity-domain.test.js
git commit -m "feat: add activity notification domain"
```

### Task 2: PWA Installation, Permission, and Subscription Client

**Files:**
- Create: `daham-push.js`
- Create: `service-worker.js`
- Create: `tests/push-client.test.js`
- Modify: `manifest.json`
- Modify: `index.html`
- Modify: protected HTML pages that lack the manifest/push script includes

**Interfaces:**
- Consumes: `DAHAM_AUTH.ready`, `DAHAM_AUTH.getAuthHeaders()`, `DAHAM_AUTH.getSupabaseConfig()`.
- Produces: `DAHAM_PUSH.init()`, `DAHAM_PUSH.subscribe()`, `DAHAM_PUSH.status()`, `DAHAM_PUSH.sendTest()`.

- [ ] **Step 1: Write failing PWA contract tests**

Assert the manifest has `id`, `scope`, 192/512 icons, standalone display, and start URL; every protected page links the manifest and loads `daham-push.js`; the client only requests permission from a button click; the worker handles `push` and `notificationclick`; subscription POST uses the employee JWT.

- [ ] **Step 2: Run RED**

Run: `node --test tests/push-client.test.js`
Expected: missing push client, worker, icons, and install UI failures.

- [ ] **Step 3: Implement subscription UI and worker**

Add a compact `휴대전화 알림 설정` banner after successful login. Detect iOS standalone mode; show `공유 → 홈 화면에 추가` before enabling the permission button. Convert the server VAPID public key to `Uint8Array`, call `pushManager.subscribe({userVisibleOnly:true, applicationServerKey})`, and POST endpoint/key data through authenticated RPC/REST. The worker must display `data.title/body` and navigate only to same-origin relative URLs.

- [ ] **Step 4: Add app icons and manifest metadata**

Create deterministic DAHAM navy/purple 192×192 and 512×512 PNG icons, reference them from `manifest.json`, and add `<link rel="manifest" href="manifest.json">` to protected pages.

- [ ] **Step 5: Run GREEN**

Run: `node --test tests/push-client.test.js tests/security-regression.test.js`
Expected: all tests pass and no secret key appears in frontend files.

- [ ] **Step 6: Commit**

```bash
git add daham-push.js service-worker.js manifest.json icons tests/push-client.test.js *.html
git commit -m "feat: add installable push notification client"
```

### Task 3: Supabase Sharing, Activity, Subscription, and Outbox Schema

**Files:**
- Create via `supabase migration new`: `supabase/migrations/<timestamp>_company_activity_push.sql`
- Create: `supabase/tests/company_activity_push_security.sql`
- Modify: `tests/database-permissions.test.js`

**Interfaces:**
- Produces tables `company_memberships`, `project_assignments`, `activity_events`, `push_subscriptions`, `notification_outbox`.
- Produces RPCs `publish_activity(...)`, `register_push_subscription(...)`, `disable_push_subscription(text)`, `claim_notification_batch(integer)`.

- [ ] **Step 1: Discover CLI and create the migration**

Run `supabase --version`, `supabase migration --help`, and `supabase migration new company_activity_push`. If CLI is unavailable, stop before inventing a timestamp and install/use the supported project CLI path.

- [ ] **Step 2: Write failing SQL/security assertions**

Node tests must require RLS, explicit authenticated grants, company-membership predicates, `USING` plus `WITH CHECK` for updates, revoked public function execution, and no authorization from `user_metadata`. SQL tests must cover active/blocked/cross-company users and endpoint ownership.

- [ ] **Step 3: Implement schema and policies**

Create a default DAHAM company, backfill active profiles, link future approval changes to membership status, and create indexes on membership, project assignment, outbox status/send time, and event company/time. `publish_activity` derives actor/company from `auth.uid()`, inserts the immutable event, and upserts a five-minute outbox bucket without accepting actor IDs from clients.

- [ ] **Step 4: Implement subscription RPCs**

Only the logged-in active employee may register or disable their endpoint. Store endpoint and encryption keys but never return other employees' subscription material. Revoking membership disables that profile's subscriptions.

- [ ] **Step 5: Verify SQL**

Run: `node --test tests/database-permissions.test.js`
Run: `npx supabase start`
Run: `npx supabase test db supabase/tests/company_activity_push_security.sql`
Expected: active same-company operations pass; inactive/cross-company access fails.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations supabase/tests tests/database-permissions.test.js
git commit -m "feat: add secure company activity outbox"
```

### Task 4: Auth Approval and Employee Notification Status

**Files:**
- Modify: `auth.js`
- Modify: `employees.html`
- Modify: `tests/auth.test.js`
- Modify: `tests/pages.test.js`

**Interfaces:**
- Produces `DAHAM_AUTH.currentCompany()`, approval synchronized with `company_memberships`, employee fields `push_enabled` and `push_last_seen_at`.

- [ ] **Step 1: Write failing auth and page tests**

Verify owner approval activates membership, suspension revokes membership and subscriptions, active employees expose one company ID, and employee management shows only connection status/last seen—not endpoint or keys.

- [ ] **Step 2: Run RED**

Run: `node --test tests/auth.test.js tests/pages.test.js`
Expected: membership and push status APIs are missing.

- [ ] **Step 3: Implement minimal auth integration**

Use authenticated RPCs for approve/suspend so profile and membership updates are atomic. Extend profile selection only with safe company/push status data. Keep existing login and local auth key behavior unchanged.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/auth.test.js tests/pages.test.js`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add auth.js employees.html tests/auth.test.js tests/pages.test.js
git commit -m "feat: connect employee approval to company sharing"
```

### Task 5: Common Activity Publisher and All-Page Coverage

**Files:**
- Create: `daham-activity.js`
- Create: `tests/activity-client.test.js`
- Create: `tests/activity-coverage.test.js`
- Modify: `consult.html`, `schedule.html`, `estimate.html`, `estimate-commercial.html`, `contract.html`, `order.html`, `payment.html`, `spec.html`, `spec.js`, `photos.html`, `completion.html`, `as.html`, `worklog.html`, `notice.html`, `contacts.html`, `price-editor.html`, `price-management.js`, `estimate-detail.html`, and `estimate-summary.html`

**Interfaces:**
- Consumes: `DAHAM_ACTIVITY_DOMAIN.normalizeActivity`, `DAHAM_AUTH.getAuthHeaders()`.
- Produces: `DAHAM_ACTIVITY.publish(input): Promise<{queued:boolean,eventId?:string}>`, `DAHAM_ACTIVITY.retryPending()`.

- [ ] **Step 1: Write failing client and coverage tests**

Test authenticated `publish_activity` calls, local retry queue on network failure, no rollback of business saves, and one integration marker for create/update/delete at every applicable page mutation boundary. Maintain an explicit entity/page/action matrix in the test so missing categories fail by name.

- [ ] **Step 2: Run RED**

Run: `node --test tests/activity-client.test.js tests/activity-coverage.test.js`
Expected: publisher and page integrations are missing.

- [ ] **Step 3: Implement the shared publisher**

Queue only normalized event payloads under `daham_activity_retry_v1`; retry after auth readiness and online events; remove a queued item only after RPC success. Never store push endpoints or secrets in this queue.

- [ ] **Step 4: Integrate each mutation boundary**

After each successful local/cloud save, publish the exact entity type, record ID, project ID, title, changed field labels, and same-origin detail URL. For delete, wait for the authorized server delete result before updating local state and publishing.

- [ ] **Step 5: Run GREEN and regression tests**

Run: `node --test tests/activity-client.test.js tests/activity-coverage.test.js tests/*.test.js`
Expected: the coverage matrix and full suite pass.

- [ ] **Step 6: Commit**

```bash
git add daham-activity.js tests/activity-client.test.js tests/activity-coverage.test.js *.html spec.js
git commit -m "feat: publish every ERP activity"
```

### Task 6: Push Sender Edge Function and Test Notification

**Files:**
- Create: `supabase/functions/send-push/index.ts`
- Create: `supabase/functions/send-push/deno.json`
- Create: `supabase/functions/send-push/index.test.ts`
- Modify: `daham-push.js`

**Interfaces:**
- Consumes outbox claims and active `push_subscriptions`.
- Consumes secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Produces delivered/partial/failed outbox status and an owner-only test notification path.

- [ ] **Step 1: Write failing sender tests**

Mock Web Push HTTP responses and verify fan-out to every active company subscription, no inactive membership delivery, 404/410 subscription deactivation, retryable 429/5xx handling, and redacted logs.

- [ ] **Step 2: Run RED**

Run: `deno test --allow-env --allow-net supabase/functions/send-push/index.test.ts`
Expected: sender module is missing.

- [ ] **Step 3: Implement outbox draining**

Claim a bounded batch atomically, sign standards-based Web Push requests with VAPID, send in bounded parallel groups, record per-device results, and finalize each outbox row. Do not call another Edge Function recursively.

- [ ] **Step 4: Add owner test button behavior**

`DAHAM_PUSH.sendTest()` publishes a `test` outbox item only for the current owner's company. The UI reports `전송 요청됨`; actual receipt is verified on the registered phone.

- [ ] **Step 5: Run GREEN**

Run Deno sender tests and `node --test tests/push-client.test.js`.
Expected: all sender and client tests pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-push daham-push.js tests/push-client.test.js
git commit -m "feat: deliver company web push notifications"
```

### Task 7: Schedule Reminder Edge Function and Cron

**Files:**
- Create: `supabase/functions/schedule-reminders/index.ts`
- Create: `supabase/functions/schedule-reminders/index.test.ts`
- Modify: the Task 3 migration with a new migration created through CLI if Task 3 is already applied

**Interfaces:**
- Consumes schedule JSON from existing `sync_data` keys and Task 1 reminder domain-equivalent logic.
- Produces unique outbox rows for `schedule_one_hour` and `all_day_morning`.

- [ ] **Step 1: Write failing reminder tests**

Cover construction tasks and general events, 55–65 minute one-hour window, 07:00 Korean-time all-day window, all-company delivery, changed times, cancelled schedules, and duplicate cron runs.

- [ ] **Step 2: Run RED**

Run: `deno test --allow-env supabase/functions/schedule-reminders/index.test.ts`
Expected: reminder function is missing.

- [ ] **Step 3: Implement reminder extraction and outbox inserts**

Parse only known schedule keys, normalize dates/times, skip cancelled entries, and insert with `ON CONFLICT (dedupe_key) DO NOTHING`.

- [ ] **Step 4: Configure Cron securely**

Create a five-minute Cron job that invokes the reminder function without embedding service secrets in public SQL. Use Vault or the supported Supabase secret mechanism and document the dashboard secret step.

- [ ] **Step 5: Run GREEN**

Run reminder tests and `node --test tests/activity-domain.test.js tests/schedule-domain.test.js`.
Expected: all reminder and schedule regression tests pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/schedule-reminders supabase/migrations tests
git commit -m "feat: schedule company-wide push reminders"
```

### Task 8: Project Assignment and Delete Enforcement

**Files:**
- Create/modify through CLI: `supabase/migrations/<timestamp>_project_delete_permissions.sql`
- Create: `supabase/tests/project_delete_permissions.sql`
- Modify: project/schedule assignment UI and every delete handler covered by `tests/activity-coverage.test.js`
- Modify: `tests/database-permissions.test.js`

**Interfaces:**
- Produces RPCs `assign_project_member(text,uuid,boolean)` and `delete_company_entity(text,text,text)`.
- Consumes `project_assignments` and current `auth.uid()`.

- [ ] **Step 1: Write failing permission tests**

Verify owner delete, assigned employee delete, unassigned staff/admin rejection, cross-company rejection, assignment removal taking effect immediately, and an immutable delete activity event.

- [ ] **Step 2: Run RED**

Run Node database permission tests and Supabase SQL tests.
Expected: current admin-based consultation delete and direct page deletions violate the new rule.

- [ ] **Step 3: Implement assignment UI and RPC enforcement**

Store UUID assignments, show employee names in the UI, and route deletions through server RPCs. Remove UI delete buttons for unauthorized users but keep RLS/RPC as the actual enforcement layer.

- [ ] **Step 4: Run GREEN**

Run database, consultation, schedule, estimate, photo, worklog, and full regression tests.
Expected: owner/assignee paths pass and unauthorized deletions fail.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations supabase/tests tests *.html *.js
git commit -m "feat: enforce assigned project deletion rights"
```

### Task 9: Deployment and Phone Verification

**Files:**
- Modify: deployment notes only if the repository already contains them

**Interfaces:**
- Consumes a linked Supabase project, VAPID secrets, GitHub Pages/custom-domain deployment.
- Produces a deployed PWA and a received iPhone test notification.

- [ ] **Step 1: Run pre-deployment verification**

Run `npm test`, Edge Function tests, SQL tests/advisors, `git diff --check`, secret scan, and `git status --short`. Expected: zero failures and no untracked production files.

- [ ] **Step 2: Apply database migrations and advisors**

Use the authenticated Supabase CLI/MCP connection. Apply migrations, run database/security advisors, fix findings, and verify migration history.

- [ ] **Step 3: Configure secrets and deploy functions**

Generate VAPID keys once, store private material only as Edge Function secrets, deploy `send-push` and `schedule-reminders`, and invoke each health/test path.

- [ ] **Step 4: Deploy static site**

Push the verified branch to the repository deployment target and wait for `https://daham-interior.com` to serve the new manifest and worker.

- [ ] **Step 5: Register representative phone and send test**

Open the installed iPhone home-screen app, tap `알림 받기`, accept iOS permission, verify subscription status in employee management, and use `테스트 알림 보내기`. Expected: lock-screen notification opens the ERP target page.

- [ ] **Step 6: Verify real event and reminders**

Create and modify one disposable test schedule, verify immediate all-employee pushes, set a safe test schedule approximately one hour ahead, verify reminder deduplication, then remove test records through an authorized account.
