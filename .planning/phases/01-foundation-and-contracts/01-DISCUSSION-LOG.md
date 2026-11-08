# Phase 1: Foundation and contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-08
**Phase:** 01-foundation-and-contracts
**Areas discussed:** Dates and prices, Up-front vs per-phase setup, App before the design gate, Runtime and local setup

---

## Dates and prices

### Month abbreviation in `formatDate` (en-IN gives "4 Sept 2027")

| Option | Description | Selected |
|--------|-------------|----------|
| Always 3 letters | "4 Sep 2027"; built from formatToParts and trimmed; dates line up and match the plan's examples | ✓ |
| Keep en-IN's "Sept" | The locale's own output; no special case, but September dates are one character wider | |
| Full month names | "4 September 2027"; no abbreviation question, but crowded on a phone | |

**User's choice:** Always 3 letters

### A year-less short style

| Option | Description | Selected |
|--------|-------------|----------|
| Always show the year | One style, "5 Dec 2026"; never ambiguous | ✓ |
| Short style within 12 months | "5 Dec" only in compact spots, when every date shown is within 12 months | |
| Defer to Phase 2 | Build only the full style now; the design direction decides | |

**User's choice:** Always show the year

### When a start date stops being bookable

| Option | Description | Selected |
|--------|-------------|----------|
| Until the day before | Bookable while its IST day is after today | ✓ |
| Including the day itself | Bookable up to and including its IST start day | |
| A few days' notice | Only up to N days before; new rule and config value, needs an ADR | |

**User's choice:** Until the day before

### When a booked trip moves from upcoming to past

| Option | Description | Selected |
|--------|-------------|----------|
| After its last day | Upcoming until start date + duration − 1 (IST) has passed; review once it's over | ✓ |
| Once it has started | Past from the day after the start date | |
| Three groups | Upcoming, "On this trip now", past; a new state on My tours | |

**User's choice:** After its last day
**Notes:** The option described "can review only once it's over". Phase 6 must confirm whether that narrows `canReview` beyond S5/B6's "paid booking".

### `priceDiscount` in the Tour model

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it | Remove from v2; one price everywhere; one-line ADR | ✓ |
| Keep it as amount off | Charge and snapshot price − priceDiscount; show both prices | |

**User's choice:** Drop it

---

## Up-front vs per-phase setup

### When packages are installed

| Option | Description | Selected |
|--------|-------------|----------|
| When first used | Each phase installs what it uses; knip strict from day one; ADR 0001 records versions for the whole stack | ✓ |
| All up front, knip ignores | As plan.md P0-1 says, with a knip ignore list that shrinks per phase | |

**User's choice:** When first used

### How much of `docs/contracts.md` Phase 1 writes

| Option | Description | Selected |
|--------|-------------|----------|
| Shared parts now, modules later | Exact signatures for everything Phase 1 builds; feature phases add their service signatures | ✓ |
| All of §4 now | Also the §4.4 service functions and email props, as P0-7 says | |

**User's choice:** Shared parts now, modules later

### Where test factories get their data

| Option | Description | Selected |
|--------|-------------|----------|
| Always from seed/ | Real seed people and tours; no invented names anywhere | ✓ |
| Seed only where visible | Made-up data in unit tests; seed only in e2e, screenshot and styleguide fixtures | |

**User's choice:** Always from seed/

---

## App before the design gate

### What exists and is visible at the end of Phase 1

| Option | Description | Selected |
|--------|-------------|----------|
| Just / and the health checks | / is unstyled semantic HTML with the name and one true sentence; other routes come with their phase | ✓ |
| Every §1.5 route as a bare stub | All routes now, each with a plain heading only | |
| Only the health checks | No page; / is 404 until Phase 4 | |

**User's choice:** Just / and the health checks

### The R9 baseline for pages built later

| Option | Description | Selected |
|--------|-------------|----------|
| One shared floor | Measure / in Phase 1; every page gets floor + 40 KB, and the tour page adds a map allowance | ✓ |
| Per page, at first build | Each page's baseline is its first measurement | |

**User's choice:** One shared floor

---

## Runtime and local setup

### Node.js major

| Option | Description | Selected |
|--------|-------------|----------|
| Node 24, as specified | No deviation; supported until 30 Apr 2028; `brew install node@24` | ✓ |
| Node 26, the Active LTS | Newest LTS; only 11 days into LTS; needs an ADR | |

**User's choice:** Node 24, as specified

### Local MongoDB for `npm run dev`

| Option | Description | Selected |
|--------|-------------|----------|
| docker compose, mongo only | A mongo service with a named volume; Phase 5 adds the rest | ✓ |
| Homebrew mongod | Installed on the Mac as a service | |
| In-memory for dev too | mongodb-memory-server for dev; data lost on restart | |

**User's choice:** docker compose, mongo only

---

## Claude's Discretion

Before the area selection, the user was told that Claude would decide these unless they objected, and they didn't object:
- The commit format citing requirement IDs and the GSD plan.
- Rewriting the root `CLAUDE.md` for GSD (DEL-23).
- Committing `docs/plan-review/`.
- A `style-src-attr 'unsafe-inline'` ADR for `next/image` (ARC-20).
- A central messages module (DES-12).
- Scaffolding in a temporary folder (DEL-24).

The remaining technical items, such as config keys, the clock helper, mapper split, session timing, default deny and the example tests, are listed under "Claude's Discretion" in CONTEXT.md.

## Deferred Ideas

- Tour discounts (`priceDiscount`), as a future feature.
- A year-less compact date style, only if Phase 2 needs it.
- An "On this trip now" state on My tours.
- A booking notice period.
- For Phase 6: `canReview` and finished trips, SEC-08 and SEC-09. For Phase 5: SEC-22, ARC-17 and ARC-13.
