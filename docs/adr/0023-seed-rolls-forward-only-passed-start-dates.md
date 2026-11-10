# 0023. The seed rolls forward only start dates that have passed

Status: Accepted
Date: 9 Nov 2026
Requirements: D10, B19
Plan review: QA-01, DEL-03, ARC-19, DES-01; PROJECT.md Key Decision 9

## Context

`plan.md` D10 and the "Keeping dates current" paragraph of `seed/README.md` say: if any tour start date has passed when the seed runs, move every date in every file (tour start dates, bookings and reviews) forward by the same whole number of years.

The seed's first departure is 21 Nov 2026 (Meghalaya Living Root Bridges), so the rule first fires on that date, which is soon after this decision was taken. Four review findings (QA-01 and DEL-03 are Blockers, ARC-19 and DES-01 are Majors) showed it gives the wrong product:

- The seed's past events run from 10 Jan 2026 (the earliest past booking) to 27 Oct 2026 (the latest booking `createdAt`), and its start dates run from 21 Nov 2026 to 16 Oct 2027. Together they span more than a year, so no single whole-year shift keeps both groups on the right side of today.
- A run between 21 Nov 2026 and 8 Aug 2027 shifts by one year and moves all 52 past trips, all 52 reviews and all 58 booking `createdAt` values into the future. Reviews would then describe trips that have not happened, and My tours would list finished trips as upcoming.
- A shift of two years, which applies to runs from late Nov 2027 to late Nov 2028, puts day 4 of all three Golden Triangle departures ("Sunrise at the Taj Mahal") on a Friday. The tour's own description says the Taj Mahal is closed on Fridays, and `seed/README.md` says no departure does this.
- QA-01 counted 94.0% of run dates that break at least one claim in `seed/README.md`.

## Decision

D10 is amended (PROJECT.md Key Decision 9). The seed script, `npm run seed`:

- **Rolls forward only the tour start dates that have passed.** The shift is by whole years, as `seed/README.md` says, so each tour stays in its region's season.
- **Never moves past bookings or reviews.** An upcoming booking whose date passes becomes a past trip.
- **Shifts the `YYYY-MM-DD` strings,** not instants, so a date stays a calendar day in India Standard Time (B19).
- **Moves a Golden Triangle departure one day earlier** if day 4 of the shifted departure would fall on a Friday.
- **Takes `--today=YYYY-MM-DD`,** so a run can be pinned, and so tests and screenshots do not depend on the day the seed happens to run.
- **Checks the rules in `seed/README.md` afterwards** (under "Rules the data already follows"), and fails loudly if one is broken. They include: every review comes from a traveller with a paid booking on a past departure of that tour, no Golden Triangle departure has day 4 on a Friday, and every upcoming booking's start date is one of the tour's start dates.

PROJECT.md records the evidence for choosing this rule: the rule was simulated on the seed data for every run date to Nov 2028. All 39 departures (13 tours with 3 start dates each) stay within the next 12 months, against 1 of 39 if every date shifts together.

Phase 4 builds the seed script (D10 is mapped to that phase). Phase 1 only records the rule.

## Consequences

- `seed/README.md` still carries the old "move every date" wording, because `seed/` is left as supplied. This ADR takes precedence. Phase 4's seed script follows this ADR, not that paragraph.
- Phase 4's plan settles the details this ADR leaves open: how many whole years each passed start date moves, and the exact wording of each check.
- Run before 21 Nov 2026, nothing moves and every tour has an upcoming start date. The earliest is 21 Nov 2026. Run later with `--today`, only the dates that have passed move.
- Tests and screenshots that depend on seed data pin the date with `--today` (and `APP_NOW` for the app's clock, ADR 0010), so they stay stable.
- Past bookings and reviews are never moved, so the seed's finished trips stay finished.
