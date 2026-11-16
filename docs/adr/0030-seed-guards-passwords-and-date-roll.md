# 0030. The seed's guards, passwords, date roll and post-checks

Status: Accepted
Date: 16 Nov 2026
Requirements: D10, D2
Plan review: ARC-10, SEC-16, SEC-27, QA-20, QA-21

## Context

`plan.md` D10 says the seed refuses to run when `NODE_ENV` is `production`. `NODE_ENV` cannot tell a local run from a deployment, because Next sets it to `production` for every build (ADR 0010). ADR 0023 fixed the date rule's shape and left its details to this plan: how a passed date is measured, how far it moves, the Friday rule's order, and the checks that run after a load. Plan review ARC-10 asked for the guard to read `APP_ENV`. SEC-16 and SEC-27 asked for production to be refused and the seed passwords to be strong and never shown. QA-20 and QA-21 asked for the app specs to run on a pinned date and seeded data.

## Decision

- **The APP_ENV guard (in place of D10's NODE_ENV check, ARC-10).** `npm run seed` runs only when `APP_ENV` is `development`, `test`, `ci` or `staging`. Any other value, `production` included, exits 1 before any connection is opened (SEC-16). `--reset` runs only in `development`, `test` and `ci`, so staging keeps its data.
- **Seed passwords (SEC-27).** `SEED_USER_PASSWORD` is required and must be at least 8 characters, the User model's own minimum, so a short value fails before any tour is written. `SEED_ADMIN_PASSWORD` is required and must be at least 16 characters. A missing or short value stops the seed and names the key, never the value. CI generates both per run with `openssl rand -base64 32`, masks them with `::add-mask::`, and passes them to the seed step as step outputs, so they never reach the build step (T-04-08). Developers keep them in `.env.local`, which is never committed.
- **The date roll (ADR 0023).**
  - A start date is *passed* when its IST day is on or before `--today`. A departure on today's date is not bookable, so it moves, and every tour keeps a bookable date.
  - Each passed date moves forward by whole years until it is after today. A 29 February that lands in a non-leap year becomes 28 February.
  - Then, for a Golden Triangle Heritage departure whose day 4 (start plus 3 days) is a Friday, the departure moves one day earlier and the roll is checked again.
  - Each tour's dates are sorted ascending after the roll.
  - Bookings and reviews never move. Their `startDate` and `createdAt` stay at the seed values.
  - `--today=YYYY-MM-DD` must be a real calendar day. Without it, the day is today in IST from the one clock, so `APP_NOW` pins it too.
- **Post-checks after every load.** `checkSeedRules` checks the "Rules the data already follows" section of `seed/README.md`, and the first violation stops the run with `seed rule failed: <rule>: <detail>`. The rules are:
  1. `upcoming-departure`: every tour has a start date after today.
  2. `review-needs-past-booking`: every review's author has a paid booking for that tour whose trip is past at today.
  3. `one-review-per-tour`: each traveller reviews a tour at most once.
  4. `golden-triangle-friday`: no Golden Triangle departure has day 4 on a Friday.
  5. `upcoming-booking-date`: every upcoming booking's start date is one of its tour's start dates.
  6. `ratings-match`: the stored `ratingsQuantity` and `ratingsAverage` equal the reviews' count and mean, rounded to one decimal.
  7. `counts`: 13 tours, 35 users, 52 reviews, 58 bookings and 52 photo credits.
  8. `credits-stored`: every credited photo is among the keys the run stored.
  9. `guide-named-in-review`: a review names only the guides assigned to its tour. It reports nothing on the unmodified seed, so it is a rule as well as a test over the seed files.
- **Two details the post-checks settle.**
  - An *upcoming* booking, for rule 5, is a paid booking whose departure is still after today. That is the same test the roll uses for "passed" (ADR 0023). A departure that starts today has passed and keeps its seed date, and the other rules still see it as a trip in progress.
  - The rules read back only the seed's own documents, by their fixed `_id`s. A developer's own app data in the same database never breaks the seed's rules, and `counts` checks what the seed stored.
- **Where the seed runs.**
  - A developer runs `npm run seed` against `.env.local`, with the real date unless `--today` pins it.
  - CI's build job seeds after MongoDB starts and before the build, smoke and bundle steps, with the real date and no `--today`. Smoke and Lighthouse run `next start` without `APP_NOW`.
  - Playwright's `seed` project runs `npm run seed -- --reset --today=2026-11-08` before the `app` project. The dev server runs with `APP_NOW=2026-11-08T10:00:00+05:30` (QA-20, QA-21).

## Consequences

- `--reset` deletes every document in the four seed collections of the target database, including app data a developer added there. The Playwright seed project does this to the development database named by `MONGODB_URI`. The data is reproducible from `seed/`, and only `development`, `test` and `ci` can reset it (T-04-09, accepted). The README tells developers to stop `next dev` first, so the pinned clock applies.
- CI's seed uses the day it runs, so a CI run moves the passed departures of that day. The smoke and Lighthouse checks read the seed as it is on that day.
- A broken rule stops the seed after the load, so the database holds the data the run wrote. The next run with `--reset` rebuilds it.
- `seed/README.md`'s "Keeping dates current" paragraph still says to move every date, because `seed/` is left as supplied. ADR 0023 and this ADR take precedence.
