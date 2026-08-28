# Operational UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify every production operations page with the existing dashboard and estimate visual language without changing protected pages, application behavior, data access, permissions, CRUD, URLs, or printed output.

**Architecture:** Add one operations-only stylesheet, `operations-ui.css`, and load it only from the approved production pages. Scope every rule below `.operations-ui` and use page-kind body classes to adapt existing markup without replacing functional DOM nodes. Keep `index.html`, every `estimate*.html`, the existing v2 shared assets, and excluded demo/prototype pages byte-identical.

**Tech Stack:** Static HTML, scoped CSS, existing vanilla JavaScript, Node.js built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-28-operational-ui-unification-design.md`

## Global Constraints

- Do not modify `index.html` or any `estimate*.html` file.
- Do not modify `v2-theme.css`, `v2-suite.css`, or `v2-suite.js`, because protected estimate pages consume them.
- Do not modify `consult-demo.html`, `design-demo.html`, or `index.prototype.html`.
- Do not change Supabase integration, authentication, authorization, CRUD behavior, data structures, URLs, localStorage keys, or workflow.
- Do not change printed document content or `@media print` output.
- Restrict markup edits to stylesheet links and body presentation classes unless a visual wrapper is demonstrably necessary and proven behavior-neutral.
- Preserve the untracked `.npm-cache/` directory and do not commit it.

---

### Task 1: Lock the protected boundary with regression tests

**Files:**
- Create: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: Node `fs`, `path`, `crypto`, and the repository HTML files.
- Produces: tests that enforce immutable SHA-256 hashes, approved stylesheet consumers, unchanged script/ID/form signatures, and print-rule preservation.

- [ ] **Step 1: Write the failing protected-boundary and target-coverage tests**

Create `tests/ui-unification.test.js` with constants for the approved targets and these baseline SHA-256 values:

```js
const protectedHashes = {
  'consult-demo.html': '6F88BC07D467D2513F34522A666249B5C57AF7A20BC87B5E14D71630EF6EE11E',
  'design-demo.html': '1FF3C2A3D39091A53BB27E24FA9F83EF75FCBEE99418B9877AFA92A77CE6C011',
  'estimate-commercial.html': 'FE425CFFF9941CDD062A672C0508EEFCFEE7CF56B01B5FCAD11E1DE0C738C044',
  'estimate-detail.html': 'FC6DB88AF2922FCC837DDBCB5D1D02184912FE79EC8B2C231E7491BCCFEE97A7',
  'estimate-summary.html': 'CCCCB96CAF71A79107C0E37FFF1EC6573DE8E61E26A975A8B29B12E64693E9A4',
  'estimate.html': '3782D5852294C91BCD1905DE97513968759B265673791379BE34A61713EE3561',
  'index.html': 'F473120334236AB56BAD033480E72BB9AFF0BC177B3C92F46C2E8DFB90CF50F7',
  'index.prototype.html': '0FD2908BA94B1558891F764B45D76FE34EBB47416E2BFCE3C1134FE9C5AF29B2',
  'v2-suite.css': '75B945A4C974842E52AFD2B10F514B29A84A348AE10BE1DF517E818B95848D1D',
  'v2-suite.js': '3255683CE809F27D117CD6861C0D09DA2E2A50EE691581E2D402AC3792DA57DF',
  'v2-theme.css': '1C572D773C246435EA590E97B027363A5499C40D7A960DB7CCFA4F73AAA18024'
};
```

Assert that each hash matches. Assert that all 17 approved target pages link `operations-ui.css` and have `operations-ui` plus the correct `operations-admin`, `operations-document`, or `operations-auth` body class. Assert that no protected/excluded page links the new stylesheet. Capture each target's script `src`, element IDs, `name` attributes, inline handler attributes, and print media block count into a pre-change signature fixture inside the test so later HTML edits cannot silently alter functional hooks.

- [ ] **Step 2: Run the new test and verify it fails for the missing stylesheet/class**

Run: `node --test tests/ui-unification.test.js`

Expected: FAIL because `operations-ui.css` does not exist and targets do not reference it.

- [ ] **Step 3: Run the existing suite to record the green baseline**

Run: `npm test`

Expected: all existing authentication, permission, Supabase, page, security, and consultation-delete tests pass.

- [ ] **Step 4: Commit the test boundary**

```powershell
git add -- tests/ui-unification.test.js
git commit -m "test: lock operational UI change boundary"
```

### Task 2: Build the operations-only design system

**Files:**
- Create: `operations-ui.css`
- Test: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: existing page class names under `.operations-ui`.
- Produces: `--ops-*` tokens and scoped shared styles for toolbars, content shells, cards, tables, controls, buttons, badges, modals, alerts, empty states, responsive behavior, and print neutrality.

- [ ] **Step 1: Extend the failing CSS contract test**

Assert that `operations-ui.css` defines the required `--ops-bg`, `--ops-card`, `--ops-text`, `--ops-muted`, `--ops-line`, `--ops-nav`, `--ops-accent`, `--ops-success`, `--ops-warning`, and `--ops-danger` variables; scopes component selectors through `.operations-ui`; contains desktop and `max-width: 760px` responsive rules; and contains an `@media print` block that removes only screen chrome without restyling document content.

- [ ] **Step 2: Run the CSS contract and verify failure**

Run: `node --test tests/ui-unification.test.js`

Expected: FAIL because `operations-ui.css` is absent.

- [ ] **Step 3: Implement the scoped stylesheet**

Create `operations-ui.css` with operations-prefixed tokens mirroring the reference screens and selectors rooted at `.operations-ui`. Map the existing `.toolbar`, `.top`, `.app-header`, `.wrap`, `.container`, `.panel`, `.card`, `.table`, native `table`, `.btn`, `.tb-btn`, `.refresh`, `.badge`, `.status`, `.modal*`, input/select/textarea, toast/notice/empty/loading classes without changing DOM behavior. Add `.operations-admin`, `.operations-document`, and `.operations-auth` variants. Ensure all print overrides are confined to hiding screen-only chrome and resetting the page background.

- [ ] **Step 4: Run the CSS contract**

Run: `node --test tests/ui-unification.test.js`

Expected: protected hash assertions pass; target-link assertions still fail until Task 3.

- [ ] **Step 5: Commit the design system**

```powershell
git add -- operations-ui.css tests/ui-unification.test.js
git commit -m "feat: add scoped operations UI design system"
```

### Task 3: Apply the design system to production operations pages

**Files:**
- Modify: `consult.html`, `contacts.html`, `as.html`, `order.html`, `payment.html`, `employees.html`, `worklog.html`, `photos.html`, `schedule.html`, `price-editor.html`
- Modify: `contract.html`, `completion.html`, `notice.html`, `spec.html`, `schedule-view.html`
- Modify: `login.html`, `signup.html`
- Test: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: `operations-ui.css` and its three body variants.
- Produces: stylesheet links and presentation-only body classes on exactly the 17 approved pages.

- [ ] **Step 1: Save functional signatures for all targets in the test**

For every target, assert the exact pre-change arrays of script sources, element IDs, named form controls, inline event-handler attributes, and print media block counts. The only permitted HTML differences are an `operations-ui.css` link, body class additions, and whitespace needed for those additions.

- [ ] **Step 2: Add the stylesheet link and body classes**

Insert `<link rel="stylesheet" href="operations-ui.css">` after existing page styles and set:

```html
<body class="operations-ui operations-admin">
<body class="operations-ui operations-document">
<body class="operations-ui operations-auth">
```

Merge these tokens with any existing body class rather than replacing it. Do not modify script blocks, functional attributes, IDs, form names, links, print markup, or page content.

- [ ] **Step 3: Run the UI boundary tests**

Run: `node --test tests/ui-unification.test.js`

Expected: all tests pass, including protected hashes and functional signatures.

- [ ] **Step 4: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit production page integration**

```powershell
git add -- consult.html contacts.html as.html order.html payment.html employees.html worklog.html photos.html schedule.html price-editor.html contract.html completion.html notice.html spec.html schedule-view.html login.html signup.html tests/ui-unification.test.js
git commit -m "feat: unify production operations page styling"
```

### Task 4: Visual, responsive, and print regression verification

**Files:**
- Modify if a visual defect is found: `operations-ui.css`
- Modify only for presentation-class correction: one or more approved production HTML files
- Test: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: locally served static pages and existing authentication flow.
- Produces: verified desktop/mobile layouts and unchanged print behavior.

- [ ] **Step 1: Start a local static server**

Run a local HTTP server from the repository using an available Node or Python runtime and keep its exact localhost URL.

- [ ] **Step 2: Inspect representative pages at desktop and mobile widths**

Open `login.html`, `consult.html`, `employees.html`, `schedule.html`, `photos.html`, `contract.html`, and `completion.html`. Verify the common palette, spacing, cards, controls, tables, buttons, badges, headers, modals, overflow behavior, visible focus states, and absence of console/resource errors at approximately 1440px and 390px widths.

- [ ] **Step 3: Verify permission and CRUD surfaces without altering production data**

Use existing automated fixtures/stubs to confirm owner/admin/staff visibility, consultation deletion guards, and employee management controls. Do not perform destructive writes against the live database during visual checks.

- [ ] **Step 4: Verify print media**

Open print preview for `contract.html`, `completion.html`, `notice.html`, `spec.html`, and `schedule-view.html`. Confirm that toolbars and screen backgrounds do not print and existing paper content, pagination, and sizing remain unchanged.

- [ ] **Step 5: Fix only scoped visual defects and rerun checks**

Any correction must stay in `operations-ui.css` or presentation-only class attributes. Rerun `npm test` and the protected hash test after each correction.

- [ ] **Step 6: Commit verified visual refinements if needed**

```powershell
git add -- operations-ui.css tests/ui-unification.test.js <approved-production-html-files>
git commit -m "fix: refine responsive operations layouts"
```

### Task 5: Final verification, integration, deployment, and live smoke test

**Files:**
- No application file changes expected.

**Interfaces:**
- Consumes: verified feature-branch commits and repository deployment configuration.
- Produces: updated remote `main`, successful GitHub Pages deployment, and live-site verification evidence.

- [ ] **Step 1: Run completion verification from a clean process**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `git diff --check HEAD~3..HEAD`

Expected: no whitespace errors.

Run the SHA-256 assertions again and inspect `git status --short`; only the pre-existing untracked `.npm-cache/` may remain.

- [ ] **Step 2: Review the complete change set**

Confirm that changed application files are limited to `operations-ui.css`, the 17 approved production pages, and tests/docs. Confirm protected and excluded files are absent from the diff.

- [ ] **Step 3: Complete branch integration**

Use the repository's authorized non-HTTPS GitHub publishing path to push the feature commits and update `main` without rewriting unrelated history. Verify the remote `main` commit contains the implementation commits.

- [ ] **Step 4: Verify GitHub Pages deployment**

Wait for the Pages workflow associated with the new `main` commit to complete successfully. Record the workflow run identifier and deployed commit SHA.

- [ ] **Step 5: Smoke-test the real domain**

Open `https://daham-interior.com/` and representative production URLs. Verify HTTPS, `operations-ui.css` returns successfully, protected dashboard/estimate pages remain visually unchanged, authentication redirection works, and approved operations pages render the new UI without console errors.

- [ ] **Step 6: Report completion**

List all changed production pages, the protected-file hash result, automated and browser test results, final commit SHA, Pages deployment result, and live-site findings.
