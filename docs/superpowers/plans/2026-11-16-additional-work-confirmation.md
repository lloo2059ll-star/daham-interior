# Additional Work Confirmation Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Work only in the isolated feature checkout and do not request permission for already-authorized document creation.

**Goal:** Add a blank, editable, printable additional-work confirmation form to the existing Daham ERP.

**Architecture:** Pure UMD domain module renders escaped document HTML and calculates won totals. The authenticated document page provides inputs, preview, explicit per-user browser drafts, and print actions. ERP receives links; backend and financial records are untouched.

**Tech Stack:** Existing vanilla HTML/CSS/JS, Node built-in tests, browser print, existing auth.js.

**Spec:** docs/superpowers/specs/2026-11-16-additional-work-confirmation.md

## Global Constraints
- Blank default; no project content, money, date or signature prefilled.
- Minimum 7 printable rows. A4 single page for normal 7-row form; long content may flow without clipping.
- No writes to existing project, contract, payment or backend data.
- Amounts are integer KRW, commas and negative adjustments supported; blank is distinct from zero.
- Draft saving explicitly says this browser/device; separate key per authenticated user.

## Review Focus
- Empty rows and zero totals must not silently replace blanks.
- Invalid amounts must show an error and block populated printing rather than omit money.
- HTML-looking descriptions/names must render as text.
- Blank printing must preserve the live input draft.
- Mobile layout and multi-page printing must remain legible.

### Task 1: Document domain and ERP links
**Files:** Create additional-work-domain.js and tests/additional-work-domain.test.js; modify erp.html.
**Interfaces:** Browser global DAHAM_ADDITIONAL_WORK and CommonJS exports: createBlankDraft(rowCount=7); normalizeDraft(raw); parseAmount(value) returning number or null and throwing for malformed/unsafe values; calculateTotal(items) returning number or null; formatAmount(value) returning localized integer string or ''; renderDocument(draft) returning escaped article.aw-document HTML.
**Draft:** {site:'', customer:'', date:'', vat:'', notes:'', confirmedOn:'', items:[{description:'', amount:''}]}; vat is ''|'included'|'excluded'. Dates are yyyy-mm-dd strings or blank.
- [x] Write and run behavior tests for blanks, zero, grouped/negative amounts, invalid/unsafe money, sums, HTML escaping and non-mutation.
- [x] Implement minimal pure module; verify tests pass.
- [x] Add ERP nav and dashboard card links to additional-work.html.

### Task 2: Editor and print layout
**Files:** Create additional-work.html, additional-work.css, additional-work.js.
**Consumes:** Task 1 domain interface above and existing DAHAM_AUTH.ready/currentUser().
- [x] Build an accessible responsive editor and live document preview with 7 initially blank rows, adding/removing rows, metadata, notes and VAT label selection.
- [x] Include explicit browser-only save/load, new blank form, normal print, blank print that preserves entered values, visible validation errors.
- [x] Render print-only document; A4 margins 14mm, no UI or fixed-height clipping. Preserve dates and zero values accurately.
- [ ] Verify local browser behavior and printed PDF, including mobile and long text. Verify unauthenticated redirect using production auth.js.

### Finish
- [x] Run repository suite and compare against baseline; record pre-existing failures separately.
- [x] Independent code review, fix material findings, verify changed files and UI.
- [ ] Publish the reviewed change through the user's existing repository and verify the live entry point/deployment.

## Baseline
Main c31d3073a3e44e829b2cc34dff90476a7ff214df: 480/482 passing. One history-dependent price test lacks historical object 2d38fac in shallow clone; one existing hash fixture for consult-demo.html is stale. Do not change unrelated application behavior to satisfy those fixtures.


## Verification evidence (2026-11-16)
- Domain behavior tests: 7/7 passing. Focused auth, ERP regression, heading, pricing-history and domain tests: 30/30 passing.
- Full repository suite: 488/489 passing after fetching historical commit 2d38fac. The remaining consult-demo.html byte-hash fixture fails identically on the base commit; neither that page nor its test was changed.
- Independent code review: no actionable feature defects; data isolation, escaping, validation, blank/zero and per-user drafts reviewed.
- Static PDF rendering of the exact document HTML and production CSS with WeasyPrint 70: blank form 1 A4 page, ordinary populated form 1 page, 22-row long form 3 pages. Final notes and both signatures present; total appears once. Document metadata uses simple flex wrapping for portability across renderers.
- Implementer DOM harness exercised explicit save/load, browser storage failure, invalid amounts, blank printing without editing loss, zero amounts and escaped text. Its print function and auth object were test doubles.
- Browser limitations: local Chromium cannot create its required socket; cloud browser disallows local file URLs. No bypass was attempted. Actual browser print dialog timing and responsive screenshots remain unverified; static PDF rendering is not a claim of browser-level verification.
- Existing production ERP was observed redirecting an unauthenticated browser to login.html. New-page publication verification is recorded with the deployment result.
