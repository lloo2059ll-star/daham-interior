# Schedule Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the production schedule UI to match the approved DAHAM mockup without changing schedule-domain or persistence behavior.

**Architecture:** Keep existing state, domain, storage, and Supabase functions in `schedule.html`; replace the page shell and rendering adapters with a mockup-aligned navigation shell, project-card strip, monthly calendar, editor drawer, and responsive agenda. Reconnect existing handlers through stable IDs and delegated `data-action` controls.

**Tech Stack:** Static HTML/CSS/JavaScript, Node `node:test`, Supabase browser client, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-29-schedule-visual-redesign-design.md`

## Global Constraints

- Preserve `schedule-domain.js`, `schedule-holidays.js`, stable IDs, existing storage keys, Supabase synchronization, and authorization.
- Do not add manual project creation or mutate operating data during visual verification.
- Keep desktop/tablet monthly calendar and existing mobile agenda.
- Zero page-level horizontal overflow at all six required viewports.

---

### Task 1: Add UI behavior contract tests

**Files:**
- Create: `tests/schedule-ui.test.js`
- Read: `schedule.html`

**Interfaces:**
- Consumes: production `schedule.html` and its real DOM contract.
- Produces: executable assertions for the new shell, project editor, action hooks, responsive behavior, and protected module references.

- [ ] **Step 1: Write failing tests**

Use `node:test` to load the HTML and assert consumer-visible structure: product navigation landmark, schedule active item, title/subtitle, project-card viewport, calendar card/header, legend, project editor drawer, General/Import/Today actions, existing task/phase modal IDs, mobile agenda, and unchanged domain/holiday script references. Add CSS contract assertions for 44px controls, tablet compact navigation, mobile agenda, and absence of `html/body overflow-x:hidden` masking.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/schedule-ui.test.js`

Expected: FAIL because the mockup-aligned shell and drawer do not exist.

### Task 2: Rebuild shell and reconnect project editing

**Files:**
- Modify: `schedule.html`
- Test: `tests/schedule-ui.test.js`

**Interfaces:**
- Consumes: existing `currentId`, `openProject`, `onInfoInput`, `setProjectColor`, and project persistence functions.
- Produces: `#app-sidebar`, `#schedule-workspace`, `#site-card-viewport`, `#project-drawer`, `openProjectDrawer(id)`, and `closeProjectDrawer()`.

- [ ] **Step 1: Replace the old project-filter sidebar and always-open info panel**

Create the fixed navy DAHAM navigation, mockup title/action header, horizontal project-card viewport, calendar card, legend, and hidden project editor drawer. Move the existing project input IDs into the drawer so persistence code keeps its real controls.

- [ ] **Step 2: Update project-card rendering**

Render name, status, period, progress, color, and Edit only. Add selected styling and separate `data-action="select-project"` and `data-action="edit-project"` controls.

- [ ] **Step 3: Reconnect drawer behavior**

Populate existing fields when editing, preserve color/save/delete handlers, close by button/backdrop/Escape, and avoid duplicate action firing.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/schedule-ui.test.js`

Expected: PASS.

### Task 3: Recompose calendar and event rendering

**Files:**
- Modify: `schedule.html`
- Test: `tests/schedule-ui.test.js`, `tests/schedule-domain.test.js`

**Interfaces:**
- Consumes: existing `renderCalendar`, `renderMonth`, `shiftCal`, `showAllCalendar`, `goToProjectTask`, holiday lookup, and general-event editor.
- Produces: mockup-aligned calendar toolbar, connected `.schedule-bar` segments, neutral `.general-chip` events, and `#schedule-legend`.

- [ ] **Step 1: Add failing calendar behavior assertions**

Assert the production calendar exposes the All Sites, holiday/weekend toggles, centered month label, connected-bar and general-chip classes, and legend hook.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/schedule-ui.test.js`.

- [ ] **Step 3: Implement the calendar adapter**

Keep existing date segmentation and IDs, update bar markup/labels/styles, add neutral general chips and dynamic legend, and connect toolbar actions to existing month/today/all-sites behavior.

- [ ] **Step 4: Verify GREEN and domain regression**

Run: `node --test tests/schedule-ui.test.js tests/schedule-domain.test.js`.

Expected: all pass.

### Task 4: Responsive and modal/drawer hardening

**Files:**
- Modify: `schedule.html`
- Test: `tests/schedule-ui.test.js`

**Interfaces:**
- Consumes: new shell and existing modal IDs.
- Produces: full desktop shell, compact tablet rail, mobile agenda, internal card overflow, and 44px touch controls.

- [ ] **Step 1: Add failing responsive assertions**

Assert tablet breakpoints cover 768–1024px, mobile breakpoint preserves agenda, controls are at least 44px, flexible children use `min-width:0`, and page overflow is not hidden.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/schedule-ui.test.js`.

- [ ] **Step 3: Implement responsive CSS**

Use full navigation at desktop, icon/compact rail on tablet, grid or internal card-track scrolling, flexible calendar columns, modal/drawer max-height with internal scrolling, and agenda on mobile.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/schedule-ui.test.js`.

### Task 5: Full automated and logged-in browser verification

**Files:**
- Modify if defects are found: `schedule.html`, `tests/schedule-ui.test.js`

**Interfaces:**
- Consumes: complete production UI.
- Produces: fresh automated, visual, responsive, interaction, and console evidence.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`.

Expected: zero failures.

- [ ] **Step 2: Verify six viewports in the logged-in browser**

At 1440×900, 1024×768, 820×1180, 768×1024, 390×844, and 430×932 record `scrollWidth/clientWidth`, visible monthly/agenda mode, controls, cards, and console errors.

- [ ] **Step 3: Exercise real UI connections without persistent destructive changes**

Open project editor, phase candidates, construction/general event editors, month movement, Today, card selection, color UI, conflict UI where existing data exposes it, and verify cloud-sync status. Do not submit operating-data mutations.

- [ ] **Step 4: Compare screenshots with the approved mockup**

Compare desktop and tablet screenshots for sidebar, header, card strip, calendar dominance, bars, spacing, color, and density. Iterate through a new RED/GREEN test for every defect found.

### Task 6: Commit, publish, and verify production

**Files:**
- Commit only confirmed schedule UI, tests, spec, and plan paths.

**Interfaces:**
- Consumes: verified branch state.
- Produces: merged main commit and verified GitHub Pages production page.

- [ ] **Step 1: Inspect the final diff and protected hashes**

Run: `git status --short`, `git diff --check`, and SHA-256 for `schedule-domain.js` and `schedule-holidays.js` against the recorded pre-change values.

- [ ] **Step 2: Run fresh final verification**

Run: `npm test` and repeat essential production browser measurements.

- [ ] **Step 3: Commit only intended paths**

Use explicit `git add -- <paths>` and commit the implementation.

- [ ] **Step 4: Publish without HTTPS git transport**

Use the GitHub API to create/update a feature branch, open a non-draft PR, merge to main, and verify the resulting main SHA and Pages deployment.

- [ ] **Step 5: Reopen production `schedule.html`**

Verify the new cards and large monthly calendar, six viewport overflow, cloud-sync indicator, and fatal console errors on the deployed URL.

