# Schedule Visual Redesign Design

## Goal

Rebuild the production `schedule.html` UI to closely match the supplied DAHAM schedule mockup while preserving the existing schedule domain engine, identifiers, storage contracts, authorization rules, and Supabase synchronization.

## Protected behavior

- Do not change `schedule-domain.js` mapping rules, phase ordering, worker-conflict logic, or stable IDs.
- Do not change existing project, task, general-event, estimate, or contract identifiers.
- Preserve `daham_schedule_v1`, `daham_schedule_general_v1`, Supabase `sync_data` load/save behavior, holiday fallback, and current role policy.
- Do not add manual project creation. Contract-complete sites remain linked through their stable existing IDs.
- Rendering and UI adapters may change, but the persisted data schema must not.

## Desktop structure

At 1440×900 the page uses a fixed dark navy product-navigation sidebar and a white workspace. The sidebar contains the DAHAM mark, the existing operating-page navigation, a purple active state for schedule management, and the authenticated-user summary at the bottom. This sidebar is product navigation only; the old project-filter list is removed.

The workspace header contains the title and explanatory subtitle on the left. The right action row contains General Schedule, Import Phases From Estimate, Today, Previous Month, and Next Month. Controls use at least a 44px hit target.

Below the header is a project-card viewport. Cards show only site name, construction status, date range, progress bar and percentage, site color, and Edit. The selected card receives a purple border and selected marker. Card selection sets the existing `currentId`; Edit opens the project editor without triggering card selection twice. The former always-open project information panel is removed from document flow and its existing inputs are placed in a drawer or modal. No worker name appears on a project card. An internal scrolling track handles overflow without increasing page width.

The remaining workspace is dominated by one large monthly calendar card. Its header includes Monthly View, previous/next, Today, centered `YYYY년 M월`, All Sites, Show Holidays, and Show Weekends. The calendar uses a seven-column grid with clear day borders and generous cell height. The existing week-segment calculation renders multi-day construction schedules as rounded connected bars colored by site. Each label is `현장명 · 공정명 · 작업자명`; clicking calls the existing task editor with the same schedule ID. Week boundaries create visual continuation segments only and never create new data records. General events use smaller neutral chips differentiated by type.

A single-line legend below the calendar lists visible site colors and the general-event categories 상담/실측, AS, 개인, 기타.

## Interaction adapters

Existing persistence and domain functions remain the source of truth. New rendering adapters bind the new card, header, calendar, drawer, task modal, general-event modal, and phase-candidate modal to the existing operations:

- select site and show all sites;
- edit project information and color;
- load estimate phases, edit candidates, add a candidate, and create schedules;
- add/edit construction and general schedules;
- surface worker conflicts and retain current role-based force-save behavior;
- move month, return to today, display holidays, save/load Supabase data, and preserve data after reload.

Inline handlers may be replaced with delegated event handlers where useful, but each action must remain accessible from the new DOM and must not duplicate listeners after rerendering.

## Responsive behavior

- 1440×900: full navy sidebar, horizontal project cards, large monthly calendar matching the mockup proportions.
- 768–1024px tablets: same visual language and monthly calendar focus. The sidebar becomes a compact icon rail or collapsible rail. Project cards use two columns or an internally scrollable track. Calendar typography and padding tighten without removing information. The document must not horizontally overflow.
- 390×844 and 430×932: retain the existing agenda/list presentation. Product navigation becomes the existing mobile navigation treatment; project cards and controls stack or scroll internally. No page-wide horizontal overflow.
- Responsive layout must come from actual width constraints, `min-width: 0`, flexible tracks, and internal card scrolling. Do not hide overflow on `html` or `body` to mask layout defects.

## Visual tokens

- Sidebar: deep navy gradient/solid tone close to the supplied mockup.
- Primary accent: purple for active navigation, selected site, and primary actions.
- Workspace: off-white background, white cards, light gray borders, subtle shadows.
- Site colors remain user-controlled and drive card accents, progress bars, schedule bars, and legend dots.
- Controls and cards use consistent 8–12px radii, restrained shadows, and the mockup's compact information density.

## Testing

Automated tests are written first for the new structural contract and event hooks, then run red before implementation. Existing schedule-domain and full regression suites must remain green.

Logged-in browser verification covers 1440×900, 1024×768, 820×1180, 768×1024, 390×844, and 430×932. It verifies zero page overflow, no fatal console errors, desktop/tablet monthly view, mobile agenda view, card selection/editing, phase import modal, schedule and general-event editing, month movement, Today, holidays, worker-conflict UI, color editing, and cloud-sync status. Any test data created for browser verification must be isolated and restored so existing operating data is preserved.

Before publication, desktop and tablet screenshots are compared directly with the supplied mockup for sidebar proportions, header/action alignment, card sizing, calendar dominance, event-bar form, whitespace, color, and information density. Publication proceeds only after automated and browser verification pass.

## Expected files

- Modify `schedule.html`.
- Add or modify schedule-specific UI tests under `tests/`.
- Do not modify `schedule-domain.js` or `schedule-holidays.js` unless an independently reproduced regression proves the existing engine is defective; visual work alone is never justification.

