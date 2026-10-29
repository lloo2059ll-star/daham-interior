# Simple inquiry and latest portfolio implementation plan

Approved scope: keep name, phone and consent in the initial inquiry; retain every optional field in a closed details section. Use a clear Korean heading and explain that project details can follow by phone. Keep the existing database payload and receipt behavior. Order portfolio cards by first publication date, preserving existing order for ties, in both static HTML and the runtime grid. Samgu 51 is currently newest.

- [x] Add regression tests for minimal valid payload, optional-field disclosure, publication ordering and static cards.
- [x] Update shared inquiry markup/CSS across existing public documents and central portfolio ordering.
- [x] Run related and full tests, inspect mobile local submission without production writes and portfolio navigation.
- [ ] Review diff, publish the bounded change and verify live pages.

