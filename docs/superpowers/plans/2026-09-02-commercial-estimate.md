# Commercial Estimate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready commercial interior estimator with the approved 16-category catalog, editable labor/material calculations, commercial-only persistence, live totals, and customer-ready output.

**Architecture:** Keep `estimate-commercial.html` as the application shell while moving the approved price catalog and pure calculations into `commercial-estimate-domain.js`. The page consumes that stable domain API for rendering, overrides, autosave, summary calculations, and printing; commercial project keys remain isolated from residential data. Node tests execute the pure domain module in a VM and inspect the static UI contract.

**Tech Stack:** Static HTML/CSS/JavaScript, browser localStorage, existing Supabase `sync_data` integration, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-02-commercial-estimate-design.md`

## Global Constraints

- Commercial data must remain separate under `daham_commercial_v1` and `daham_commercial_index_v1`.
- Furniture/fixtures and signage categories must not appear.
- Every selected line must expose labor and material separately; expense is reserved for site costs.
- Default material waste is 15% where the spec assigns it, and order-unit rounding happens once after total project quantity is known.
- User overrides must never be overwritten by a later automatic recalculation.
- Existing residential estimate behavior and data must not change.
- Use the existing application authentication and Supabase synchronization pattern; add no dependency.
- Use test-driven development and commit after each independently passing task.

---

### Task 1: Commercial Catalog and Pure Calculation Engine

**Files:**
- Create: `commercial-estimate-domain.js`
- Create: `tests/commercial-estimate-domain.test.js`
- Reference: `docs/superpowers/specs/2026-09-02-commercial-estimate-design.md`

**Interfaces:**
- Consumes: plain line objects and estimate settings, with no DOM dependency.
- Produces: `window.DAHAM_COMMERCIAL_ESTIMATE` and CommonJS-compatible exports containing `CATALOG`, `PYEONG_M2`, `toSquareMeters`, `toPyeong`, `calculateOrderQuantity`, `calculateLine`, `calculateEstimate`, `suggestWasteLoads`, and `validateEstimate`.

- [ ] **Step 1: Write the failing catalog contract test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadDomain() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'commercial-estimate-domain.js'), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.DAHAM_COMMERCIAL_ESTIMATE;
}

test('catalog exposes the approved category order and excludes furniture and signage', () => {
  const { CATALOG } = loadDomain();
  assert.deepEqual(Array.from(CATALOG, x => x.name), [
    '가설·보양','철거·폐기물','설비','전기·조명','냉난방·환기','금속·유리','목공','타일',
    '도장','필름','도배','바닥','문·도어','소방','청소','기타·현장경비'
  ]);
  assert.equal(CATALOG.some(x => /가구|집기|간판/.test(x.name)), false);
});

test('approved high-risk defaults are exact', () => {
  const { CATALOG } = loadDomain();
  const item = id => CATALOG.flatMap(x => x.items).find(x => x.id === id);
  assert.equal(item('carpentry-mdf-panel').materialSheetPrice, 9000);
  assert.equal(item('carpentry-wall-single').studSpacingMm, 300);
  assert.equal(item('tile-floor-pressure').laborUnit, 90000);
  assert.equal(item('tile-floor-pressure').materialUnit, 35000);
  assert.equal(item('electrical-base').totalUnit, 220000);
  assert.equal(item('cleaning-progress').laborUnit, 180000);
  assert.equal(item('cleaning-progress').materialUnit, 50000);
});
```

- [ ] **Step 2: Run the catalog test and verify failure**

Run: `node --test tests/commercial-estimate-domain.test.js`

Expected: FAIL because `commercial-estimate-domain.js` does not exist.

- [ ] **Step 3: Create the catalog and exported API shell**

```js
(function (root) {
  'use strict';
  const PYEONG_M2 = 3.3058;
  const CATALOG = [
    { id: 'temporary', name: '가설·보양', items: [] },
    { id: 'demolition', name: '철거·폐기물', items: [] },
    { id: 'plumbing', name: '설비', items: [] },
    { id: 'electrical', name: '전기·조명', items: [] },
    { id: 'hvac', name: '냉난방·환기', items: [] },
    { id: 'metal-glass', name: '금속·유리', items: [] },
    { id: 'carpentry', name: '목공', items: [] },
    { id: 'tile', name: '타일', items: [] },
    { id: 'paint', name: '도장', items: [] },
    { id: 'film', name: '필름', items: [] },
    { id: 'wallpaper', name: '도배', items: [] },
    { id: 'flooring', name: '바닥', items: [] },
    { id: 'door', name: '문·도어', items: [] },
    { id: 'fire', name: '소방', items: [] },
    { id: 'cleaning', name: '청소', items: [] },
    { id: 'site-cost', name: '기타·현장경비', items: [] }
  ];
  const api = { CATALOG, PYEONG_M2 };
  root.DAHAM_COMMERCIAL_ESTIMATE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

Populate every `items` array with stable IDs and the exact approved units, labor, material, productivity, loss, minimum-charge, warning, and option metadata from the spec. Use separate item IDs for single/double-sided carpentry, every tile size, three-phase ranges, asbestos warning, and customer-visible optional lines.

- [ ] **Step 4: Add failing calculation tests**

```js
test('area conversion and project-level package rounding are stable', () => {
  const d = loadDomain();
  assert.equal(d.toSquareMeters(10), 33.058);
  assert.equal(d.toPyeong(33.058), 10);
  assert.equal(d.calculateOrderQuantity({ areaM2: 33.058, coveragePerPackageM2: 1.44, wasteRate: 0.15 }), 27);
});

test('tile cost shows per-pyeong material while retaining whole-box order quantity', () => {
  const d = loadDomain();
  const result = d.calculateLine({
    id: 'tile-600x600-product', quantity: 10, unit: '평',
    packagePrice: 26000, packageCoverageM2: 1.44, wasteRate: 0.15
  });
  assert.equal(result.orderQuantity, 27);
  assert.equal(result.material, 702000);
  assert.equal(result.labor, 0);
});

test('manual carpenter day adds only the approved labor and 70 percent material', () => {
  const d = loadDomain();
  const result = d.calculateLine({ id: 'carpentry-wall-single', quantity: 10, extraDays: 1 });
  assert.equal(result.extraLabor, 350000);
  assert.equal(result.extraMaterial, 245000);
});

test('minimum labor is applied once per category', () => {
  const d = loadDomain();
  const result = d.calculateEstimate({ lines: [
    { id: 'film-flat', categoryId: 'film', labor: 180000, material: 160000 },
    { id: 'film-door-frame', categoryId: 'film', labor: 120000, material: 100000 }
  ]});
  assert.equal(result.categories.film.labor, 400000);
  assert.equal(result.categories.film.minimumLaborAdjustment, 100000);
});
```

- [ ] **Step 5: Run calculation tests and verify failure**

Run: `node --test tests/commercial-estimate-domain.test.js`

Expected: FAIL because the calculation functions are not defined.

- [ ] **Step 6: Implement pure calculations and validation**

```js
const roundMoney = value => Math.round((Number(value) || 0) / 100) * 100;
const toSquareMeters = pyeong => Number((Number(pyeong || 0) * PYEONG_M2).toFixed(4));
const toPyeong = m2 => Number((Number(m2 || 0) / PYEONG_M2).toFixed(4));
const calculateOrderQuantity = ({ areaM2, coveragePerPackageM2, wasteRate = 0 }) =>
  Math.ceil((Number(areaM2) * (1 + Number(wasteRate))) / Number(coveragePerPackageM2));

function validateEstimate(estimate) {
  const errors = [];
  for (const line of estimate.lines || []) {
    for (const key of ['quantity', 'laborUnit', 'materialUnit', 'expenseUnit']) {
      if (line[key] !== undefined && (!Number.isFinite(Number(line[key])) || Number(line[key]) < 0)) {
        errors.push({ lineId: line.id, field: key, message: '0 이상의 숫자를 입력하세요.' });
      }
    }
  }
  return errors;
}
```

Implement `calculateLine` as a strategy dispatch by catalog calculation type (`simple`, `package`, `productivity`, `carpentry`, `warning-only`) and `calculateEstimate` as category aggregation followed by minimum-labor adjustment. Implement `suggestWasteLoads` by summing the approved demolition coefficients and returning `Math.ceil(weightedLoads)`.

- [ ] **Step 7: Run domain tests**

Run: `node --test tests/commercial-estimate-domain.test.js`

Expected: PASS.

- [ ] **Step 8: Commit the domain engine**

```bash
git add commercial-estimate-domain.js tests/commercial-estimate-domain.test.js
git commit -m "feat: add commercial estimate calculation engine"
```

### Task 2: Commercial Estimator Shell and Accordion UI

**Files:**
- Modify: `estimate-commercial.html`
- Create: `tests/commercial-estimate-ui.test.js`
- Consume: `commercial-estimate-domain.js`

**Interfaces:**
- Consumes: `DAHAM_COMMERCIAL_ESTIMATE.CATALOG` and calculation functions from Task 1.
- Produces: DOM containers `#commercial-categories`, `#commercial-summary`, `#commercial-project-form`, `#commercial-preview`, plus render functions `renderCommercialCategories()`, `renderCommercialLines()`, and `renderCommercialSummary()`.

- [ ] **Step 1: Write the failing structural UI test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'estimate-commercial.html'), 'utf8');

test('commercial estimate uses the new domain catalog and production layout', () => {
  assert.match(html, /commercial-estimate-domain\.js/);
  assert.match(html, /id="commercial-categories"/);
  assert.match(html, /id="commercial-summary"/);
  assert.match(html, /상가 견적서 작성/);
  assert.match(html, /공종별 수량과 단가를 입력하면 인건비와 자재비가 자동 계산됩니다/);
  assert.match(html, /renderCommercialCategories/);
});

test('commercial estimate keeps its isolated persistence keys', () => {
  assert.match(html, /PROJ_DB\s*=\s*['"]daham_commercial_v1['"]/);
  assert.match(html, /PROJ_INDEX_KEY\s*=\s*['"]daham_commercial_index_v1['"]/);
  assert.doesNotMatch(html, /PROJ_DB\s*=\s*['"]daham_projects_v3['"]/);
});
```

- [ ] **Step 2: Run the UI test and verify failure**

Run: `node --test tests/commercial-estimate-ui.test.js`

Expected: FAIL because the new containers and renderer are absent.

- [ ] **Step 3: Replace the copied residential editor with the approved shell**

Add `<script src="commercial-estimate-domain.js"></script>` before the page controller. Build a dark navy sidebar, project header, central accordion, and right live-summary card. Retain existing auth, cloud-sync initialization, project list, and separated commercial keys. Use semantic buttons with `aria-expanded`, keyboard focus styles, and labels for all numeric inputs.

```html
<main class="commercial-shell">
  <section id="commercial-project-form" class="commercial-editor">
    <header class="commercial-heading">
      <h1>상가 견적서 작성</h1>
      <p>공종별 수량과 단가를 입력하면 인건비와 자재비가 자동 계산됩니다</p>
    </header>
    <div class="commercial-project-fields"></div>
    <div id="commercial-categories" class="commercial-categories"></div>
  </section>
  <aside id="commercial-summary" class="commercial-summary" aria-live="polite"></aside>
</main>
```

- [ ] **Step 4: Implement category and line renderers**

```js
function renderCommercialCategories() {
  const host = document.getElementById('commercial-categories');
  host.innerHTML = DAHAM_COMMERCIAL_ESTIMATE.CATALOG.map(category => `
    <section class="commercial-category" data-category-id="${category.id}">
      <button class="commercial-category-toggle" type="button" aria-expanded="false">
        <span>${escapeHtml(category.name)}</span>
        <span class="calc-badge">자동 계산</span><span class="edit-badge">직접 수정 가능</span>
      </button>
      <div class="commercial-category-body" hidden></div>
    </section>`).join('');
}
```

Render each selected item as a row with quantity, unit, labor unit/amount, material unit/amount, optional expense, memo, and automatic-value restore control. On widths below 1100px move the summary above the categories; on phone widths render each row as a labeled card. Preserve the existing print media behavior without horizontal scrolling.

- [ ] **Step 5: Run UI and existing tablet tests**

Run: `node --test tests/commercial-estimate-ui.test.js tests/estimate-tablet-layout.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the application shell**

```bash
git add estimate-commercial.html tests/commercial-estimate-ui.test.js
git commit -m "feat: rebuild commercial estimate editor"
```

### Task 3: Editable Calculations, Autosave, and Project Snapshots

**Files:**
- Modify: `estimate-commercial.html`
- Modify: `tests/commercial-estimate-ui.test.js`
- Modify: `tests/commercial-estimate-domain.test.js`

**Interfaces:**
- Consumes: `calculateLine`, `calculateEstimate`, `validateEstimate`, catalog item IDs.
- Produces: `commercialDraft`, `setCommercialOverride(lineId, field, value)`, `restoreCommercialAutomaticValue(lineId, field)`, `collectCommercialState()`, `applyCommercialState(state)`, `scheduleCommercialSave()`, and saved `catalogSnapshot` per estimate.

- [ ] **Step 1: Add failing persistence and override assertions**

```js
test('commercial editor persists overrides and catalog snapshots without touching residential keys', () => {
  assert.match(html, /function\s+setCommercialOverride/);
  assert.match(html, /function\s+restoreCommercialAutomaticValue/);
  assert.match(html, /catalogSnapshot/);
  assert.match(html, /scheduleCommercialSave/);
  assert.doesNotMatch(html, /localStorage\.setItem\(['"]daham_projects_v3/);
});
```

Add a domain test proving `calculateLine` chooses `overrides.materialUnit` over the catalog value and returns both `automatic.materialUnit` and `applied.materialUnit`.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/commercial-estimate-domain.test.js tests/commercial-estimate-ui.test.js`

Expected: FAIL on missing override and snapshot behavior.

- [ ] **Step 3: Implement draft state and deterministic overrides**

```js
let commercialDraft = {
  id: '', client: {}, areaPyeong: 0, lines: [],
  fees: { managementRate: 0, profitMode: 'rate', profitRate: 15, profitAmount: 0, vatRate: 10 },
  catalogSnapshot: {}, updatedAt: ''
};

function setCommercialOverride(lineId, field, value) {
  const line = commercialDraft.lines.find(row => row.id === lineId);
  line.overrides = { ...(line.overrides || {}), [field]: Number(value) };
  recalculateCommercialEstimate();
  scheduleCommercialSave();
}

function restoreCommercialAutomaticValue(lineId, field) {
  const line = commercialDraft.lines.find(row => row.id === lineId);
  if (line && line.overrides) delete line.overrides[field];
  recalculateCommercialEstimate();
  scheduleCommercialSave();
}
```

Snapshot only catalog records selected by the project. Serialize inputs, overrides, resolved warning states, and calculation settings. Reopening a project must calculate from its snapshot instead of newer global defaults.

- [ ] **Step 4: Wire autosave and cloud synchronization**

Debounce saves at 500ms, update `updatedAt`, persist through the existing `saveDB(projectId)` and `cloudPush(projectId)` pattern, retain the emergency backup behavior, and show saving/saved/failure status. A failed cloud save must leave local data and all form inputs intact.

- [ ] **Step 5: Add validation and professional-warning behavior**

Disable final save when `validateEstimate` reports invalid numeric inputs. Render warning-only rows for asbestos-suspect ceiling tile, structural core approval, licensed fire work, and KEPCO owner scope. Allow these rows to be marked `별도 견적` without inventing a price.

- [ ] **Step 6: Run targeted tests**

Run: `node --test tests/commercial-estimate-domain.test.js tests/commercial-estimate-ui.test.js tests/sync-auth.test.js`

Expected: PASS.

- [ ] **Step 7: Commit state management**

```bash
git add estimate-commercial.html tests/commercial-estimate-domain.test.js tests/commercial-estimate-ui.test.js
git commit -m "feat: persist commercial estimate overrides"
```

### Task 4: Live Summary, Adjustable Profit, and Customer Output

**Files:**
- Modify: `commercial-estimate-domain.js`
- Modify: `estimate-commercial.html`
- Modify: `estimate-summary.html`
- Modify: `estimate-detail.html`
- Modify: `tests/commercial-estimate-domain.test.js`
- Create: `tests/commercial-estimate-print.test.js`

**Interfaces:**
- Consumes: calculated category totals and `fees` from Task 3.
- Produces: `calculateCommercialTotals(costs, fees)`, `buildCommercialPrintData()`, percentage/fixed profit controls, and print payload field `estimateType: 'commercial'`.

- [ ] **Step 1: Write failing fee calculation tests**

```js
test('commercial totals support percentage and fixed profit without exposing it in customer lines', () => {
  const d = loadDomain();
  const percent = d.calculateCommercialTotals(
    { labor: 1000000, material: 500000, expense: 100000 },
    { managementRate: 5, profitMode: 'rate', profitRate: 10, vatRate: 10 }
  );
  assert.deepEqual(percent, {
    labor: 1000000, material: 500000, expense: 100000, subtotal: 1600000,
    management: 80000, profit: 168000, supplyTotal: 1848000, vat: 184800, grandTotal: 2032800
  });
  const fixed = d.calculateCommercialTotals(
    { labor: 1000000, material: 500000, expense: 100000 },
    { managementRate: 5, profitMode: 'fixed', profitAmount: 250000, vatRate: 10 }
  );
  assert.equal(fixed.profit, 250000);
});
```

- [ ] **Step 2: Run the fee test and verify failure**

Run: `node --test tests/commercial-estimate-domain.test.js`

Expected: FAIL because `calculateCommercialTotals` is missing.

- [ ] **Step 3: Implement totals in the domain layer**

```js
function calculateCommercialTotals(costs, fees) {
  const labor = roundMoney(costs.labor);
  const material = roundMoney(costs.material);
  const expense = roundMoney(costs.expense);
  const subtotal = labor + material + expense;
  const management = roundMoney(subtotal * Number(fees.managementRate || 0) / 100);
  const profitBase = subtotal + management;
  const profit = fees.profitMode === 'fixed'
    ? roundMoney(fees.profitAmount)
    : roundMoney(profitBase * Number(fees.profitRate || 0) / 100);
  const supplyTotal = profitBase + profit;
  const vat = roundMoney(supplyTotal * Number(fees.vatRate || 0) / 100);
  return { labor, material, expense, subtotal, management, profit, supplyTotal, vat, grandTotal: supplyTotal + vat };
}
```

- [ ] **Step 4: Add editable summary controls**

The right summary must show labor, material, site expense, management, profit, VAT, and grand total. Profit offers `퍼센트` and `고정금액`; edits affect only the current project unless the manager explicitly saves a default in settings. Use the existing residential default fee values when creating a new commercial estimate.

- [ ] **Step 5: Write and run failing print-contract tests**

```js
test('commercial customer print hides labor, material, and profit internals', () => {
  const summary = read('estimate-summary.html');
  const detail = read('estimate-detail.html');
  assert.match(summary, /estimateType\s*===\s*['"]commercial['"]/);
  assert.match(detail, /estimateType\s*===\s*['"]commercial['"]/);
  assert.match(summary, /customerCategoryTotals/);
  assert.match(detail, /customerCategoryTotals/);
});
```

Run: `node --test tests/commercial-estimate-print.test.js`

Expected: FAIL before the commercial print branch exists.

- [ ] **Step 6: Implement preview and print payload**

`buildCommercialPrintData()` must output project/client metadata, selected category rows, customer category totals with management and profit distributed proportionally, VAT, grand total, notes, and `estimateType: 'commercial'`. It must omit raw labor/material unit prices, minimum-labor adjustments, and the explicit profit line from the customer view while keeping those values in the saved internal project.

- [ ] **Step 7: Run summary and print tests**

Run: `node --test tests/commercial-estimate-domain.test.js tests/commercial-estimate-print.test.js tests/notice-print.test.js`

Expected: PASS.

- [ ] **Step 8: Commit totals and printing**

```bash
git add commercial-estimate-domain.js estimate-commercial.html estimate-summary.html estimate-detail.html tests/commercial-estimate-domain.test.js tests/commercial-estimate-print.test.js
git commit -m "feat: add commercial estimate totals and output"
```

### Task 5: Commercial Default Price Management

**Files:**
- Modify: `price-management.js`
- Modify: `price-editor.html`
- Modify: `estimate-commercial.html`
- Modify: `tests/price-management.test.js`
- Modify: `tests/price-ui.test.js`

**Interfaces:**
- Consumes: stable commercial catalog IDs and existing manager permission checks.
- Produces: commercial settings namespace `commercialEstimateDefaults`, `loadCommercialDefaults()`, `saveCommercialDefaults(changes)`, and estimate-local snapshot creation.

- [ ] **Step 1: Add failing settings tests**

```js
test('price management stores commercial defaults in a dedicated namespace', () => {
  const source = read('price-management.js');
  assert.match(source, /commercialEstimateDefaults/);
  assert.match(source, /loadCommercialDefaults/);
  assert.match(source, /saveCommercialDefaults/);
});

test('price editor exposes commercial defaults only to authorized managers', () => {
  const html = read('price-editor.html');
  assert.match(html, /상가 견적 기본단가/);
  assert.match(html, /DAHAM_PRICES\.canManage/);
  assert.match(html, /commercialEstimateDefaults/);
});
```

- [ ] **Step 2: Run price tests and verify failure**

Run: `node --test tests/price-management.test.js tests/price-ui.test.js`

Expected: FAIL on missing commercial settings APIs and UI.

- [ ] **Step 3: Implement commercial defaults with existing authorization**

Store changes under the existing protected settings document as `commercialEstimateDefaults: { [itemId]: { laborUnit, materialUnit, expenseUnit, packagePrice, productivity } }`. Reuse `DAHAM_PRICES.canManage`; staff may view effective estimate prices but cannot change organization defaults. Reject unknown item IDs and negative/non-finite values before persistence.

- [ ] **Step 4: Add the commercial settings section**

Render grouped accordions in the same 16-category order. Each row shows original default, organization default, and a reset control. Saving defaults must not mutate already-saved project snapshots; new projects copy the latest effective values.

- [ ] **Step 5: Run price and security tests**

Run: `node --test tests/price-management.test.js tests/price-ui.test.js tests/security-regression.test.js tests/database-permissions.test.js`

Expected: PASS.

- [ ] **Step 6: Commit default price management**

```bash
git add price-management.js price-editor.html estimate-commercial.html tests/price-management.test.js tests/price-ui.test.js
git commit -m "feat: manage commercial estimate defaults"
```

### Task 6: Regression, Responsive QA, and Release Readiness

**Files:**
- Modify: `tests/pages.test.js`
- Modify: `tests/estimate-tablet-layout.test.js`
- Modify: `tests/commercial-estimate-ui.test.js`
- Modify: `estimate-commercial.html` only for defects found by the tests.

**Interfaces:**
- Consumes: the complete commercial estimator.
- Produces: regression evidence for all static pages, estimator calculations, responsive layout, separated data, and print output.

- [ ] **Step 1: Extend page and responsive assertions**

```js
test('commercial estimate remains usable on desktop, tablet, and phone layouts', () => {
  assert.match(html, /@media[^}]*max-width:\s*1100px[\s\S]*\.commercial-shell/);
  assert.match(html, /@media[^}]*max-width:\s*767px[\s\S]*\.commercial-line/);
  assert.match(html, /@media\s+print[\s\S]*\.commercial-summary/);
  assert.doesNotMatch(html, /overflow-x:\s*auto[^}]*commercial-shell/);
});
```

Add page smoke assertions that `estimate-commercial.html`, `commercial-estimate-domain.js`, `estimate-summary.html`, and `estimate-detail.html` exist and do not reference missing local assets.

- [ ] **Step 2: Run the entire test suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 3: Perform deterministic browser smoke checks**

Serve the repository locally, open `estimate-commercial.html`, create a 30평 sample, select at least one line from all 16 categories, verify live labor/material/expense totals, switch profit between percentage and fixed amount, save, reload, preview, and print. Confirm that a residential estimate remains unchanged and that no furniture/fixtures or signage category appears.

- [ ] **Step 4: Check repository state and diff**

Run: `git status --short` and `git diff --check HEAD~5..HEAD`

Expected: only intended files are changed; `git diff --check` prints no whitespace errors.

- [ ] **Step 5: Commit final QA adjustments**

```bash
git add estimate-commercial.html tests/pages.test.js tests/estimate-tablet-layout.test.js tests/commercial-estimate-ui.test.js
git commit -m "test: verify commercial estimate workflow"
```

