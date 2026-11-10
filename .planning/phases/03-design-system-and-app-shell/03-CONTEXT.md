# Phase 3: Design system and app shell - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 turns the approved "Milestone" direction into the actual design system and app shell: `tokens.css` and the two themes, the full `ui/` component library (button, link, text field, select, checkbox, file input, star rating, alert/toast, difficulty symbol, price, start-date select, tour row, facts strip, itinerary, map frame, booking panel, review item/form, guide item, avatar, photo credits, pagination, empty state, confirm dialog, header, footer, skip link, and per-section skeletons), the dev-only `/styleguide`, and the shared shell every later page builds on top of (header, footer, landmarks, a single `<h1>`, not-found/error pages).

Requirements: S2, S19, U1, U2, U3, U4, U5, U6, U9, U18, U19, U25.

Not in this phase:
- Any feature page (tours, bookings, account) — Phase 4+ builds pages from these components.
- Images/`next/image` usage specifics beyond what U1–U6 require for the component library itself (U7 is a Phase 4 concern, tied to real tour photos).
- Email components (`src/emails/`) — those come when emails are built; DES-19's "no raw hex outside tokens.css can't hold for email" is noted below but not actioned here.
- The actual Leaflet map component — Phase 3 builds only `ui/MapFrame` (the static frame/placeholder); `RouteMap` (the real Leaflet integration) is Phase 4, per ADR 0028.

</domain>

<decisions>
## Implementation Decisions

### Footer content
- **D-01:** The footer contains: the same nav links as the header (Tours, My tours, Account — or Log in/Sign up when logged out), a `/credits` link (closing the gap DES-06 flagged — nothing currently links to the required photo-credits index), and a copyright line. No social links (no social accounts exist for this demo). — **Reversibility:** reversible — a footer's content is cheap to change later; no downstream contract depends on its exact links.

### the agent's Discretion
*(not discussed — user deselected these areas; defaults/technical judgment below are informational, not locked decisions)*
- **[informational] Error page tone:** stay purely minimal/functional per plan.md's wording (generic message + digest, no stack trace in production) — no particular "Milestone" visual flourish beyond the standard token/component styling already locked.
- **[informational] Account menu behaviour:** a simple nav item swap (Account when logged in, Log in/Sign up when logged out) rather than a dropdown — matches direction.md's wireframes literally ("Tours My tours Account" as plain nav items), keeps U19's "plain list of links, works without JavaScript" simplest to satisfy.
- **[informational] Styleguide organization:** per-component sections with in-page navigation (not one undifferentiated long page) — purely an internal dev tool, no user-facing stakes.
- **[informational] Component ownership pattern (DEL-12):** `ui/` holds presentational components only (typed props, no data fetching, no Server Actions called directly); any component that needs data or an action gets a thin wrapper — these wrappers aren't a separate Phase-3 deliverable, they belong to whichever later phase first needs that data binding (e.g. the booking panel's real date-fetching wrapper is Phase 4's job; Phase 3 builds `ui/BookingPanel` as a pure, prop-driven component). This resolves DEL-12's "two owners" finding, which was about the original plan.md's now-replaced designer/web agent-team split (ADR 0002) — under GSD there's one executor, so the only thing that matters is keeping the `ui/` (pure) vs `features/` (wired) boundary itself, not who "owns" it.
- **[informational] Focus ring on Neel surfaces (DES-20):** `--color-focus` cannot simply be "Neel" everywhere — Neel-on-Neel (the header) is 1:1 contrast, invisible. Use Highway yellow for the focus ring wherever the surrounding surface is Neel (the header), and Neel elsewhere on light surfaces; direction.md's dark-theme table already made the equivalent swap (Highway yellow focus ring on dark backgrounds) — this extends the same logic to the Neel header specifically, in light theme too.
- **[informational] Touch targets (DES-21):** 44×44px minimum (a house rule beyond WCAG AA's 24px), except inline text links — apply as a stylelint/review check during this phase's component build, not a new token.
- **[informational] Default social-preview image (DES-22):** non-tour public pages (overview, My tours, account, styleguide) use the Valley of Flowers cover photo (already credited on `/credits`) as their Open Graph image, since "social preview for every page" (R10) was only defined for tour pages in plan.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification
- `plan.md` §9.4 (U1–U8 design system requirements): tokens, themes, CSS structure, the full component minimum set, the styleguide, fonts, images.
- `plan.md` §9.2: the approved "Milestone" direction — palette, type, layout, signature element (already built as `docs/design/direction.md`, below).
- `plan.md` §7 (web brief) and §3.3: folder layout and layering rules (`ui/` vs `features/`, Server Components by default per R1).
- `.planning/ROADMAP.md` ("Phase 3: Design system and app shell" section): the 5 success criteria and the review findings assigned to this phase.
- `.planning/REQUIREMENTS.md`: S2, S19, U1, U2, U3, U4, U5, U6, U9, U18, U19, U25 wording.
- `.planning/PROJECT.md` → Constraints: plain CSS Modules, no framework; `next/font` (Anek Latin and Anek Devanagari).

### Approved design direction (this phase's primary input)
- `docs/design/direction.md`: palette + measured contrast (light and derived dark), type scale, the 64em breakpoint, full wireframes (overview, tour, My tours, account — this phase builds the shell those pages will sit in), signature element, self-review.
- `docs/design/copy.md`: glossary, voice rules, exact error-code wording — components that show error/empty states use this wording verbatim.
- `docs/adr/0028-map-tile-provider-and-boundary-compliance.md`: D14 resolved as Option B (no third-party tiles) — `ui/MapFrame` needs no CSP host, no account, no key.

### Review findings for this phase
- `docs/plan-review/findings-architect.md` ARC-10: resolved already in Phase 1 — `APP_ENV` (not `NODE_ENV`) gates `/styleguide` (ADR 0010, ADR 0016; see `src/server/config-schema.ts`, `src/proxy.ts`). Phase 3 just needs to wire `/styleguide`'s `notFound()` to `getConfig().APP_ENV`, not re-decide the mechanism.
- `docs/plan-review/findings-security.md` SEC-16, `docs/plan-review/findings-qa.md` QA-21: same `APP_ENV` resolution — already in place from Phase 1.
- `docs/plan-review/findings-delivery.md` DEL-12: component ownership — see "the agent's Discretion" above (GSD replaces the designer/web split; keep `ui/` vs `features/` boundary itself).
- `docs/plan-review/findings-design.md` DES-05, DES-09, DES-10, DES-13, DES-15, DES-19, DES-20, DES-21, DES-22 — DES-13/14/15 already resolved in Phase 1/2 (fonts, date format, numbered-marker rule); DES-19 not applicable yet (no emails); DES-20/21/22 captured above as discretion items; DES-09/10 (design-gate presentation, screenshot baselines) were Phase 2 concerns, already closed.

### Carried forward from Phase 1 and 2
- `.planning/phases/01-foundation-and-contracts/01-CONTEXT.md`: `formatDate`/`formatPrice` are the only approved sources of date/price strings; `APP_ENV` switch (not `NODE_ENV`); CSP nonce plumbing in `proxy.ts`.
- `.planning/phases/02-design-direction-and-approval-gate/02-CONTEXT.md`: D-01 (direction kept as specified), D-02 (D14 resolved as Option B — no map CSP host needed).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server/config-schema.ts`, `src/server/deps.ts`, `src/proxy.ts`: `APP_ENV` already exists and already gates adapter selection (ADR 0016) and will gate `/styleguide` the same way (ARC-10/SEC-16/QA-21 — no new mechanism needed).
- `src/lib/format.ts`: `formatDate`/`formatPrice` — components displaying dates/prices (price tag, start-date select, tour row) must call these, never format inline.

### Established Patterns
- No styled page or component exists anywhere yet (Phase 1 shipped only unstyled `/`; Phase 2 built only static standalone mockup HTML, not Next.js components) — this is the first phase that writes real `src/` component code and CSS.
- `docs/design/mockups/{overview,tour}.html` + `mockup.css` (Phase 2) show the target visual result in plain HTML/CSS — useful as a visual reference, but Phase 3 builds proper CSS Modules under `@layer components` (U3), not a copy of the mockup CSS.

### Integration Points
- `/styleguide` route reads `getConfig().APP_ENV` directly, the same config accessor `deps.ts` already uses.
- Every component's error/empty-state copy must match `docs/design/copy.md` verbatim.

</code_context>

<specifics>
## Specific Ideas

No specific ideas beyond the footer decision were raised.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 3-Design system and app shell*
*Context gathered: 2026-11-10*
