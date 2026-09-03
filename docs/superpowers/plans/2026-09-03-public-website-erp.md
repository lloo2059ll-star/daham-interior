# Public Website ERP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public DAHAM homepage matching the approved mockup, expose only explicitly public portfolio data, and automatically append website estimate inquiries into the existing ERP consultation dataset.

**Architecture:** Keep ERP internal data in `sync_data` protected by authenticated RLS. Add two purpose-built public-facing tables: one read-only published portfolio table and one insert-only inquiry table. An internal private trigger converts each accepted inquiry into the existing `daham_consult_v1` JSON consultation record atomically. A separate authenticated website admin page copies only safe project fields into public portfolio rows.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Supabase JS v2, PostgreSQL 17/RLS.

**Spec:** `docs/superpowers/specs/2026-09-03-public-website-erp-design.md`

## Global Constraints

- Public visitors never load or enter the ERP UI.
- `sync_data` remains unavailable to `anon`.
- Never expose a service-role or secret key in browser code.
- Public portfolio records never contain client name, client phone, estimate, cost, margin, or settlement data.
- Website inquiry success is shown only if the DB insert and ERP trigger both succeed.
- Keep the approved minimal white/beige website visual structure.

---

### Task 1: Public-domain and admin-domain tests

**Files:**
- Create: `tests/website-public-domain.test.js`
- Create: `tests/website-admin-domain.test.js`
- Create: `website-public-domain.js`
- Create: `website-admin-domain.js`

**Interfaces:**
- `DAHAM_WEBSITE_PUBLIC.normalizePhone(value) -> string`
- `DAHAM_WEBSITE_PUBLIC.buildInquiryPayload(values) -> object`
- `DAHAM_WEBSITE_PUBLIC.normalizePortfolioRow(row) -> object`
- `DAHAM_WEBSITE_PUBLIC.safeImageUrl(value) -> string`
- `DAHAM_WEBSITE_ADMIN.extractProjectPublicMeta(detail) -> object`
- `DAHAM_WEBSITE_ADMIN.buildPortfolioRecord(projectMeta, values) -> object`
- `DAHAM_WEBSITE_ADMIN.slugify(value) -> string`

- [ ] Write tests proving inquiry payload validation, phone normalization, image URL filtering, and safe portfolio projection.
- [ ] Run the tests and verify they fail because the domain modules do not exist.
- [ ] Implement the minimal UMD modules.
- [ ] Run the tests and verify they pass.

### Task 2: Database migration and security test

**Files:**
- Create: `tests/website-db-security.test.js`
- Create: `supabase/migrations/20260903143000_public_website_erp.sql`
- Create: `supabase/tests/website_public_security.sql`

**Interfaces:**
- Table `public.website_portfolio`
- Table `public.website_inquiries`
- Trigger function `private.import_website_inquiry_to_consult()`
- Trigger `website_inquiry_to_consult`

- [ ] Write a static migration test that requires RLS on both tables, explicit revoke/grant statements, anon published-only portfolio select, anon inquiry insert-only, active-staff management policies, a private `SECURITY DEFINER` trigger function with empty search path, direct execute revoke, and an update to `daham_consult_v1`.
- [ ] Run the static test and verify it fails because the migration does not exist.
- [ ] Implement the migration with validation constraints and atomic `SELECT ... FOR UPDATE` JSON append.
- [ ] Add a rollback integration SQL script that checks anon public-read/insert-only boundaries and verifies an inquiry is appended to `daham_consult_v1`.
- [ ] Re-run the static test and verify it passes.

### Task 3: Approved public homepage

**Files:**
- Create: `website.html`

**Interfaces:**
- Reads `website_portfolio` using the publishable browser key.
- Inserts into `website_inquiries` using the publishable browser key.
- Uses `website-public-domain.js` for input normalization.

- [ ] Build the header, hero, four trust points, portfolio grid, six-step process, four-column footer, and inquiry modal matching the approved mockup.
- [ ] Render only published portfolio rows returned by RLS.
- [ ] Keep graceful placeholder cards if no portfolio rows exist.
- [ ] Submit the inquiry form without navigation to ERP and show success/failure state in-place.
- [ ] Add responsive rules for mobile/tablet.

### Task 4: ERP-side website publishing admin

**Files:**
- Create: `website-admin.html`

**Interfaces:**
- Uses `auth.js` and authenticated Supabase session.
- Reads `daham_proj_index_v1` and each `daham_detail_v2___<id>` record from `sync_data`.
- Upserts only safe fields into `website_portfolio`.

- [ ] Load the authenticated profile/session through `DAHAM_AUTH.ready`.
- [ ] Load project index/details and map them through `extractProjectPublicMeta`.
- [ ] Show existing publish status and a public-edit form.
- [ ] Save title, location, area, style, summary, image URL, order, and publication state only.
- [ ] Support unpublish without deleting the underlying ERP project.

### Task 5: Verification and handoff

- [ ] Run `node --test tests/website-public-domain.test.js tests/website-admin-domain.test.js tests/website-db-security.test.js`.
- [ ] Run the repository test suite when available in CI with `node --test tests/*.test.js`.
- [ ] Review Supabase security/performance advisors after applying the migration to a database.
- [ ] Compare the feature branch to `main` and verify no internal data/auth behavior was loosened.
