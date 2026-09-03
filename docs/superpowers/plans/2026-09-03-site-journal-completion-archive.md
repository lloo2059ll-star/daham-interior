# Site Journal Completion Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store site-journal originals outside ERP JSON data and generate a verified PDF/ZIP completion archive that can be viewed and downloaded from the project.

**Architecture:** Add normalized journal/photo/archive tables and private Storage buckets beside the legacy `sync_data` flow. A focused browser client handles journal CRUD and resumable uploads, while an authenticated server job creates immutable completion artifacts and records checksums. Rollout uses dual-read migration so estimates, schedules, payments, and existing journal data remain available throughout.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase Auth, Postgres/RLS, Supabase Storage, Supabase Edge Functions, Node test runner

**Spec:** `docs/superpowers/specs/2026-09-03-site-journal-completion-archive-design.md`

## Global Constraints

- Never store image binary or Base64 data in `sync_data` or `localStorage`.
- Keep all original and archive buckets private and issue short-lived signed URLs.
- Preserve originals until an archive reaches `ready` and passes count, byte-size, and SHA-256 verification.
- Limit originals to 25MB each, 20 per journal, and 3 concurrent uploads.
- Isolate journal/photo failures from every legacy ERP `sync_data` save.
- Use RLS with company membership and active-user checks; never expose a service-role key in the browser.

---

### Task 1: Normalized database and private Storage foundation

**Files:**
- Create: `supabase/migrations/<generated>_site_journal_storage.sql`
- Create: `supabase/tests/site_journal_storage_security.sql`
- Modify: `tests/database-permissions.test.js`

**Interfaces:**
- Produces: `site_journals`, `site_journal_photos`, `completion_archives`; private buckets `site-journal-originals`, `site-journal-thumbnails`, `completion-archives`.
- Produces: RLS policies requiring an active profile in the same company.

- [ ] **Step 1: Create the migration through `supabase migration new site_journal_storage`.**
- [ ] **Step 2: Add a failing source-contract test asserting all three tables, indexes, bucket declarations, and RLS policies exist.**
- [ ] **Step 3: Run `node --test tests/database-permissions.test.js` and confirm the new assertions fail because the migration is empty.**
- [ ] **Step 4: Define the tables and constraints from the spec, including `version > 0`, allowed photo/archive states, positive byte sizes, foreign keys, and partial indexes for active rows.**
- [ ] **Step 5: Insert the three private buckets with `public = false` and a 25MB object limit for originals.**
- [ ] **Step 6: Add explicit grants plus SELECT/INSERT/UPDATE/DELETE RLS policies that combine `company_id` membership, active profile status, and operation-specific roles. Add matching `storage.objects` policies scoped by bucket and first path segment.**
- [ ] **Step 7: Add SQL integration cases proving staff can access their company project but cannot cross company boundaries, and only owner/admin can generate or delete archives.**
- [ ] **Step 8: Run the Node migration tests and, when a linked database is available, run the SQL security test inside a transaction that rolls back.**
- [ ] **Step 9: Commit migration and tests with `feat: add secure site journal storage schema`.**

### Task 2: Journal domain and API client

**Files:**
- Create: `site-journal-domain.js`
- Create: `site-journal-client.js`
- Create: `tests/site-journal-domain.test.js`
- Create: `tests/site-journal-client.test.js`
- Modify: `worklog.html`

**Interfaces:**
- Produces: `DAHAM_SITE_JOURNAL.validateDraft(draft)`, `validatePhoto(file)`, `buildObjectPath(input)`, `mergePage(rows)`.
- Produces: `DAHAM_SITE_JOURNAL_CLIENT.list(options)`, `save(draft, expectedVersion)`, `remove(id)`, `listPhotos(journalId)`.

- [ ] **Step 1: Write failing domain tests for blank content, allowed visit types, 25MB file limit, MIME allowlist, 20-photo limit, immutable UUID paths, and duplicate page merging.**
- [ ] **Step 2: Run `node --test tests/site-journal-domain.test.js` and confirm exports are missing.**
- [ ] **Step 3: Implement pure validation and normalization functions without browser or Supabase dependencies.**
- [ ] **Step 4: Write failing client tests for company/project pagination, version-conflict detection, soft deletion, and authenticated photo metadata reads.**
- [ ] **Step 5: Implement the client using the existing authenticated Supabase configuration, selecting explicit columns and ordering by `work_date desc, created_at desc`.**
- [ ] **Step 6: Load both scripts before the inline legacy script in `worklog.html`; keep the old renderer available behind a migration fallback.**
- [ ] **Step 7: Run both focused test files and then `npm test`.**
- [ ] **Step 8: Commit with `feat: add normalized site journal client`.**

### Task 3: Reliable original-photo upload pipeline

**Files:**
- Create: `site-journal-upload.js`
- Create: `tests/site-journal-upload.test.js`
- Modify: `worklog.html`

**Interfaces:**
- Produces: `createUploadQueue({ concurrency: 3, uploadStandard, uploadResumable, saveMetadata })`.
- Produces job states `{ id, file, status, progress, errorCode, attempts }` with `start`, `cancel`, and `retry` operations.

- [ ] **Step 1: Write failing tests proving no more than three uploads run, files over 6MB choose resumable upload, one failure does not cancel siblings, and retry touches only failed jobs.**
- [ ] **Step 2: Add tests proving the queue passes `File`/`Blob` directly and never calls `FileReader.readAsDataURL`.**
- [ ] **Step 3: Run `node --test tests/site-journal-upload.test.js` and confirm the queue is missing.**
- [ ] **Step 4: Implement the queue, cancellation, progress events, unique object paths, and metadata persistence after Storage success.**
- [ ] **Step 5: Add cleanup logic that removes an uploaded object only when its metadata insert fails; record cleanup failures for the reconciliation job.**
- [ ] **Step 6: Replace the Base64 photo path in `worklog.html` with upload jobs, progress rows, per-file retry, and thumbnail rendering. Keep text drafts in bounded local storage without image data.**
- [ ] **Step 7: Run upload, page, and full tests.**
- [ ] **Step 8: Commit with `feat: upload site journal originals safely`.**

### Task 4: Legacy Base64 migration with verified dual reads

**Files:**
- Create: `site-journal-migration.js`
- Create: `tests/site-journal-migration.test.js`
- Modify: `worklog.html`

**Interfaces:**
- Produces: `migrateLegacyRecords(records, adapters)` returning `{ migrated, skipped, failed, cursor }`.
- Consumes the Task 2 client and Task 3 upload queue.

- [ ] **Step 1: Write failing tests for resumable cursor storage, idempotent reruns, decoded byte hashing, duplicate avoidance, and preservation of a legacy record when any verification fails.**
- [ ] **Step 2: Run the migration test and confirm the migration function is missing.**
- [ ] **Step 3: Implement batches of at most 10 journals, upload each decoded image once, compare byte count/checksum, and write normalized rows only after verification.**
- [ ] **Step 4: Implement dual read that prefers normalized rows and includes unmigrated legacy records without duplicates.**
- [ ] **Step 5: Add an owner/admin migration status panel showing counts and retryable failures; do not automatically erase `daham_worklog_v1`.**
- [ ] **Step 6: Run migration and full tests against fixtures containing partial and corrupted Base64 data.**
- [ ] **Step 7: Commit with `feat: migrate legacy journal photos safely`.**

### Task 5: Completion PDF/ZIP archive worker

**Files:**
- Create: `supabase/functions/create-completion-archive/index.ts`
- Create: `completion-archive-domain.js`
- Create: `tests/completion-archive-domain.test.js`
- Create: `tests/completion-archive-worker.test.js`

**Interfaces:**
- Produces: authenticated function input `{ projectId, idempotencyKey }` and output `{ archiveId, status }`.
- Produces: manifest entries `{ journalId, photoId, storagePath, originalName, mimeType, byteSize, sha256 }`.

- [ ] **Step 1: Write failing domain tests for deterministic date/trade folder names, safe filenames, manifest ordering, count/byte verification, and mismatch rejection.**
- [ ] **Step 2: Write failing worker contract tests for active membership, owner/admin authorization, idempotent duplicate requests, checkpoint recovery, and original preservation on failure.**
- [ ] **Step 3: Run both test files and confirm the domain/worker contracts are absent.**
- [ ] **Step 4: Implement snapshot creation in a transaction and return an existing queued/processing archive for the same idempotency key.**
- [ ] **Step 5: Stream originals from Storage into a ZIP without loading the entire archive into memory; build the PDF from journal text plus bounded thumbnails.**
- [ ] **Step 6: Add `manifest.json`, compute ZIP checksum, verify file count and source bytes, upload PDF/ZIP under the immutable archive ID, and only then mark `ready`.**
- [ ] **Step 7: On failure, persist a safe error code and checkpoint, leave originals untouched, and make the request retryable.**
- [ ] **Step 8: Run worker fixtures for zero photos, HEIC originals, a missing object, interrupted processing, and a successful multi-date archive.**
- [ ] **Step 9: Commit with `feat: generate verified completion archives`.**

### Task 6: Approved archive creation and viewer UI

**Files:**
- Create: `completion-archive-client.js`
- Create: `tests/completion-archive-ui.test.js`
- Modify: `worklog.html`
- Modify: `operations-ui.css`

**Interfaces:**
- Produces: `DAHAM_COMPLETION_ARCHIVE.create(projectId)`, `get(projectId)`, `createSignedDownload(archiveId, type)`.
- Consumes Task 5 archive states `queued`, `processing`, `ready`, `failed`.

- [ ] **Step 1: Write failing UI contract tests for the approved four-step progress screen, summary counts, safety notice, failure/retry state, and disabled downloads before `ready`.**
- [ ] **Step 2: Add failing tests for the archive viewer navigation, integrity badge, journal/PDF preview, search, and signed `PDF 보기`/`ZIP 다운로드` actions.**
- [ ] **Step 3: Run `node --test tests/completion-archive-ui.test.js` and confirm the approved landmarks are missing.**
- [ ] **Step 4: Implement the creation modal and polling with bounded backoff; closing the browser must not cancel the server job.**
- [ ] **Step 5: Implement the viewer using paginated journal metadata and thumbnail URLs; never fetch an original until the user explicitly opens or downloads it.**
- [ ] **Step 6: Add responsive layouts matching the approved desktop mockups and preserving current mobile journal creation.**
- [ ] **Step 7: Run focused tests, `npm test`, `git diff --check`, and a signed-in browser smoke test covering create, retry, PDF view, ZIP download, and another ERP page load.**
- [ ] **Step 8: Commit with `feat: add completion archive workflow`.**

### Task 7: Monitoring, reconciliation, and rollout guardrails

**Files:**
- Create: `supabase/functions/reconcile-site-journal-storage/index.ts`
- Create: `tests/site-journal-reconciliation.test.js`
- Modify: `worklog.html`

**Interfaces:**
- Produces reconciliation results `{ checked, orphaned, missing, checksumMismatch, repaired }`.
- Consumes journal photo and completion archive metadata from Tasks 1–6.

- [ ] **Step 1: Write failing tests that identify orphan Storage objects, missing objects, checksum mismatches, stale uploads, and archives stuck in processing.**
- [ ] **Step 2: Run the focused test and confirm reconciliation is missing.**
- [ ] **Step 3: Implement read-only detection first, with report rows and no automatic deletion.**
- [ ] **Step 4: Add safe repairs for stale statuses and retryable archives; keep destructive cleanup behind owner confirmation and an audit record.**
- [ ] **Step 5: Add capacity warnings at 70%, 85%, and 95%, plus a small admin health panel that does not load during ordinary ERP startup.**
- [ ] **Step 6: Run reconciliation tests, database security tests, `npm test`, and `git diff --check`.**
- [ ] **Step 7: Verify a 10,000-photo fixture does not add image requests to dashboard, estimate, schedule, or payment pages.**
- [ ] **Step 8: Commit with `feat: monitor site journal storage health`.**

