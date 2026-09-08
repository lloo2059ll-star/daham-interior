# DAHAM ERP Sales Funnel Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an owner/admin-only sales funnel dashboard from existing consultation milestones and estimate projects, with activity-period goals, inquiry-cohort conversion rates, channel analysis, and month-specific Supabase goals.

**Architecture:** Keep `daham_consult_v1` and `daham_detail_v2` as the source of truth. Put all analytics in a pure CommonJS/browser domain module, isolate authenticated loading and goal persistence in a client module, minimally extend consultation JSON fields, and render the result inside the existing ERP dashboard without exposing it to staff or customer mode.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Supabase JavaScript client, PostgreSQL migrations and RLS.

**Spec:** `docs/superpowers/specs/2026-09-08-sales-funnel-dashboard-design.md`

## Global Constraints

- The visible funnel labels are exactly 신규 문의, 현장방문, 견적미팅, 계약.
- Monthly activity counts use each milestone's occurrence date; conversion rates use the inquiry cohort selected by inquiry date.
- `est_done` and estimate creation never imply an estimate meeting.
- Preserve unknown fields in existing consultation and estimate JSON records.
- Do not create a duplicate lead table or modify `website_inquiries`.
- Use Asia/Seoul calendar boundaries with inclusive start and exclusive end.
- Show sales, amount, goal, loss, and conversion data only to active owner/admin users and never in `body.customer-view`.
- Do not delete or initialize production data and do not deploy.

---

### Task 1: Funnel milestone and calendar domain

**Files:**
- Create: `sales-funnel-domain.js`
- Create: `tests/sales-funnel-domain.test.js`

**Interfaces:**
- Produces: `milestones(record)`, `reachedStage(record)`, `periodFor(filter, now, selectedMonth)`, `inPeriod(value, period)`, `activityCounts(records, period)`, and constants `STAGES` and `STAGE_LABELS`.
- Date values returned by `milestones` are normalized valid instants or `null`; periods are `{start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', key: string}` in Korean calendar dates.

- [ ] **Step 1: Write failing milestone tests**

Test earliest valid milestones, invalid-date skipping, `createdAt` fallback, `est_done` exclusion, and retained reached stage for lost/cancelled records:

```js
const Funnel = require('../sales-funnel-domain.js');
test('derives earliest valid funnel milestones without treating est_done as a meeting', () => {
  const result = Funnel.milestones({
    createdAt: '2026-09-01T00:30:00+09:00',
    outcomeStatus: 'lost',
    history: [
      {type:'milestone', status:'site_check', at:'broken'},
      {type:'milestone', status:'site_check', at:'2026-09-05T10:00'},
      {type:'milestone', status:'site_check', at:'2026-09-03T10:00'},
      {type:'milestone', status:'est_done', at:'2026-09-06T10:00'}
    ]
  });
  assert.equal(result.inquiry.slice(0,10), '2026-09-01');
  assert.equal(result.site_visit.slice(0,10), '2026-09-03');
  assert.equal(result.estimate_meeting, null);
  assert.equal(Funnel.reachedStage({history:[{type:'milestone',status:'est_meeting',at:'2026-09-07T10:00'}],outcomeStatus:'lost'}), 'estimate_meeting');
});
```

- [ ] **Step 2: Run the domain test and verify RED**

Run: `node --test tests/sales-funnel-domain.test.js`

Expected: FAIL because `sales-funnel-domain.js` does not exist.

- [ ] **Step 3: Implement minimal milestone and period functions**

Expose the same object to Node and `window.DAHAM_SALES_FUNNEL`; parse date-only/local datetime values without UTC month slicing, choose the earliest valid event per mapped stage, and compare Korean `YYYY-MM-DD` keys:

```js
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DAHAM_SALES_FUNNEL=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STAGES=['inquiry','site_visit','estimate_meeting','contract'];
  const STATUS_MAP={inquiry:'inquiry',site_check:'site_visit',est_meeting:'estimate_meeting',contracted:'contract'};
  function valid(value){const d=new Date(value);return value&&Number.isFinite(d.getTime())?String(value):null;}
  function milestones(record){
    const out={inquiry:null,site_visit:null,estimate_meeting:null,contract:null};
    (Array.isArray(record&&record.history)?record.history:[]).forEach(item=>{
      const stage=item&&item.type==='milestone'&&STATUS_MAP[item.status],at=stage&&valid(item.at);
      if(at&&(!out[stage]||new Date(at)<new Date(out[stage])))out[stage]=at;
    });
    out.inquiry=out.inquiry||valid(record&&record.createdAt);
    return out;
  }
  function reachedStage(record){const dates=milestones(record);for(let i=STAGES.length-1;i>=0;i--)if(dates[STAGES[i]])return STAGES[i];return null;}
  function keyFromParts(year,month,day){return [year,String(month).padStart(2,'0'),String(day).padStart(2,'0')].join('-');}
  function periodFor(filter,now,selectedMonth){
    const d=new Date(now),year=d.getFullYear(),month=d.getMonth()+1;
    let startYear=year,startMonth=month,endYear=year,endMonth=month+1;
    if(filter==='last_month'){startMonth=month-1;endMonth=month;}
    if(filter==='last_3_months'){startMonth=month-2;endMonth=month+1;}
    if(filter==='year'){startMonth=1;endMonth=13;}
    if(filter==='month'){const parts=String(selectedMonth).split('-').map(Number);startYear=parts[0];startMonth=parts[1];endYear=startYear;endMonth=startMonth+1;}
    const normalize=(y,m)=>({year:y+Math.floor((m-1)/12),month:((m-1)%12+12)%12+1});
    const a=normalize(startYear,startMonth),b=normalize(endYear,endMonth);
    return {start:keyFromParts(a.year,a.month,1),end:keyFromParts(b.year,b.month,1),key:filter==='month'?selectedMonth:filter};
  }
  function dateKey(value){const d=new Date(value);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  function inPeriod(value,period){if(!valid(value))return false;const key=dateKey(value);return key>=period.start&&key<period.end;}
  function activityCounts(records,period){const counts={inquiry:0,site_visit:0,estimate_meeting:0,contract:0};(records||[]).forEach(record=>{const dates=milestones(record);STAGES.forEach(stage=>{if(inPeriod(dates[stage],period))counts[stage]++;});});return counts;}
  return {STAGES,STAGE_LABELS:{inquiry:'신규 문의',site_visit:'현장방문',estimate_meeting:'견적미팅',contract:'계약'},milestones,reachedStage,periodFor,inPeriod,activityCounts};
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/sales-funnel-domain.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the domain foundation**

```bash
git add sales-funnel-domain.js tests/sales-funnel-domain.test.js
git commit -m "feat: derive sales funnel milestones"
```

### Task 2: Activity metrics, cohort conversions, goals, and money

**Files:**
- Modify: `sales-funnel-domain.js`
- Modify: `tests/sales-funnel-domain.test.js`

**Interfaces:**
- Consumes: Task 1 milestone and period functions.
- Produces: `cohortMetrics(records, period)`, `goalProgress(activity, goals)`, `contractMetrics(records, projects, period, totalForProject)`, and `dashboardMetrics(input)`.

- [ ] **Step 1: Add failing tests for the seven required calculation cases**

Create consultation fixtures so activity counts are 10/7/3/2, the same inquiry cohort converts at 70.0/42.9/66.7/20.0, September activity can be 3 inquiries and 5 visits without yielding 166.7%, a September cohort may contract in October, month events remain separated, and zero denominators return finite zeroes.

```js
assert.deepEqual(Funnel.activityCounts(records, september), {inquiry:10,site_visit:7,estimate_meeting:3,contract:2});
assert.deepEqual(Funnel.cohortMetrics(records, september).rates, {inquiry_to_visit:70,visit_to_meeting:42.9,meeting_to_contract:66.7,inquiry_to_contract:20});
assert.ok(Funnel.cohortMetrics(crossMonthRecords,september).rates.inquiry_to_visit <= 100);
assert.equal(Funnel.cohortMetrics(zeroRecords,september).rates.meeting_to_contract, 0);
assert.equal(Number.isFinite(Funnel.cohortMetrics(zeroRecords,september).rates.meeting_to_contract), true);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/sales-funnel-domain.test.js`

Expected: FAIL because cohort and metric functions are undefined.

- [ ] **Step 3: Implement cohort and financial metrics**

Build the cohort only from inquiry dates in the period, count later reached milestones regardless of occurrence month, round rates to one decimal, clamp logically impossible numerator drift to the cohort subset, and derive contract amounts only from contracts occurring in the activity period. Resolve projects by `projId` first and `consultId` second; use `contractTotal`, then the injected existing estimate calculator, then zero.

```js
function safeRate(n,d){return d>0?Math.round((n/d)*1000)/10:0;}
function cohortMetrics(records,period){
  const cohort=records.filter(r=>inPeriod(milestones(r).inquiry,period));
  const reached={inquiry:cohort.length,site_visit:0,estimate_meeting:0,contract:0};
  // Count each stage only inside this cohort.
  return {cohort,reached,rates:{inquiry_to_visit:safeRate(reached.site_visit,reached.inquiry),visit_to_meeting:safeRate(reached.estimate_meeting,reached.site_visit),meeting_to_contract:safeRate(reached.contract,reached.estimate_meeting),inquiry_to_contract:safeRate(reached.contract,reached.inquiry)}};
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/sales-funnel-domain.test.js`

Expected: all calculation cases PASS and no `NaN` or `Infinity` appears.

- [ ] **Step 5: Commit calculation behavior**

```bash
git add sales-funnel-domain.js tests/sales-funnel-domain.test.js
git commit -m "feat: calculate cohort funnel conversions"
```

### Task 3: Source, contact, loss, drill-down, and interpretation analytics

**Files:**
- Modify: `sales-funnel-domain.js`
- Modify: `tests/sales-funnel-domain.test.js`

**Interfaces:**
- Produces: `groupBySource`, `groupBySourceType`, `groupByContactChannel`, `lossAnalysis`, `recordsForStage`, `dataIssues`, `monthlyHistory`, `interpret`, and `canView`.

- [ ] **Step 1: Write failing analysis and authorization tests**

```js
assert.equal(Funnel.groupBySource(records,september,projects,totalForProject).find(x=>x.key==='네이버 블로그').cohortConversion, 40);
assert.equal(Funnel.groupByContactChannel(records,september).find(x=>x.key==='카카오채널').inquiries, 4);
assert.equal(Funnel.lossAnalysis(records,september).reasons.find(x=>x.key==='예산').count, 3);
assert.equal(Funnel.canView({role:'owner',isActive:true}), true);
assert.equal(Funnel.canView({role:'admin',isActive:true}), true);
assert.equal(Funnel.canView({role:'staff',isActive:true}), false);
```

Also assert that custom source values remain separate, stage drill-down follows activity dates, and contracted projects without contract milestones are reported as `missing_contract_milestone` without creating a date.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/sales-funnel-domain.test.js`

Expected: FAIL on the first undefined analysis function.

- [ ] **Step 3: Implement grouped analytics and issue reporting**

Use `source || '미분류'`, `sourceType || 'unknown'`, and `contactChannel || '미분류'` independently. Group activity counts by event period, but compute each source conversion from the period's inquiry cohort with that source. Restrict interpretations to deterministic statements with sufficient denominators.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/sales-funnel-domain.test.js`

Expected: PASS.

- [ ] **Step 5: Commit analytics**

```bash
git add sales-funnel-domain.js tests/sales-funnel-domain.test.js
git commit -m "feat: add funnel channel and loss analytics"
```

### Task 4: Month-specific goal schema and RLS

**Files:**
- Create: the exact timestamped `supabase/migrations` path printed by `supabase migration new sales_funnel_goals`
- Create: `supabase/tests/sales_funnel_goals_security.sql`
- Modify: `tests/database-permissions.test.js`

**Interfaces:**
- Produces: `public.sales_funnel_goals` readable and writable only by active owner/admin users in their company.

- [ ] **Step 1: Discover the installed CLI and create the migration file**

Run: `supabase --version` and `supabase migration new sales_funnel_goals`.

Expected: the CLI prints its version and creates the timestamped migration; use exactly that generated path in all following commands.

- [ ] **Step 2: Write failing static and SQL security tests**

Add Node assertions for the composite primary key, non-negative checks, RLS, anon revoke, authenticated grants, owner/admin role predicate, and both `USING` and `WITH CHECK`. Add a rollback SQL test that creates owner/admin/staff test identities, verifies owner/admin select/insert/update, rejects staff and cross-company access, and proves September upsert does not change August.

- [ ] **Step 3: Run the static test and verify RED**

Run: `node --test tests/database-permissions.test.js`

Expected: FAIL because the migration lacks the required schema and policies.

- [ ] **Step 4: Implement the migration**

Create the table and index, revoke anon, grant only select/insert/update to authenticated, enable RLS, and add separate policies that call a private active owner/admin predicate based on `company_memberships`, `profiles.is_active`, and role membership. Ensure update policy contains both clauses:

```sql
create policy sales_funnel_goals_update on public.sales_funnel_goals
for update to authenticated
using (private.is_active_company_owner_or_admin(company_id))
with check (private.is_active_company_owner_or_admin(company_id));
```

- [ ] **Step 5: Run schema tests and local DB tests when available**

Run: `node --test tests/database-permissions.test.js`.

Then discover supported commands with `supabase test --help` and run the SQL suite using the supported local DB test command. If no local Supabase is available, record that production application and live RLS verification remains required.

- [ ] **Step 6: Commit the schema**

```bash
git add supabase/migrations supabase/tests/sales_funnel_goals_security.sql tests/database-permissions.test.js
git commit -m "feat: store monthly sales funnel goals"
```

### Task 5: Authenticated funnel data client

**Files:**
- Create: `sales-funnel-client.js`
- Create: `tests/sales-funnel-client.test.js`

**Interfaces:**
- Consumes: `DAHAM_AUTH`, Supabase client factory, `daham_consult_v1`, and `daham_detail_v2`/per-project sync keys.
- Produces: `createSalesFunnelClient(deps)` with `loadDashboard(period)`, `loadGoals(month)`, `saveGoals(month, goals)`, and `retry()`.

- [ ] **Step 1: Write failing client tests**

Test active owner/admin authorization, staff rejection before remote access, safe local fallback, newer remote merge without deleting existing local JSON, goal default metadata on read failure, exact month upsert, and no successful local confirmation after a failed save.

```js
await assert.rejects(()=>clientFor({role:'staff',isActive:true}).loadDashboard(period),/권한/);
assert.deepEqual((await failingRemoteClient.loadGoals('2026-09')).goals,{inquiry:10,site_visit:6,estimate_meeting:4,contract:2});
assert.equal((await failingRemoteClient.loadGoals('2026-09')).isDefault, true);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/sales-funnel-client.test.js`

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement dependency-injected client behavior**

Use the employee JWT, resolve the active company membership, fetch existing sync JSON without overwriting local data on errors, and upsert goals by `{company_id, month}` with `created_by`/`updated_by`. Return explicit `{loading,error,isDefault}` metadata for UI state.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/sales-funnel-client.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the client**

```bash
git add sales-funnel-client.js tests/sales-funnel-client.test.js
git commit -m "feat: load funnel data and monthly goals"
```

### Task 6: Consultation field and milestone extension

**Files:**
- Modify: `consult-modal.js`
- Modify: `consult.html`
- Modify: `tests/consult-modal.test.js`
- Modify: `tests/consult-ui.test.js`
- Modify: `tests/consult-schedule-link.test.js`

**Interfaces:**
- Consumes and preserves existing consultation records.
- Produces stored `source`, `sourceType`, `contactChannel`, `outcomeStatus`, `lostReason`, and an initial inquiry milestone for new consultations.

- [ ] **Step 1: Write failing consultation UI and save-shape tests**

Assert the exact source options, separate source type/contact channel inputs, outcome/loss fields, unknown value preservation, conditional loss reason behavior, and that new consultation save inserts one inquiry milestone without duplicating an existing one.

- [ ] **Step 2: Run consultation tests and verify RED**

Run: `node --test tests/consult-modal.test.js tests/consult-ui.test.js tests/consult-schedule-link.test.js`

Expected: FAIL on missing field markers and inquiry initialization behavior.

- [ ] **Step 3: Add fields and minimal save mapping**

Extend `DAHAM_CONSULT_MODAL.buildBody` with separate controls. In `saveModal`, read the five fields and merge them through `Object.assign({}, db[idx], changes)` for edits. For a new record, insert `{type:'milestone',status:'inquiry',at:localDTStr(),memo:''}` only when no valid inquiry milestone exists. Do not alter estimate project creation or schedule reconciliation.

- [ ] **Step 4: Run consultation tests and verify GREEN**

Run: `node --test tests/consult-modal.test.js tests/consult-ui.test.js tests/consult-schedule-link.test.js tests/consult-estimate-link.test.js`

Expected: PASS.

- [ ] **Step 5: Commit consultation changes**

```bash
git add consult-modal.js consult.html tests/consult-modal.test.js tests/consult-ui.test.js tests/consult-schedule-link.test.js
git commit -m "feat: capture sales source and outcomes"
```

### Task 7: Owner/admin dashboard UI and responsive drill-down

**Files:**
- Modify: `erp.html`
- Create: `sales-funnel-dashboard.js`
- Create: `sales-funnel-dashboard.css`
- Create: `tests/sales-funnel-ui.test.js`

**Interfaces:**
- Consumes: `DAHAM_SALES_FUNNEL`, `createSalesFunnelClient`, existing estimate-total calculation, `DAHAM_AUTH.currentUser()`, and customer-mode body state.
- Produces: period filter, four activity/goal cards, cohort labels, summary cards, drill-down, source/sourceType/contact/loss analyses, history, interpretations, goal editor, loading/error/retry states.

- [ ] **Step 1: Write failing structural and responsive tests**

Assert script/style load order after `auth.js`, exact four Korean labels, owner/admin render guard, staff empty/non-render path, `.customer-view .sales-funnel-shell{display:none!important}`, loading copy, goal editor controls, drill-down fields, PC four-column, tablet two-column, and mobile one-column rules.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `node --test tests/sales-funnel-ui.test.js`

Expected: FAIL because dashboard assets and markup are absent.

- [ ] **Step 3: Add the protected dashboard shell and render controller**

Add one `customer-sensitive` dashboard section to `erp.html`. On auth readiness, return before constructing content unless `Funnel.canView(user)` is true. Re-check `body.customer-view` before rendering sensitive output. Show 월간 활동 and cohort 전환율 as separately labeled elements, and make activity numbers invoke `recordsForStage`.

- [ ] **Step 4: Implement filters, goals, analyses, and retry states**

Wire 이번 달, 지난달, 최근 3개월, 올해, 월 직접 선택; use selected-month goals only for monthly filters and clearly label defaults. Save goals only after the client resolves successfully. Render data issues as non-blocking badges and open consultations via `localStorage.setItem('daham_open_consult', id)` followed by `consult.html` navigation.

- [ ] **Step 5: Implement responsive CSS**

Use the existing card, navy, purple, neutral, and spacing vocabulary. Define four columns above 1180px, two at tablet width, and one below 760px; preserve all table information with labeled mobile rows or controlled horizontal scrolling.

- [ ] **Step 6: Run UI and domain tests and verify GREEN**

Run: `node --test tests/sales-funnel-ui.test.js tests/sales-funnel-domain.test.js tests/sales-funnel-client.test.js`

Expected: PASS.

- [ ] **Step 7: Commit dashboard UI**

```bash
git add erp.html sales-funnel-dashboard.js sales-funnel-dashboard.css tests/sales-funnel-ui.test.js
git commit -m "feat: add sales funnel dashboard"
```

### Task 8: Full regression, visual verification, and handoff

**Files:**
- Modify only files required to fix regressions caused by Tasks 1–7.

**Interfaces:**
- Produces: verified implementation and deployment notes; does not deploy.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`.

Expected: all new and existing tests PASS, including consultation, schedule, estimate, contract, order, payment/security, and page tests.

- [ ] **Step 2: Run available build, lint, and type checks**

Run: `npm run` and inspect the listed scripts. Execute every available build, lint, and typecheck script. If none exist, record exactly that `package.json` only defines `test` and no build/lint/type scripts are available.

- [ ] **Step 3: Validate static pages and JavaScript syntax**

Run `node --check` on `sales-funnel-domain.js`, `sales-funnel-client.js`, and `sales-funnel-dashboard.js`. Re-run `git diff --check`.

- [ ] **Step 4: Verify live behavior at PC, tablet, and mobile widths**

Serve the repository locally, sign in with available non-production test accounts, and inspect 1440px, 900px, and 390px widths. Verify owner/admin visibility, staff absence, full customer-mode hiding, filter changes, goal save/reload, month independence, stage drill-down, and the 3-meeting/2-contract cohort result of 66.7%. Do not create production records.

- [ ] **Step 5: Verify Supabase persistence when a local DB is available**

Apply the generated migration to local Supabase only, run the SQL security test, reload the UI, and prove September goal edits persist without changing August or another company. If local Supabase is unavailable, do not apply to production; report live DB verification as a deployment prerequisite.

- [ ] **Step 6: Review the final diff for scope and data safety**

Run: `git diff HEAD~7 --stat`, `git status --short`, and inspect every changed file. Confirm no `website_inquiries` schema/policy changes, no destructive SQL, no unrelated refactor, and no embedded production credentials.

- [ ] **Step 7: Prepare the final report**

Report changed/new files, schema and JSON fields, data origins, milestone/activity/cohort/money formulas, source distinctions, loss analysis, goals/RLS, integration behavior, exact test outcomes, deployment steps, and remaining limitations.
