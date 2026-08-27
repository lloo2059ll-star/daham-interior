# Employee Approval Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add employee signup, approval-gated access, owner-only employee management, and authenticated DAHAM Supabase synchronization without changing existing localStorage business data.

**Architecture:** Keep the static HTML application and make `auth.js` the shared authentication boundary and Supabase access adapter. Add one owner-only management page, update login UI in place, and pass the active user's JWT into existing synchronization clients while preserving all current localStorage keys and merge behavior.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase Auth REST and PostgREST, optional supabase-js CDN already used by pages, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-28-employee-approval-auth-design.md`

## Global Constraints

- Use the existing DAHAM project URL and publishable key from `auth.js`.
- Never add a `service_role` or secret API key to frontend files.
- Do not delete, reset, rename, or migrate existing customer/site localStorage keys or Supabase rows.
- Only active profiles may enter internal pages or access `sync_data`.
- Only `owner` sees or enters employee management; existing RLS remains the final authorization layer.
- Write and run a failing test before each production behavior change.

---

### Task 1: Test Harness and Shared Auth Boundary

**Files:**
- Create: `package.json`
- Create: `tests/helpers/auth-harness.js`
- Create: `tests/auth.test.js`
- Modify: `auth.js`

**Interfaces:**
- Consumes: Supabase Auth REST responses and `profiles` rows.
- Produces: `DAHAM_AUTH.ready`, `createAccount`, `login`, `logout`, `currentUser`, `getAccessToken`, `getSupabaseConfig`, `getAuthHeaders`, `listEmployees`, `updateEmployee`.

- [ ] **Step 1: Write failing authentication behavior tests**

Use `node:test`, `node:assert/strict`, and a VM browser harness. Cover signup session cleanup with approval-pending result, login rejection for inactive/missing profiles, active login success, fresh profile checks on protected pages, role enforcement for employee operations, and preservation of non-auth localStorage keys.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/auth.test.js`

Expected: failures because approval-specific result fields, fresh profile guard, Supabase header helpers, and employee APIs do not exist.

- [ ] **Step 3: Implement the minimal shared auth behavior**

Refactor `auth.js` without introducing a framework. Keep the current storage keys, add a pending message branch, always reload profiles on protected entry, clear only auth keys, expose authenticated headers/config, and implement owner-checked profile list/PATCH methods.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/auth.test.js`

Expected: all authentication tests pass with zero failures.

- [ ] **Step 5: Commit**

Stage only `package.json`, `tests/helpers/auth-harness.js`, `tests/auth.test.js`, and `auth.js`, then commit `feat: enforce employee approval authentication`.

### Task 2: Login Signup UI and Owner Employee Management

**Files:**
- Create: `tests/pages.test.js`
- Modify: `login.html`
- Modify: `signup.html`
- Create: `employees.html`
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1 `DAHAM_AUTH` methods and current-user shape `{ id, name, email, role, isActive }`.
- Produces: login/signup tabs, approval-pending feedback, owner-only employee navigation, and employee profile controls.

- [ ] **Step 1: Write failing page behavior tests**

Load pages in a VM/DOM-light harness and verify the login page can submit name/email/password signup, displays the returned approval-pending message, the employee page redirects non-owners, and owner actions call `updateEmployee` only with `is_active` or `role: staff|admin`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/pages.test.js`

Expected: failures because signup tab and `employees.html` do not exist and the dashboard has no role-gated management link.

- [ ] **Step 3: Implement login and employee management UI**

Add tab controls and signup form to `login.html`, convert `signup.html` to a compatibility redirect, create responsive `employees.html`, and add an initially hidden dashboard link revealed only when `currentUser().role === 'owner'`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/pages.test.js`

Expected: all page tests pass.

- [ ] **Step 5: Commit**

Stage only `tests/pages.test.js`, `login.html`, `signup.html`, `employees.html`, and `index.html`, then commit `feat: add owner employee management`.

### Task 3: Authenticated Existing Supabase Synchronization

**Files:**
- Create: `tests/sync-auth.test.js`
- Modify: `consult.html`
- Modify: `estimate.html`
- Modify: `estimate-commercial.html`
- Modify: `schedule.html`
- Modify: `spec.html`
- Modify: `worklog.html`

**Interfaces:**
- Consumes: `DAHAM_AUTH.ready`, `getAccessToken()`, and `getSupabaseConfig()`.
- Produces: existing `sync_data` operations authenticated with the active employee JWT against the DAHAM project.

- [ ] **Step 1: Write failing synchronization tests**

Execute extracted initialization blocks with a fake Supabase client/fetch and assert that the DAHAM URL/publishable key are used, Authorization is `Bearer <user JWT>`, initialization waits for `DAHAM_AUTH.ready`, and existing localStorage keys remain unchanged.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/sync-auth.test.js`

Expected: failures where clients omit the user JWT, initialize before the auth guard, or point at another project.

- [ ] **Step 3: Implement authenticated synchronization adapters**

Update only client/header initialization. Do not alter save, pull, merge, delete, backup, timestamp, or localStorage logic. Public sharing code that intentionally uses another project remains separate from internal `sync_data` access.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/sync-auth.test.js`

Expected: all synchronization tests pass.

- [ ] **Step 5: Commit**

Stage only the synchronization test and listed pages, then commit `fix: authenticate Supabase data synchronization`.

### Task 4: Whole-Application Security and Regression Verification

**Files:**
- Create: `tests/security-regression.test.js`
- Modify: any listed production file only if a failing regression test exposes a defect.

**Interfaces:**
- Consumes: the completed static application.
- Produces: automated proof of page coverage, key safety, and no destructive data initialization.

- [ ] **Step 1: Write failing whole-application regression tests**

Enumerate HTML pages and verify every internal page loads `auth.js`, `login.html` is the sole public entry, protected content is hidden until auth readiness, no `service_role`/secret key exists, and auth cleanup removes only its two storage keys.

- [ ] **Step 2: Run tests and verify RED if a gap exists**

Run: `node --test tests/security-regression.test.js`

Expected: any uncovered page or security regression fails with the page name and behavior.

- [ ] **Step 3: Make minimal fixes for reported gaps**

Change only the missing guard, safe cleanup, or key usage identified by the test.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: all tests pass with zero failures. Then run `git diff --check`, inspect `git diff --stat HEAD~3`, scan tracked frontend files for secret/service-role patterns, and confirm `git status --short` contains only intended files.

- [ ] **Step 5: Commit final regression coverage and fixes**

Stage only the regression test and any explicitly verified fixes, then commit `test: cover employee auth security regressions`.
