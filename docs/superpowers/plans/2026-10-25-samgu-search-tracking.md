# Samgu search and measurement parity implementation plan

Spec: docs/superpowers/specs/2026-09-11-naver-search-growth.md. Continuation requested by user on 2026-10-25.

Goal: repair missing measurement and crawl navigation on the already published 51평 case, preserving its verified facts, photographs and visual design. Complete reciprocal linking from the existing official blog post.

Task 1: Add regression coverage for the actual case page loading analytics in dependency order and emitting inquiry_click rather than generate_lead for its consultation link. Verify missing integration fails, add existing shared scripts and attributed CTA, verify green.

Task 2: Add a three-level breadcrumb matching canonical home, portfolio and case; lazy load gallery photos while retaining an eager cover. Validate structured JSON and photo URL preservation.

Task 3: Review, run relevant tests, publish the minimal reviewed change and verify the public HTML. Preserve existing blog text/photos and append a short case link and explicitly attributed consultation link. Verify saved public blog links; do not claim indexing or ranking success from publication.

Ruling: reuse the clean linked worktree, on codex/samgu-search-tracking-20261025 from current origin/main. Never alter the user's dirty main checkout.

Ruling: existing actual-customer conversion is zero; the three historical lead events were explicit QA. Record that correction in operational status. No further test inquiry submission is needed for this SEO work.
