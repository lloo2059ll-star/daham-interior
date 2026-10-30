# Search content recovery implementation plan

> Use executing-plans task by task in the existing isolated worktree.

Goal: Recover verified project explanations and internal guide discovery weakened during the Oct14 redesign, without claiming an algorithmic cause or ranking recovery.
Architecture: Move each of four existing case narratives and breadcrumb out of closed bottom details to a visible block before the gallery. Reuse existing facts verbatim. Restore the two existing guide links from the homepage. Update lastmod only for meaningfully changed documents (home, portfolio, four cases). Keep URL/title/canonical/form/photography and unrelated ERP work unchanged.
Tech stack: Static HTML/CSS, existing Node test runner.

Evidence: Current mobile 30d vs7d: generic query1779/12 vs153/0; spaced query327/8 vs53/2; home2950/35 vs312/4. These are nested windows, not two equal weeks. Oct28 official notice changes October report display, not rankings. No exact daily rank history or Naver query-to-page mapping is exposed. Root and portfolio indexed; no demonstrated sitewide exclusion. Existing code at Oct2 versus Oct14 shows narratives relocated into closed details and homepage guide links removed. Sitemap dates predate meaningful edits.

- [x] Add regression coverage for visible case narrative before gallery and restored guide destinations; demonstrate RED.
- [x] Move existing content; scoped responsive CSS; accurate lastmod for changed pages.
- [x] Full tests; desktop/mobile public-style navigation, gallery and inquiry checks; independent review.
- [ ] Merge, wait deployment, verify public content, request only changed cases not already requested today, record diagnostic limits and follow-up baseline.
