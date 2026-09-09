# Naver Blog Inquiry Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved three-step Naver Blog estimate form, import every valid submission into ERP as a new consultation, and enqueue a privacy-safe push notification for all approved employees.

**Architecture:** Keep the public browser insert-only: the page builds a validated `website_inquiries` payload with the existing publishable key. Extend the private database trigger so one accepted insert atomically appends the ERP consultation and creates an activity/outbox record; the existing push worker fans the notification out to active employee subscriptions. UI state and validation remain framework-free and testable through small exported domain helpers.

**Tech Stack:** Static HTML/CSS, browser JavaScript (UMD domain modules), Node.js built-in test runner, Supabase Postgres/RLS/triggers, existing Web Push outbox worker.

**Spec:** `docs/superpowers/specs/2026-09-09-naver-blog-inquiry-form-design.md`

## Global Constraints

- Use the approved premium editorial direction: ivory, sand beige, charcoal, thin rules, wide whitespace, no rounded app-card treatment.
- Use approximately `-0.04em` Korean heading tracking and `-0.015em` body tracking, adjusted only after browser rendering review.
- Support a 360px mobile viewport without horizontal scrolling.
- Keep the browser publishable-key only; never expose a service-role or secret key.
- Keep anonymous access insert-only on `public.website_inquiries`.
- Show success only after the inquiry insert and ERP trigger transaction both succeed.
- Notify every approved employee who has an active push subscription; do not include phone, detailed address, or free-text message in notification copy.
- A push delivery failure must not delete or roll back an already accepted consultation.
- Use `websiteInquiryId` and `website-inquiry:{id}` dedupe identities.

---

### Task 1: Three-step inquiry state and payload domain

**Files:**
- Modify: `website-public-domain.js`
- Create: `inquiry-domain.js`
- Modify: `tests/website-public-domain.test.js`
- Create: `tests/inquiry-domain.test.js`

**Interfaces:**
- Consumes: raw browser form values.
- Produces: `DAHAM_INQUIRY.stepFields(step) -> string[]`, `DAHAM_INQUIRY.validateStep(step, values) -> { valid:boolean, field:string, message:string }`, and the existing `DAHAM_WEBSITE_PUBLIC.buildInquiryPayload(values) -> object` with `source_channel: 'naver_blog'`.

- [ ] **Step 1: Write failing domain tests**

Add tests proving steps 1–3 expose the expected fields, blank name/phone blocks step 1, blank work scope blocks step 2, missing privacy blocks step 3, allowed scopes pass, and the payload records a typed Naver source without trusting free text.

```js
test('validates each inquiry step independently', () => {
  assert.equal(Inquiry.validateStep(1,{name:'',phone:''}).field,'name');
  assert.equal(Inquiry.validateStep(2,{workScope:''}).field,'workScope');
  assert.equal(Inquiry.validateStep(3,{privacyConsent:false}).field,'privacyConsent');
  assert.equal(Inquiry.validateStep(3,{privacyConsent:true}).valid,true);
});

test('builds a typed Naver Blog inquiry payload', () => {
  const payload=Website.buildInquiryPayload({
    name:' 홍길동 ',phone:'01012345678',workScope:'전체 공사',
    sourceChannel:'naver_blog',privacyConsent:true
  });
  assert.equal(payload.source,'website');
  assert.equal(payload.source_channel,'naver_blog');
  assert.match(payload.message,/공사 범위: 전체 공사/);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/inquiry-domain.test.js tests/website-public-domain.test.js`

Expected: FAIL because `inquiry-domain.js` and `source_channel` do not exist.

- [ ] **Step 3: Implement the minimal domain helpers**

Create a UMD module matching the repository’s existing domain modules. Accept only step numbers 1–3 and the scope values `전체 공사` or `부분 공사`. Update `buildInquiryPayload` to map only the allowlisted source channel `naver_blog`; do not accept arbitrary labels as a database source.

```js
function normalizeSourceChannel(value){
  return value==='naver_blog'?'naver_blog':'website';
}

function validateStep(step,values){
  values=values||{};
  if(step===1&&!text(values.name)) return invalid('name','성함을 입력해 주세요.');
  if(step===1&&!text(values.phone)) return invalid('phone','연락처를 입력해 주세요.');
  if(step===2&&['전체 공사','부분 공사'].indexOf(text(values.workScope))<0) return invalid('workScope','공사 범위를 선택해 주세요.');
  if(step===3&&values.privacyConsent!==true) return invalid('privacyConsent','개인정보 수집 및 이용에 동의해 주세요.');
  return {valid:true,field:'',message:''};
}
```

- [ ] **Step 4: Run focused tests and verify pass**

Run: `node --test tests/inquiry-domain.test.js tests/website-public-domain.test.js`

Expected: all focused tests PASS.

- [ ] **Step 5: Commit the domain unit**

```bash
git add website-public-domain.js inquiry-domain.js tests/website-public-domain.test.js tests/inquiry-domain.test.js
git commit -m "feat: add staged Naver inquiry domain"
```

### Task 2: Approved responsive form UI

**Files:**
- Modify: `inquiry.html`
- Modify: `inquiry.css`
- Modify: `inquiry-overrides.css`
- Modify: `inquiry.js`
- Modify: `tests/website-ui.test.js`

**Interfaces:**
- Consumes: `DAHAM_INQUIRY.validateStep`, `DAHAM_WEBSITE_PUBLIC.buildInquiryPayload`, and the existing Supabase browser client.
- Produces: a three-step form with `[data-step-panel]`, `[data-step-next]`, `[data-step-back]`, `#inquiry-progress`, and the existing `#inquiry-page-form` submission contract.

- [ ] **Step 1: Write failing UI structure tests**

Require three panels, progress copy, forward/back controls, the approved brand copy, the domain script before `inquiry.js`, mobile CSS at 360px, busy-state semantics, and focus transfer to the invalid field.

```js
for(const marker of ['data-step-panel="1"','data-step-panel="2"','data-step-panel="3"','id="inquiry-progress"']) {
  assert.match(html,new RegExp(marker));
}
assert.match(html,/예쁜 집보다,[\s\S]*이유 있는 공간/);
assert.match(html,/inquiry-domain\.js[\s\S]*inquiry\.js/);
assert.match(css,/@media\s*\(max-width:\s*600px\)/);
assert.match(js,/validateStep/);
assert.match(js,/aria-busy/);
assert.match(js,/\.focus\(\)/);
```

- [ ] **Step 2: Run the UI test and verify failure**

Run: `node --test tests/website-ui.test.js`

Expected: FAIL because the current page is a single rigid form.

- [ ] **Step 3: Implement the approved HTML and CSS**

Use a two-column editorial hero/form layout on desktop and a single-column flow on mobile. Render only the active fieldset, preserve inputs while moving between steps, expose progress with `aria-live="polite"`, and keep a visible phone fallback.

```html
<ol id="inquiry-progress" class="progress" aria-label="견적 문의 진행 단계">
  <li aria-current="step">01 기본 정보</li><li>02 현장 정보</li><li>03 상담 내용</li>
</ol>
<fieldset data-step-panel="1">...</fieldset>
<fieldset data-step-panel="2" hidden>...</fieldset>
<fieldset data-step-panel="3" hidden>...</fieldset>
```

- [ ] **Step 4: Implement staged interaction and submission**

On next/back, update `hidden`, `aria-current`, and focus. On final submit, pass `sourceChannel:'naver_blog'`, set `aria-busy="true"`, disable the submit button, show success only after the Supabase insert resolves without error, retain all values on failure, and reset to step 1 on success.

```js
function goToStep(next){
  currentStep=next;
  panels.forEach(function(panel){panel.hidden=Number(panel.dataset.stepPanel)!==currentStep;});
  updateProgress(currentStep);
  var target=form.querySelector('[data-step-panel="'+currentStep+'"] input, [data-step-panel="'+currentStep+'"] select, [data-step-panel="'+currentStep+'"] textarea');
  if(target)target.focus();
}
```

- [ ] **Step 5: Run UI and domain tests**

Run: `node --test tests/website-ui.test.js tests/inquiry-domain.test.js tests/website-public-domain.test.js`

Expected: all tests PASS.

- [ ] **Step 6: Commit the responsive UI unit**

```bash
git add inquiry.html inquiry.css inquiry-overrides.css inquiry.js tests/website-ui.test.js
git commit -m "feat: redesign Naver inquiry experience"
```

### Task 3: Atomic ERP import and all-staff notification outbox

**Files:**
- Create: a migration generated by `supabase migration new naver_blog_inquiry_notifications`
- Modify: `tests/website-db-security.test.js`
- Modify: `supabase/tests/website_public_security.sql`

**Interfaces:**
- Consumes: `public.website_inquiries.source_channel`, existing `public.sync_data`, `public.activity_events`, `public.notification_outbox`, and existing company membership/subscription data.
- Produces: one ERP record keyed by `websiteInquiryId`, one activity event, and one pending outbox row keyed by `website-inquiry:{id}`.

- [ ] **Step 1: Verify current Supabase tooling and documentation**

Run: `supabase --version` and `supabase migration new --help`.

Fetch `https://supabase.com/changelog.md`, scan applicable breaking changes, and consult current official documentation for trigger functions, RLS, and `security definer` hardening before writing SQL.

- [ ] **Step 2: Write failing static security and behavior tests**

Require the new allowlisted `source_channel`, RLS/privilege preservation, private trigger function, direct execute revocation, `inquiry` milestone, Naver source/title, event/outbox insertion, safe copy, relative target URL, and deterministic dedupe key.

```js
assert.match(sql,/source_channel[^;]*check\s*\(source_channel in \('website','naver_blog'\)\)/i);
assert.match(sql,/'consultTitle',\s*'네이버 블로그 견적 문의'/);
assert.match(sql,/'source',\s*'네이버 블로그'/);
assert.match(sql,/'status',\s*'inquiry'/);
assert.match(sql,/insert into public\.activity_events/i);
assert.match(sql,/insert into public\.notification_outbox/i);
assert.match(sql,/website-inquiry:/);
assert.doesNotMatch(sql,/notification_outbox[\s\S]{0,800}new\.phone/i);
```

- [ ] **Step 3: Run database tests and verify failure**

Run: `node --test tests/website-db-security.test.js`

Expected: FAIL because the source column and notification outbox work are absent.

- [ ] **Step 4: Generate and implement the migration**

Run `supabase migration new naver_blog_inquiry_notifications`, then edit only the generated migration. Add a non-null allowlisted source channel defaulting to `website`, replace the private import trigger function, append an explicit `inquiry` milestone, and insert activity/outbox rows after the ERP append. Resolve the company id from the existing active company configuration without accepting a company id from the public payload.

Use notification values exactly as follows:

```sql
v_dedupe_key := 'website-inquiry:' || new.id::text;
v_title := '신규 상담 · 네이버 블로그';
v_body := new.name || ' / ' || coalesce(nullif(new.site_name,''), nullif(split_part(new.address,' ',2),''), '현장 정보 미입력');
v_target_url := 'consult.html?consult=' || v_consult_id;
```

Insert the activity event and outbox idempotently. Never include `new.phone`, `new.address_detail`, or `new.message` in notification title/body.

- [ ] **Step 5: Run static and SQL integration checks**

Run: `node --test tests/website-db-security.test.js`

Then run the repository’s configured Supabase SQL test path against a disposable/local database using `supabase/tests/website_public_security.sql`. Verify an anonymous insert succeeds, anonymous reads fail, one ERP record appears, one outbox row appears, and replaying the same UUID does not duplicate either record.

Expected: all static tests PASS and SQL checks return only `ok` rows.

- [ ] **Step 6: Run Supabase advisors**

Run `supabase db advisors` when supported; otherwise use the configured Supabase MCP `get_advisors`. Fix all new security and performance findings attributable to this migration, then rerun the database tests.

- [ ] **Step 7: Commit the database unit**

```bash
git add supabase/migrations tests/website-db-security.test.js supabase/tests/website_public_security.sql
git commit -m "feat: notify staff of Naver inquiries"
```

### Task 4: Full verification and browser QA

**Files:**
- Modify only if verification exposes a defect: files introduced or changed in Tasks 1–3.

**Interfaces:**
- Consumes: complete form, database trigger, ERP data, outbox, and push worker.
- Produces: release-ready evidence and an exact public form URL suitable for a Naver Blog link.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 2: Serve the static site locally**

Use the repository’s existing local static-server command. Open `inquiry.html` at desktop width and 360×800 mobile width.

- [ ] **Step 3: Perform visual and interaction QA**

Verify the approved ivory/sand/charcoal treatment, Korean tracking, no horizontal overflow, visible focus, correct progress state, back navigation value retention, validation focus, disabled/busy submission, success reset, and failure retention.

- [ ] **Step 4: Perform one safe end-to-end test submission**

Submit clearly labeled test data. Verify exactly one website inquiry, one ERP `inquiry` consultation with Naver source and milestone, one activity event, and one pending/delivered outbox record. Confirm the notification reaches every currently active test subscription and opens the matching consultation.

- [ ] **Step 5: Remove test business data through the existing supported admin/test cleanup path**

Delete only the clearly labeled end-to-end test inquiry and its generated consultation/activity/outbox rows using exact IDs captured in Step 4. Recheck that no real inquiry was touched.

- [ ] **Step 6: Review the final diff and commit verification fixes**

Run: `git diff --check` and `git status --short`.

If QA required changes, stage only files from this feature and commit:

```bash
git commit -m "fix: polish Naver inquiry flow"
```

- [ ] **Step 7: Prepare deployment handoff**

Record the tested public URL, required migration deployment, push worker/config prerequisites, and the exact URL to insert into the Naver Blog CTA. Do not edit or publish the Naver post until the user confirms the deployed form URL and requests publication.
