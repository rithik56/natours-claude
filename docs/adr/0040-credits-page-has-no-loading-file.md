# 0040. The credits page has no loading.tsx, so it shows with JavaScript off

Status: Accepted. Amends decision 3 of ADR 0032 and R4's `loading.tsx` rule for `/credits`.
Date: 16 Nov 2026
Requirements: R4, U27, R11, D-10
Plan review: none

## Context

plan.md R4 says route segments have a `loading.tsx`. ADR 0032 decision 3 allowed one on `/credits`, because the page has no slug and so cannot turn a 404 into a 200. Plan 04-10 asked for it: a `loading.tsx` showing the page's own heading and intro line.

The same plan, and UI-SPEC's `/credits` section, say the page is plain HTML that works with JavaScript off, and its browser spec checks that with JavaScript disabled.

A `loading.tsx` wraps the page in a `Suspense` boundary. The page awaits `listCredits()`, so it suspends, and React writes the list into a `div[hidden]` stream container that an inline script moves into place. This was measured on `/credits` with JavaScript disabled on 16 Nov 2026, with the `loading.tsx` in place: the page showed the heading and the intro line and no groups. The spec found 0 of the 13 group links and 0 of the 52 credit rows.

This is the conflict ADR 0039 recorded for the tour page. There the user chose to await the sections, with no `Suspense`, so the page works with JavaScript off (option C, 16 Nov 2026).

## Decision

1. **No `loading.tsx` under `src/app/credits`.** The page awaits `listCredits()` and is sent whole, so the 13 groups and 52 rows are in the first response with JavaScript on or off.
2. **No root `loading.tsx` either**, as ADR 0032 already decided, so no boundary above the page streams it.
3. The list is read through the cache under `['credits']` with the `tours` tag, so the wait before the first byte is a cache read in the common case.

**Rejected:** keeping the `loading.tsx` and dropping the JavaScript-off promise for `/credits`. The page exists to show every photo's credit, which the photos' licences require (U27). A visitor without JavaScript would see a heading and no credits.

## Consequences

- R4's "route segments have `loading.tsx`" is a deviation for `/credits` too. It is recorded in `docs/contracts.md` section "Where the code differs from plan.md section 4".
- The page shows nothing until the list has been read. With a cold cache that is one MongoDB query over 13 tours, reading only the name, slug, photos and credits.
- A failed read reaches the route's error page before anything is sent, so the status is a real error status, not a 200 with a broken page.
- ADR 0032's decision 3 is amended: the permission it gave is not used.

**Reversibility:** reversible. A `loading.tsx` can be added back, but then the JavaScript-off gap above returns with it, and the `/credits` browser spec's JavaScript-off checks would need to change first.
