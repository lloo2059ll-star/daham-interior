# Gumi Guide Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Help people compare verified Gumi apartment projects and reach relevant cases or consultation.
**Architecture:** Extend existing static guide at the same URL; scoped CSS and contextual static links from five existing cases. Preserve homepage and enquiry code.
**Tech Stack:** Static HTML/CSS, Node built-in tests, browser UI QA.
**Spec:** docs/superpowers/specs/2026-11-04-gumi-guide-comparison.md

## Global Constraints
- Only verified project facts/photos. No prices, fabricated customer quotes, licences or ranking guarantees.
- No hours, Today’sHouse, Instagram, ERP, inquiry behavior or hero changes.
- Keep canonical/H1 and attribution; accurate sitemap dates only for changed documents.

## Review Focus
- Mobile table/card width and keyboard navigation.
- Actual38평 Bonggok despite legacy36slug.
- Case periods are historical, not guarantees.
- New guide links work without JS and preserve existing galleries.
- Metadata matches genuine expanded guide, not homepage keyword duplication.

### Task 1: Implement approved comparison guide and routes
- [x] Update existing metadata contract for32–51coverage; add meaningful navigation/link/image accessibility coverage and see it fail.
- [x] Rewrite gumi-apartment-interior.html with six real cases, scoped comparison table/cards, preparation and process.
- [x] Extend interior-guides.css for readable table/mobile anchors/cards.
- [x] Add one contextual guide link to each of five featured case pages; keep gallery/layout otherwise intact.
- [x] Update only changed six HTML sitemap dates.
- [x] Run relevant tests, complete suite, static link/assets check and390/desktop browser QA.
- [ ] Independent branch review; fix findings; commit/push/PR/merge and verify deployment and public rendering.
- [ ] Request collection of the substantially updated guide only if not already requested; never call request acceptance indexed/recovered.

## Ledger
- Existing linked worktree reused; branch codex/gumi-guide-comparison-20261104 from origin/main e41ac97. Main checkout dirty and excluded.
- Baseline long Windows path made image decoder process fail (null status); mapped existing worktree toQ: without source changes, all478 tests pass.
- Prior proposed comparison of ten standalone homepages revised to honest observed-content sample and accessible primary-site benchmarks because SERP surface did not expose ten standalone homepages.

- Completed six-case source fact comparison; headline shows32–51 because actual content expanded, not daily keyword churn.
- 479tests pass; mobile/desktop have no page overflow; guide→case→guide and inquiry source preserve expected behavior. Independent review found no critical/important issues.
- Public deployment and collection acknowledgement still pending at commit time.
