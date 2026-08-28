# Mobile and Tablet Operations Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize production operations pages for 360–1024px viewports while preserving the deployed desktop design, all functional behavior, protected reference files, and printed output.

**Architecture:** Extend the screen-only responsive section of `operations-ui.css` with shared 1024px, 767px, and 430px adapters. Use presentation-only body classes only where existing page class names have different meanings. Preserve every functional DOM hook and use overflow or existing column hiding instead of rebuilding tables.

**Tech Stack:** Static HTML, scoped CSS, vanilla JavaScript, Node.js built-in test runner, in-app Chromium browser, GitHub API and GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-28-mobile-tablet-operations-optimization-design.md`

## Global Constraints

- Keep `index.html`, every `estimate*.html`, `v2-theme.css`, `v2-suite.css`, `v2-suite.js`, `consult-demo.html`, `design-demo.html`, and `index.prototype.html` byte-identical.
- Preserve desktop styling above 1024px.
- Do not change Supabase, authentication, authorization, CRUD, URLs, localStorage keys, data structures, scripts, IDs, names, links, or inline handlers.
- Do not rebuild table or CRUD DOM for mobile.
- Put every new responsive declaration under `@media screen`; do not change print output.
- Preserve the untracked `.npm-cache/` directory.

---

### Task 1: Add responsive contract tests

**Files:**
- Modify: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: `operations-ui.css`, production HTML and existing immutable hash/signature fixtures.
- Produces: regression contracts for breakpoints, touch sizes, overflow containment, modal bounds, long text, hover alternatives, desktop isolation and print neutrality.

- [ ] **Step 1: Write failing responsive CSS tests**

Add tests that require literal `@media screen and (max-width: 1024px)`, `767px`, and `430px` layers; require `min-height: 44px` for interactive controls only inside those layers; require table wrappers to use `overflow-x: auto`; require modals to use `max-height: calc(100dvh - 16px)` with scrollable bodies; require `overflow-wrap: anywhere`; and require a `(hover: none)` rule that reveals hover-dependent actions.

- [ ] **Step 2: Write failing page-adapter tests**

Require presentation classes for the layouts that need targeted adapters: `operations-employees`, `operations-schedule`, `operations-photos`, and `operations-worklog`. Keep existing `operations-price-editor`. Assert the classes are additions to the body and the existing functional signatures remain unchanged.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test tests/ui-unification.test.js`

Expected: FAIL on missing responsive contracts and adapter classes while protected hashes and functional signatures remain green.

- [ ] **Step 4: Commit the test boundary**

```powershell
git add -- tests/ui-unification.test.js
git commit -m "test: define mobile and tablet UI contracts"
```

### Task 2: Implement shared and page-specific responsive adapters

**Files:**
- Modify: `operations-ui.css`
- Modify: `employees.html`, `schedule.html`, `photos.html`, `worklog.html`
- Test: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: existing `.operations-ui`, `.operations-admin`, `.operations-document`, `.operations-auth`, and `.operations-price-editor` scopes.
- Produces: screen-only breakpoint layers and four presentation-only page scopes.

- [ ] **Step 1: Add only the four body adapter classes**

Merge `operations-employees`, `operations-schedule`, `operations-photos`, and `operations-worklog` into the existing body class attributes. Do not alter any other markup or script.

- [ ] **Step 2: Implement the 1024px tablet layer**

Inside `@media screen and (max-width: 1024px)`, constrain content width; allow toolbar, header, filter, and action groups to wrap; set interactive controls to at least 44px; contain table scrolling; bound modals to the dynamic viewport; make modal bodies scroll; allow long text wrapping; and adapt the price-editor grid without changing its table.

- [ ] **Step 3: Implement the 767px small-tablet layer**

Stack title/action areas, convert filter groups to one or two responsive columns, wrap schedule controls, reduce photo/worklog grid columns, keep employee grid rows readable, and make modal footers wrap without hiding buttons.

- [ ] **Step 4: Implement the 430px mobile layer**

Use 10–12px page gutters; allow primary actions to fill available width; preserve existing optional-column hiding; use horizontal scrolling for required table columns and document previews; keep badges and row actions wrapped; and ensure login content fits without page-level horizontal overflow.

- [ ] **Step 5: Add touch alternatives**

Under `@media (hover: none), (pointer: coarse)`, show controls that existing page CSS exposes only on hover and add visible `:active` feedback without changing click handlers.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/ui-unification.test.js`

Expected: all responsive, immutable hash, functional signature and print-neutrality tests pass.

Run: `npm test`

Expected: all authentication, permission, CRUD, Supabase, security and UI tests pass.

- [ ] **Step 7: Commit the implementation**

```powershell
git add -- operations-ui.css employees.html schedule.html photos.html worklog.html
git commit -m "feat: optimize operations UI for mobile and tablet"
```

### Task 3: Browser verification and scoped refinements

**Files:**
- Modify if required: `operations-ui.css`
- Modify only if a presentation scope is missing: approved production HTML
- Test: `tests/ui-unification.test.js`

**Interfaces:**
- Consumes: local static server and the responsive CSS from Task 2.
- Produces: measured layout results at four required mobile/tablet viewports and two desktop viewports.

- [ ] **Step 1: Start the local static site and prepare authenticated-safe visual fixtures**

Serve the repository over localhost. Use read-only page inspection and existing test fixtures; do not perform destructive live CRUD. When authentication redirects block a page, verify the deployed/authenticated surface later and use non-committed local visual snapshots containing the original markup without application script execution.

- [ ] **Step 2: Verify required viewports**

At `390×844`, `430×932`, `768×1024`, and `820×1180`, inspect login plus representative management, table, card-grid, modal and document pages. Measure body `scrollWidth/clientWidth`, touch target dimensions, modal rectangles, overflow containers, toolbar wrapping and console errors. Page-level horizontal overflow must be absent; explicit table/document inner overflow is allowed.

- [ ] **Step 3: Verify desktop stability**

At `1280×720` and `1440×900`, compare representative computed styles and layout rectangles to the pre-responsive implementation. Responsive rules must not match above 1024px.

- [ ] **Step 4: Verify print isolation**

Confirm `operations-ui.css` keeps all responsive rules in screen media and its print block remains declaration-neutral. Re-run print signature tests for contract, completion, notice, spec and schedule-view.

- [ ] **Step 5: Fix each observed defect with RED-GREEN tests**

For every browser defect, add a focused failing CSS contract or structural test, reproduce the failure, apply one scoped CSS correction, and rerun the focused test and affected viewport.

- [ ] **Step 6: Commit verified refinements if present**

```powershell
git add -- operations-ui.css tests/ui-unification.test.js <approved-presentation-only-html-files>
git commit -m "fix: refine responsive operations layouts"
```

### Task 4: Final verification, GitHub integration and Pages deployment

**Files:**
- No application changes expected.

**Interfaces:**
- Consumes: verified feature branch.
- Produces: GitHub API commit on the feature branch, merged `main`, successful Pages run and live-site evidence.

- [ ] **Step 1: Run fresh completion checks**

Run `npm test`, `git diff --check`, protected SHA-256 verification, functional signature verification, and `git status --short`. Expected: zero test failures, no whitespace errors, every protected hash equal to the baseline, and only `.npm-cache/` untracked.

- [ ] **Step 2: Review the final diff boundary**

Confirm protected/excluded files and v2 assets are absent. Application changes must be limited to `operations-ui.css` and approved body class additions; tests/docs are allowed.

- [ ] **Step 3: Publish without HTTPS Git**

Use GitHub Git Data API blobs, tree, commit and ref updates to publish the feature branch. Create or reuse a PR to `main`, merge without rewriting unrelated history, and verify the remote `main` SHA.

- [ ] **Step 4: Verify Pages**

Wait for the Pages workflow whose `head_sha` equals the new `main` merge SHA. Require `status=completed` and `conclusion=success`.

- [ ] **Step 5: Verify the live domain**

Open `https://daham-interior.com` at the four required responsive viewports and a desktop viewport. Verify HTTPS, the new CSS response, login responsiveness, unauthenticated internal-page redirect, no console errors, and protected reference file stability from the deployed commit tree.

- [ ] **Step 6: Report evidence**

List changed files, viewport results, test counts, protected hash outcome, feature/main SHAs, PR, Pages run and live-site findings.
