# QA findings: plan.md review

Reviewer: `qa`. Scope: §1.3, §6, §10, §13 and `seed/`. Today is 8 Nov 2026 (IST).

Summary: 25 findings: 1 Blocker, 18 Major, 6 Minor.

The scripts behind the checks are in `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/43b5d3a5-585a-458d-bd9a-5b895fd82781/scratchpad/qa/` and are not in the repo:
- `validate.mjs` checks every seed record against §1.3, §0, §9.1 and `seed/README.md`.
- `shift.mjs` runs the D10 date-shift rule for every run date from 8 Nov 2026 to 31 Dec 2031.
- `shift-fix2.mjs` tests the replacement rule proposed in QA-01.
- `format.mjs` runs the §4.4 formatting in Node.

## Seed data: what checks out

`validate.mjs` found no errors in the following.

**Counts**
- 13 tours.
- 35 users: 1 admin, 5 lead guides, 9 guides and 20 travellers.
- 52 reviews, 4 per tour.
- 58 bookings, all `paid`: 52 past and 6 upcoming.
- 52 photos.
- These match plan.md:L50–L52 and `seed/README.md`.

**Tours**
- Names are 18–32 characters.
- Slugs are unique and equal to the slugified name.
- Difficulty values are all in the enum.
- Each tour has 3 `images`.
- Durations run 3–8 days and prices ₹12,999–₹42,999, as plan.md:L681 states. No two tours have the same price.

**Dates**
- All 39 start dates are valid IST `YYYY-MM-DD` values after today. They run from 21 Nov 2026 to 16 Oct 2027.
- Every `createdAt` has the `+05:30` offset.
- No date falls on 29 Feb or 1 Mar.
- The only date on the 1st of a month is a past booking on 1 Aug 2026.

**IDs and references**
- All `_id` values are 24 hex characters and unique across files.
- Every `guides`, `tour` and `user` reference resolves.
- Every guide has the role `guide` or `lead-guide`, and each tour has exactly one lead guide.
- Every review author and every booking user has the role `user`.
- Emails are lowercase, unique and on `example.com`.

**Reviews and bookings**
- Reviews are 128–285 characters long.
- Ratings are whole numbers from 1 to 5.
- No user has more than one review per tour.
- Every review has a paid booking for a past departure behind it, and was written after that trip ended.
- No past booking lacks a review.
- The 20 guide first names mentioned in reviews all belong to that tour's guides.
- Every booking price equals the tour price.
- Every upcoming booking is on one of its tour's start dates.

**Ratings**
- `ratingsAverage` and `ratingsQuantity` match the reviews when rounded with `Math.round(avg*10)/10`. QA-09 covers the rounding rule.

**Photos**
- All 52 files exist and every one is referenced.
- All are JPEGs exactly 1,920 px wide. The largest is 1.06 MB.
- Every photo has a complete credit, and all 52 credits match `CREDITS.md`.
- Licences: CC BY-SA 4.0 ×37, CC BY 4.0 ×8, CC BY-SA 3.0 ×6, CC BY 2.0 ×1.

**Coordinates**
- All 82 coordinates are in `[lng, lat]` order and fall inside India (longitude 68–98, latitude 6–37.5).
- Itinerary days are in range, unique and in order.
- The only gap is Kedarkantha day 2, which `seed/README.md` documents.

**Golden Triangle**
- No current Golden Triangle departure, past or future, puts day 4 (the Taj Mahal visit) on a Friday.

**Formatting**
- `formatPrice` matches every example in the plan when run in Node 22.21.1 (ICU 77.1, CLDR 47.0): ₹24,999, ₹1,24,999, ₹18,999, ₹42,999 and ₹12,999. It uses the ₹ sign (U+20B9) and resolves to 0 fraction digits.
- The B19 test as described does catch the bug. On a UTC server, without `Asia/Kolkata`, 1 Jan 2027 shows as "31 Dec 2026".

---

### QA-01 Blocker: The D10 date-shift rule moves past trips and reviews into the future on 94% of run dates, and some years it puts the Taj Mahal visit on a Friday

- **Where:** plan.md:L664 (D10), L977 (P1-CA5); seed/README.md:L30–L34
- **Affects:** D10, B19, P1-CA5, P3-PL2, the review rule (L97), U13, and every Playwright test or screenshot built on seed data (U26, P2-RV1)
- **Problem:**
  - D10 says that if any start date has passed, the seed "moves **all** dates (tour start dates, bookings, reviews) forward by the same whole number of years, so tours stay in season and past trips stay in the past."
  - The seed's past events (bookings 10 Jan–8 Aug 2026, reviews up to 20 Aug 2026, booking `createdAt` up to 27 Oct 2026) and its start dates (21 Nov 2026–16 Oct 2027) together span 22 months, which is more than a year.
  - So no single whole-year shift keeps both groups on the right side of today.
  - The rule first fires on 21 Nov 2026. That is 13 days from now, almost certainly before P1-CA5 runs.
- **Evidence:** `shift.mjs` ran the rule for 1,880 run dates.
  - **21 Nov 2026 to 8 Aug 2027 (shift of 1 year):** all 52 past trips become upcoming. All 52 reviews are dated in the future and review trips that haven't happened. All 58 booking `createdAt` values are in the future.
  - **9–19 Aug:** 6 reviews are still dated in the future.
  - **20 Aug–26 Oct:** 6 booking `createdAt` values are in the future.
  - The same pattern repeats every year. The data is only clean from 27 Oct to 20 Nov each year (plus 8–20 Nov 2026), so 94.0% of run dates break a README claim.
  - **Fridays:** a whole-year shift changes the weekday. With a 2-year shift (any run from 21 Nov 2027 to 20 Nov 2028), all three Golden Triangle departures put day 4, "Sunrise at the Taj Mahal", on a Friday. The tour's own text says "The Taj Mahal is closed on Fridays, so every departure is timed around it", and seed/README.md:L44 says no departure does this.
  - **29 February:** no seed date hits this today. But the rule doesn't say to shift the date strings. If code shifts the stored instant (18:30 UTC the previous day) with `setUTCFullYear`, a 1 March IST departure becomes 29 February in a leap year.
- **Effect on the build:**
  - The seeded app shows every traveller's past trips as upcoming, next to reviews of those trips dated in the future.
  - "Write a review" (U13) never appears for seed travellers.
  - The screenshots sent to the human at the Phase 2 gate carry this data.
  - catalog cannot satisfy both D10's method and the outcome it promises.
- **Proposed fix:** replace the D10 sentence and seed/README.md:L30–L34 with:

  > "If any tour start date is on or before today (IST), the seed moves the tour start dates, and the upcoming bookings on them, forward by the smallest whole number of years that puts every start date after today. It shifts the `YYYY-MM-DD` strings before converting them to 00:00 IST. Past bookings and reviews never move. After shifting, any Golden Triangle Heritage departure whose day 4 falls on a Friday moves one day earlier, along with its bookings. The seed takes `--today=YYYY-MM-DD` (default: today in IST)."

  `shift-fix2.mjs` tested this rule for every run date up to 31 Dec 2036: no violations, no months changed, no Taj Mahal Fridays.

  An alternative is to shift by multiples of 364 days, which keeps weekdays without the Friday nudge. The trade-off is that dates drift about a day earlier each year; Ladakh's 4 Sep becomes 31 Aug by 2030.
- **Confidence:** verified

### QA-02 Major: §1.3 drops `startLocation.address`, which the overview and tour page display

- **Where:** plan.md:L157, L726, L739, L742, L750; seed/data/tours.json
- **Affects:** P0-3, P1-CA5, P1-WE2, P1-WE3, U10, U11
- **Problem:**
  - §1.3 says `startLocation` is a "GeoJSON Point", and P0-3 says to build the models "exactly as in §1.3".
  - All 13 seed tours also carry `address` (for example "Fort Kochi, Kerala") and `description`.
  - The overview row shows a "region" (L726), and the wireframes show "Fort Kochi, Kerala" (L739), "Leh, Ladakh" (L742) and "Rishikesh, Uttarakhand" (L750).
  - No §1.3 field holds this text.
- **Evidence:**
  - `validate.mjs`: the keys `{type, coordinates, address, description}` appear on all 13 tours.
  - Mongoose strict mode "ensures that values passed to our model constructor that were not specified in our schema do not get saved to the db" (https://mongoosejs.com/docs/guide.html).
- **Effect on the build:** the addresses are dropped silently when the seed loads, and web has no region to show.
- **Proposed fix:** change L157 to:

  > "`startLocation` | GeoJSON Point, plus `address` (required; place and state shown as the tour's region, e.g. 'Fort Kochi, Kerala') and `description`."

  Add `address` to `toTourSummary` and `toTourDetail`.
- **Confidence:** verified

### QA-03 Major: Seed image fields hold file names but §1.3 says storage keys, and uploaded photos can't get credits

- **Where:** plan.md:L153–L155, L238, L576 (S16), L830 (U27); seed/README.md:L25–L26
- **Affects:** P1-CA2, P1-CA5, P1-PL3, P1-WE3, U27, B4, B8
- **Problem:**
  - **(a) Keys don't match.** §1.3 says the image fields are storage keys. The README says to upload each photo under `tours/<file>`, while `imageCover`, `images` and `photoCredits[].file` "all use the file name". Either `urlFor` receives the wrong key, or the seed rewrites the fields and the credit lookups stop matching.
  - **(b) No credits for uploads.** S16 gives uploads random keys and re-encodes them as WebP. `PUT /tours/[id]/images` takes only files, so a newly uploaded photo can't get a credit, and a replaced photo leaves its credit behind.
  - **(c) Conflicting credit rules.** §1.3 L155 exempts the company's own photos from credits, but U27 L830 tests that "every tour photo has a credit".
  - **(d) Format.** If the seed uploads through `images.normalize`, it stores WebP data under `.jpg` keys.
- **Effect on the build:**
  - catalog, platform and web each pick a different key convention.
  - The result is broken images or missing credits.
  - The U27 test only passes on seed data.
- **Proposed fix:**
  - §1.3: "all three fields hold the full key `tours/<file>`. The seed writes that form and uploads the JPEGs unchanged. `PUT /tours/[id]/images` takes a credit (title, author, licence, licence URL, source URL), or `own: true`, for each file. Replacing a photo removes its credit."
  - U27: "every photo has a credit or is marked as the company's own."
- **Confidence:** verified

### QA-04 Major: Validators and hooks don't run on updates (`priceDiscount < price`, slug, name length)

- **Where:** plan.md:L142–L143, L150, L222, L237, L382
- **Affects:** P0-3, P1-CA2, P1-ID4, B5, B16, S4
- **Problem:**
  - `priceDiscount < price` and "slug set on save" both need the stored document.
  - `PATCH /tours/[id]` accepts any subset of fields, and Zod can't see the stored price.
  - Mongoose docs say:
    - "Update validators are off by default."
    - With update validators on, "`this` refers to the query object instead of the document."
    - "Pre and post `save()` hooks are not executed on `update()`, `findOneAndUpdate()`."
  - With v1's `findByIdAndUpdate` pattern, three things go wrong:
    - Lowering `price` below the existing discount succeeds.
    - Renaming a tour keeps its old slug.
    - Without `runValidators`, the 10–40 character name rule never runs on updates.
- **Evidence:** https://mongoosejs.com/docs/validation.html and https://mongoosejs.com/docs/middleware.html
- **Effect on the build:** invalid tours get saved, renamed tours keep stale slugs, and the B5 and B16 tests pass on create but not on update.
- **Proposed fix:** add after L161:

  > "Tour and user updates load the document, assign the validated fields and call `save()`, so validators and the slug and password hooks run. `findByIdAndUpdate` is used only for the B6 rating fields. A rename changes the slug."

  The human may prefer to keep old slugs and redirect them instead. Add regression tests for a price set below the discount and for a rename.
- **Confidence:** verified

### QA-05 Major: The plan never says what `priceDiscount` means or what the customer pays

- **Where:** plan.md:L150, L180, L242, L577, L598, L726
- **Affects:** P1-CO1, P1-CA1, P1-WE2, P1-WE3, B8, B20, S17
- **Problem:** the plan doesn't say:
  - whether `priceDiscount` is the amount off or the sale price;
  - whether checkout charges `price` or `price − priceDiscount`;
  - whether the "from" price, the price filter, the price sort and the booking snapshot use the discounted figure.
- **Effect on the build:**
  - Once an admin sets a discount, commerce may charge a different amount from the one the page shows.
  - No seed tour has a discount, so nothing catches this before production.
- **Proposed fix:** this is a decision for the human. I recommend removing `priceDiscount` from v2.0. If it stays, say:

  > "`priceDiscount` is the amount off. Checkout charges and snapshots `price − priceDiscount`. The overview, filter and sort use that figure. Pages show both, e.g. ₹18,999 struck through and ₹16,999."
- **Confidence:** verified

### QA-06 Major: Nothing ever sets a booking to `refunded`, and admin booking writes have no rules

- **Where:** plan.md:L184, L268–L270, L526, L564, L577
- **Affects:** P1-CO2, P1-CO3, P0-4, U11, U13, S4
- **Problem:**
  - The status enum includes `refunded`, but the webhook only handles completed checkouts.
  - `PATCH /bookings/[id]` (admin) has no list of allowed fields.
  - Manual `POST /bookings` has no rules for price, start date or status.
  - The plan doesn't say whether `hasPaidBooking`, `canReview`, My tours or the booking panel leave out refunded bookings.
- **Effect on the build:**
  - Each teammate invents a different refund path, or `refunded` is never used.
  - A refund made in Stripe leaves the booking `paid`, so the traveller can still review the tour.
- **Proposed fix:** this is a decision for the human. I recommend:

  > "Only `PATCH /api/v1/bookings/[id]` (admin) with `{ status: 'refunded' }` changes a booking, and that is the only field it accepts. The admin refunds in Stripe first. `hasPaidBooking`, `canReview` and the booking panel count only `paid` bookings. My tours shows refunded bookings in the past group, labelled 'Refunded'. A manual booking takes `userId`, `tourId` and `startDate`, which must be one of the tour's start dates. Its price is copied from the tour and its status is `paid`."
- **Confidence:** verified

### QA-07 Major: Review eligibility and "already booked" are defined three different ways

- **Where:** plan.md:L97, L254, L316, L525–L526, L809, L811; seed/README.md:L41–L42
- **Affects:** P0-4, P1-CA4, P1-WE3, P1-WE5, S5, U11, U13, U14
- **Problem:**
  - §1.2 and §1.4 require "a paid booking" and put no condition on its date.
  - U13 offers "Write a review" on past tours, and the seed README says "a past departure".
  - `canReview` is never defined. The plan doesn't say whether the trip must have ended, whether an existing review blocks a second one, or whether the role `user` rule applies.
  - U11's "already booked" state doesn't say whether it means any booking ever or an upcoming one.
- **Evidence:**
  - Aarav Sharma has a past Kedarkantha booking with a review, and an upcoming one on 19 Dec 2026.
  - If "already booked" means `hasPaidBooking`, every traveller sees "booked" on every tour they've taken, and can't book it again.
  - If `canReview` means `hasPaidBooking`, Priya Iyer, whose only booking is an upcoming Kerala trip on 5 Dec 2026, can review it before going.
- **Effect on the build:** catalog, web and reviewer each build and test a different rule.
- **Proposed fix:** replace L525–L526 with:

  > "`canReview(userId, tourId)`: the user has role `user`, has a `paid` booking whose trip has ended (start date + duration − 1 is before today in IST), and has not already reviewed the tour.
  > `hasUpcomingBooking(userId, tourId)`: the user has a `paid` booking starting today or later. The panel's 'already booked' state uses this, and the panel still allows booking another date."

  Align L97, L254 and L316 to match.
- **Confidence:** verified

### QA-08 Major: A tour with no reviews shows a 4.5-star rating

- **Where:** plan.md:L147, L242, L596, L750
- **Affects:** B6, P1-CA4, U10, U11
- **Problem:**
  - `ratingsAverage` defaults to 4.5, and B6 resets a tour to its defaults when its last review is deleted.
  - So a new tour, or one with no reviews left, shows "★ 4.5" that no traveller gave.
  - Sorted by rating, it ranks above Kedarkantha Winter Trek, whose real 4.3 comes from 4 reviews.
  - It also passes a `ratingsAverage[gte]=4.5` filter.
- **Effect on the build:** the site shows an invented rating, which §9.1's no-placeholder rule forbids, and the B6 regression test locks it in.
- **Proposed fix:** this is a decision for the human. I recommend:

  > "There is no default rating. `ratingsAverage` is null while `ratingsQuantity` is 0, and deleting the last review clears it. Pages show 'No reviews yet'. Unrated tours sort last and are excluded by rating filters."
- **Confidence:** verified

### QA-09 Minor: Kedarkantha's average of 4.25 rounds to 4.3 with `Math.round` but to 4.2 with MongoDB `$round`

- **Where:** plan.md:L147, L596; seed/README.md:L35–L36
- **Affects:** B6, P1-CA4, P1-CA5
- **Problem:**
  - Kedarkantha's ratings are 5, 5, 4 and 3, which average 4.25. The seed stores 4.3 (rounding half up).
  - MongoDB `$round` "rounds to the nearest even value", which gives 4.2.
  - Every other tour comes out the same either way.
- **Evidence:** `validate.mjs`; https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- **Effect on the build:** if the service rounds inside the aggregation, the README's promise that recalculating gives "the same numbers" fails for Kedarkantha.
- **Proposed fix:** change L147 to:

  > "rounded half up in the setter with `Math.round(v * 10) / 10`, so 4.25 becomes 4.3. The aggregation returns the raw `$avg`; never use `$round`."
- **Confidence:** verified

### QA-10 Major: The month filter and monthly plan use UTC boundaries, so a departure on the 1st of a month lands in the previous month

- **Where:** plan.md:L83, L232, L244, L609
- **Affects:** B19, P1-CA1, P1-CA3, U10
- **Problem:**
  - B19 stores 00:00 IST as 18:30 UTC on the previous day, but only covers display and the "is it in the future" check.
  - MongoDB date operators default to UTC: "If no timezone is provided, the result is in UTC."
  - So 1 Jan 2027 is stored as 2026-12-31T18:30Z. `$month` returns 12, `$year` returns 2026, and a filter starting at `new Date('2027-01-01')` leaves the departure out of January.
  - B19's own example is a 1 January departure.
  - The seed has no start date on the 1st of a month, so tests built on seed data won't catch this.
- **Evidence:** `format.mjs` prints "2027-01-01 IST → UTC month 12, UTC year 2026"; https://www.mongodb.com/docs/manual/reference/operator/aggregation/month/
- **Effect on the build:** a "January 2027" filter leaves out departures on 1 January, and the monthly plan counts them in the previous month, or the previous year for 1 January.
- **Proposed fix:** add to B19:

  > "Month and year boundaries are IST too. `month=YYYY-MM` matches from `fromIstDay('YYYY-MM-01')` up to the start of the next month. The monthly plan passes `timezone: 'Asia/Kolkata'` to `$month` and `$year`. Tests use a departure on 1 January."
- **Confidence:** verified

### QA-11 Major: Sort ties make pages repeat or skip tours, and the overview page size is either 12 or 20

- **Where:** plan.md:L241, L247, L591, L601, L808
- **Affects:** B1, B11, P1-CA1, P1-WE2, U10, U26
- **Problem:**
  - **Ties.** The default sort is `-createdAt`, but seed tours have no `createdAt`, so the order depends on insertion time. Other sort fields also tie: ratings are 4.5 for 8 tours and 4.8 for 4; durations are 6 days for 4 tours and 3, 4, 5 and 7 days for 2 tours each.
  - MongoDB docs say that on duplicate values, "documents containing those values may be returned in any order", and `$sort` is not stable.
  - With 12 tours per page:
    - Sorting by rating, ascending, puts the four 4.8 tours across positions 10–13, so they straddle the page break.
    - Sorting by `-duration` puts Ranthambore Tiger Safari and Rishikesh Ganga Rafting (both 3 days) at positions 12 and 13.
    - Either way, one tour can appear on both pages while another appears on neither.
  - **Page size.** U10 paginates above 12 tours, but B11's default limit is 20, and both use the same query builder.
- **Evidence:** https://www.mongodb.com/docs/manual/reference/method/cursor.sort/; tie counts from `validate.mjs`
- **Effect on the build:** tours appear twice or not at all on the overview, e2e and screenshot tests flake, and teammates pick 12 or 20 as they see fit.
- **Proposed fix:**
  - B1: "The query builder always adds `_id` as the last sort key."
  - D10: "The seed sets each tour's `createdAt`."
  - U10: "The overview passes `limit=12`; the API default stays at 20."
- **Confidence:** verified for the ties; likely for the visible effect

### QA-12 Major: B6 doesn't say which tags to clear, and the recommended `revalidateTag` profile shows a writer stale data

- **Where:** plan.md:L596, L626, L628, L918
- **Affects:** B6, R5, R7, U14, P1-CA2, P1-CA4, P2-RV1
- **Problem:**
  - **(a) Tags.** A rating change also affects the overview list (sort and filter by rating), so it must clear the `tours` tag. The plan has no table saying which writes clear which tags.
  - **(b) Staleness.**
    - Next 16's `revalidateTag(tag, 'max')` "marks the tagged data as stale. The next request … is served stale content". The one-argument form is deprecated.
    - `updateTag` "can only be called from within Server Actions", and in next@16.4.5 it throws inside Route Handlers.
    - Services are shared by actions and Route Handlers (B13), so a service can't call `updateTag` unconditionally.
- **Evidence:** https://nextjs.org/docs/app/api-reference/functions/revalidateTag; https://nextjs.org/docs/app/api-reference/functions/updateTag; https://unpkg.com/next@16/dist/server/web/spec-extension/revalidate.js
- **Effect on the build:**
  - After `createReviewAction` redirects, the author sees the old review list.
  - P2-RV1's "leave a review" step and R7 fail intermittently.
  - The overview's rating order goes stale.
- **Proposed fix:** add to R5 a table mapping writes to tags:

  | Write | Tags to clear |
  |---|---|
  | Tour create, update, delete or images | `tours`, `tour:<id>` |
  | Review create, update or delete | `reviews:<tourId>`, `tour:<id>`, `tours` |

  Add the rule: "Services clear tags with `revalidateTag(tag, { expire: 0 })` through the cache adapter (QA-16)."
- **Confidence:** verified

### QA-13 Minor: Cached data keeps departures that have passed, and a tour with no future dates has no defined state

- **Where:** plan.md:L598, L609, L626, L726, L809
- **Problem:**
  - R5 clears the cache only when data changes, and time passing isn't a change.
  - If the "future dates only" filter runs inside a cached function, a departure that has passed stays on the page, and checkout then rejects it with a 400 error (B8).
  - Hampi's last departure is 28 Jan 2027. On staging without a reseed, the plan doesn't say what its booking panel or overview row shows.
- **Proposed fix:**
  - R5: "Cached functions return every start date. Filtering to future dates in IST happens at render time."
  - U11: "With no future dates, the panel says 'No departures scheduled' and has no Book button. The overview row says the same."
- **Confidence:** likely

### QA-14 Minor: The plan doesn't say how to treat a departure today or a trip in progress

- **Where:** plan.md:L182, L609, L811
- **Problem:** the plan doesn't say whether a departure starting today can be booked, or whether My tours lists a trip that started yesterday as upcoming or past.
- **Proposed fix:** add to B19:

  > "A departure is in the future when its IST day is after today. My tours lists a booking as upcoming until its last day (start date + duration − 1) has passed."

  This fits with QA-07.
- **Confidence:** verified that the plan is silent

### QA-15 Minor: The plan doesn't say what deactivation does to reviews, ratings and guides

- **Where:** plan.md:L235, L566 (S6), L596
- **Problem:**
  - S6 says deactivated users are "left out of queries". The plan doesn't say whether their reviews disappear, whether their ratings still count, or whether a deactivated guide is still listed on tour pages.
  - Hiding reviews without recalculating makes the visible review count disagree with `ratingsQuantity`.
- **Proposed fix:** this is a decision for the human. I recommend:

  > "Reviews by deactivated users stay visible and keep counting towards ratings. Deactivated guides are left off tour pages."
- **Confidence:** verified that the plan is silent

### QA-16 Major: `server-only` and `next/cache` throw under Vitest and tsx, so service tests and the seed can't run as planned

- **Where:** plan.md:L373, L431, L664, L941, L977; seed/README.md:L35–L36
- **Affects:** P0-6, P1-CA5, every integration test, B6, Q6, Q7
- **Problem:**
  - **(1) `server-only`.** Every file in `src/server` imports `server-only`. That package's exports map sends the `react-server` condition to `empty.js` and everything else to `index.js`, which throws "This module cannot be imported from a Client Component module…". Vitest and tsx don't set `react-server`, so importing any service, model or helper throws, including the models the seed needs.
  - **(2) `next/cache`.** In next@16.4.5, `revalidate()` runs `if (!store || !store.incrementalCache) throw new Error('Invariant: static generation store missing in …')`. So `revalidateTag` throws whenever it's called outside a Next.js request.
  - `test/setup.ts` only mocks `next/headers`, yet the README asks the seed to recalculate ratings through the review service.
- **Evidence:** https://unpkg.com/server-only/package.json and its `index.js`; https://unpkg.com/next@16/dist/server/web/spec-extension/revalidate.js
- **Effect on the build:**
  - P0-6's first example test fails on import.
  - The B6 test and the seed's rating recalculation both throw.
  - Teammates each add their own mocks, in test files they don't own.
- **Proposed fix:**
  - Add to §3.2 rule 9: "Cache invalidation is an adapter. The real one calls `revalidateTag(tag, { expire: 0 })`; the fake records `fakes.cache.invalidated`; scripts use a no-op."
  - Add to P0-6: "Vitest aliases `server-only` to an empty module and mocks `next/cache`."
  - Run `scripts/seed.ts` with the same alias through a scripts-only tsconfig, not the app's `tsconfig.json`, which would switch the guard off in `next build`.
  - Record the approach in an ADR.
- **Confidence:** verified for both throws; likely for how tsx resolves the package

### QA-17 Major: The §4.5 helpers can't express the B tests, and Q2's lint rule blocks the factories

- **Where:** plan.md:L540–L545, L852, L865, L883
- **Affects:** P0-6, B1, B3, B4, B7, B11, B15, B16, S9, S14–S17, S23, Q6
- **Problem:**
  - **`createUser({ role?, active? })`** can't set `email` (B16), `password` (login tests need it), `name` or `passwordChangedAt` (S14).
  - **`createBooking`** can't set `status` (refunded), `price` or `stripeSessionId` (S17).
  - **`callRoute`** has three gaps:
    - It takes no `headers`. Tests need the S9 Origin header (which should default to same-origin, or every write is rejected), `x-middleware-subrequest` (S23), `stripe-signature` (B7) and the client IP (S15).
    - It can't send a raw string body (B7) or multipart `FormData` (B4, S16, `PATCH /users/me`).
    - It doesn't say how to pass a query string (B1, B3, B11).
  - **Fakes** can't be reset, so the 11th login in one test file gets a 429. There is no cache fake (QA-16) and no clock (QA-20).
  - **Lint.** Q2 forbids importing `**/modules/*/model` from outside its module. `test/helpers/` is outside every module, so the factories fail lint and so fail the Definition of Done.
- **Effect on the build:** module owners can't write the B4, B7 or B16 tests without changes to helpers the lead owns, so Phase 1 queues behind the lead.
- **Proposed fix:** replace L542–L545 with these helpers:
  - `createUser({ role?, active?, name?, email?, password?, passwordChangedAt? })`, returning `{ user, password }`
  - `createTour(overrides?)`, with start dates in the future relative to the test clock
  - `createBooking({ user, tour, startDate?, status?, price?, stripeSessionId? })`
  - `createReview({ user, tour, rating?, review? })`
  - `callRoute(module, { method, path, params?, body?, headers?, origin?, ip?, as? })`, where `path` may include a query string, an object `body` is sent as JSON, a string as a raw body and `FormData` as multipart, and `origin` defaults to the app's own origin
  - `fakes.rateLimit.reset()` and `fakes.cache.invalidated`

  Exempt `test/helpers/` from Q2's model rule. Take factory names from `seed/data/users.json`.
- **Confidence:** verified

### QA-18 Major: Nothing guarantees the indexes exist, in tests or in Atlas

- **Where:** plan.md:L161, L172, L183, L857, L1019, L1035
- **Affects:** B3, B16, S17, review uniqueness, P0-6, P3-PL1
- **Problem:**
  - B16, review uniqueness, S17's protection against duplicate webhooks and B3's `$geoNear` all depend on indexes.
  - Mongoose builds indexes in the background after connecting: "Calling `await Model.init()` is helpful if you need to wait for indexes to build … For example, if you want to wait for unique indexes to build before continuing with a test case."
  - Q7 gives every test file a fresh database, so every file starts with no indexes.
  - "`$geoNear` requires a geospatial index."
  - Mongoose recommends turning `autoIndex` off in production, and no task then creates the indexes.
- **Evidence:** https://mongoosejs.com/docs/api/model.html; https://mongoosejs.com/docs/guide.html; https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/
- **Effect on the build:**
  - Flaky tests: a duplicate insert can succeed before the unique index exists.
  - With `autoIndex` off in production:
    - duplicate accounts can be created;
    - a duplicate webhook can create two bookings (§13 L1035);
    - the distances endpoint fails.
- **Proposed fix:**
  - P0-6: "`test/setup.ts` awaits `Model.init()` for every model."
  - D10 and P3-PL1: "`npm run db:indexes` runs `syncIndexes()`. The seed and every deploy run it. `autoIndex` is off in production."
- **Confidence:** verified from the docs; the flaky tests are likely

### QA-19 Major: B10 can't be met or tested as written

- **Where:** plan.md:L600, L607, L857
- **Affects:** B10, B17, D6, P0-3, P1-PL4
- **Problem:**
  - **(1) Buffering.** Mongoose "buffers commands when the connection goes down until the driver manages to reconnect", and `bufferTimeoutMS` defaults to 10 seconds. So requests hang for 10 seconds when the database drops, not the 5 seconds the plan expects.
  - **(2) Test timeout.** Vitest's default test timeout is 5 seconds, so the 503 test times out before the 503 arrives.
  - **(3) Cached failure.** If Mongo is down when the app starts, the connection promise cached on `globalThis` stays rejected for good, and `/readyz` keeps returning 503 even after Mongo recovers.
- **Evidence:** https://mongoosejs.com/docs/guide.html; https://vitest.dev/config/testtimeout
- **Proposed fix:**
  - B10: "Use `bufferCommands: false` and `serverSelectionTimeoutMS: 5000`. With the database unreachable, a request returns 503 within 6 seconds."
  - B17: "A rejected connection promise is removed from `globalThis` so the next request retries."
  - The B10 test sets a shorter timeout through config.
- **Confidence:** verified

### QA-20 Major: Tests depend on the real date: fake timers can stall the database driver, and Playwright has no server clock

- **Where:** plan.md:L626, L664, L829, L857, L1003
- **Affects:** Q7, U26, P1-RV3, P2-RV1, P2-RV2, B8, B19, D10
- **Problem:**
  - **(1) Fake timers.** By default, Vitest's `fakeTimers.toFake` fakes "everything available globally except nextTick and queueMicrotask". That includes `setTimeout` and `setInterval`, which the MongoDB driver relies on.
  - **(2) No server clock.** Server-rendered pages decide which dates are in the future from the real clock.
    - Between 21 Nov 2026 and 27 Feb 2027, 21 departures pass.
    - From 21 Nov 2026, a reseed also shifts every date (QA-01).
    - So U26's screenshot baselines change roughly once a week, and each change needs the lead's approval.
- **Evidence:** https://vitest.dev/config/faketimers; departure dates from `validate.mjs`
- **Proposed fix:**
  - Q7: "Fake only `Date`: `vi.useFakeTimers({ toFake: ['Date'] })`."
  - New rule: "All date logic reads `now()` from `src/server/clock.ts`. Outside production, `APP_NOW=2026-11-08T10:00:00+05:30` pins it. Playwright, Lighthouse and `seed --today` all use the same date."
- **Confidence:** verified for the date dependence; likely that the driver stalls

### QA-21 Major: The Playwright and Lighthouse environment is undefined, and NODE_ENV-based switches break it

- **Where:** plan.md:L294, L384, L664, L665, L827, L829, L1003; seed/README.md:L20–L22
- **Affects:** U24, U26, R5, R11, S2, D4, D10, P1-RV3, P2-RV1, P2-RV2, P2-PL1
- **Problem:**
  - Next.js "automatically assigns development when running the next dev command, or production for all other commands". The only allowed values are production, development and test.
  - The plan switches several things on the environment:
    - `/styleguide` returns 404 in production;
    - `deps.ts` picks the fake adapters;
    - the seed refuses to run in production;
    - config requires real secrets in production.
  - Lighthouse (U24) runs against `next start`, and P2-RV1 runs against docker compose with the fake Stripe client. Both therefore run with `NODE_ENV=production`.
  - The plan doesn't say which database or data Playwright uses, and the seed's `SEED_USER_PASSWORD` is "development and staging only".
- **Evidence:** https://nextjs.org/docs/app/guides/environment-variables
- **Effect on the build:**
  - The U26 styleguide screenshots get a 404.
  - CI needs real Stripe, S3 and SMTP secrets, and makes network calls that Q7 forbids.
  - Running Playwright against `next dev` instead puts the dev indicator in the screenshots.
- **Proposed fix:**
  - Add to §3.2: "`APP_ENV` (development, test, ci, staging or production) is separate from `NODE_ENV`. `deps.ts` picks fakes for test and ci. `/styleguide` is served everywhere except staging and production. Real secrets are required only for staging and production. The seed refuses to run in production."
  - Add to Q7: "Playwright runs against `next build && next start` with `APP_ENV=ci`. MongoDB is started by Playwright's global setup and seeded with `npm run seed -- --reset --today=2026-11-08`, using a CI-only `SEED_USER_PASSWORD`. Lighthouse uses the same server."
- **Confidence:** verified

### QA-22 Major: P1-RV2 adds failing tests on day one, so no task can meet the Definition of Done

- **Where:** plan.md:L665, L865, L987
- **Affects:** P1-RV2, every Phase 1 task, the Phase 1 gate
- **Problem:**
  - P1-RV2 says the regression tests "may fail until the matching feature lands".
  - The Definition of Done requires `npm test` to pass.
  - So `npm test` is red for everyone throughout Phase 1, and no teammate can tick that box.
- **Proposed fix:** change P1-RV2 to:

  > "Tests for features that haven't landed yet use `it.todo('[B6] …')` or `it.fails(…)`. The reviewer turns each into a normal test when its task is completed (P1-RV4)."

  Vitest supports both (https://vitest.dev/api/test).
- **Confidence:** verified

### QA-23 Minor: Q6's coverage thresholds don't say which files count

- **Where:** plan.md:L856
- **Problem:**
  - By default, Vitest's `coverage.include` only counts "files that were imported during test run", so untested files never lower the percentage.
  - Once the real adapters are included, they count as uncovered, because Q7 means they never run in tests.
  - The plan doesn't say whether the 85% target for services applies per file or overall.
- **Evidence:** https://vitest.dev/config/coverage
- **Proposed fix:** configure coverage in Q6 as:
  - `include: ['src/server/**/*.ts']`;
  - exclude the real adapters and `config.ts`;
  - 75% of lines overall;
  - `'src/server/modules/**/service.ts': { lines: 85, perFile: true }`.
- **Confidence:** verified

### QA-24 Minor: `formatDate` writes September as "Sept"

- **Where:** plan.md:L534, L717, L772
- **Problem:**
  - In Node 22 (ICU 77.1, CLDR 47.0), the `en-IN` locale writes "4 Sept 2027". Every other month has three letters.
  - The seed has September departures: Ladakh on 4 Sep 2027 and Spiti on 18 Sep 2027.
  - Mockups, `copy.md` and test assertions written from the plan's examples will say "Sep".
  - Dates won't line up in columns (L717).
- **Evidence:** output of `format.mjs`
- **Proposed fix:**

  > "`formatDate` uses `Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })`, which writes '4 Sept 2027'. Two styles: `full` gives '12 Mar 2027' and `short` gives '5 Dec'. Tests and mockups use `formatDate`'s output, never hard-coded month names."
- **Confidence:** verified for Node 22; unverified for Node 24, which isn't installed here

### QA-25 Major: Many §13 items can't be checked by a test or command, and three have no task that checks them

- **Where:** plan.md:L662, L966, L1003, L1021, L1026–L1060
- **Affects:** P3-LD1, the Phase 2 gate
- **Problem:** the table lists each §13 item that has a gap, what the gap is, and how to close it.

| §13 item | Gap | Fix |
|---|---|---|
| L1030: every S and B ID has a tagged test | B13, B14 ("exactly one place"), B20 ("never `toFixed`"), S18 and S21 are static rules a runtime test can't prove | Name the commands: knip; a `grep passwordChangedAt` outside `model.ts` that must return nothing; an ESLint `no-restricted-syntax` rule for `toFixed` and for "₹" literals outside `format.ts`; a secret scanner |
| L1034: welcome email and reset link | P2-RV1 has no email step | Add it to P2-RV1, reading mail through Mailpit's HTTP API (API unverified) |
| L1035: webhook delivered twice | P2-RV1 uses the fake Stripe client; P3-RV1 has no step that delivers twice | Add to P3-RV1: resend the same event and count bookings |
| L1036: images survive a restart | Compose (L662) has no object store, so the local adapter writes to a filesystem D2 calls read-only; no task checks it | Add an S3-compatible service to compose; script upload, restart, fetch |
| L1037: "no secrets" | No scanner is named | Name one in D11 |
| L1040: client boundaries "as low as possible" | A judgement call; `check-client-boundaries` only checks the comment | Mark it as a reviewer judgement |
| L1041: no page fetches `/api` | No check is defined | An ESLint rule or grep over `src/app` and `src/components` |
| L1044: Leaflet only on tour pages | `check-bundle` excludes lazy chunks (R9), so it can't see Leaflet | A Playwright network assertion on `/` and `/my-tours` |
| L1045: metadata and sitemap | No test is defined | An e2e test for title, description and canonical URL on every route, and a sitemap with all 13 tours |
| L1049: no raw colours or pixel values | stylelint can't see TSX inline styles, SVG, Leaflet options or React Email inline styles (U8) | A grep or ESLint rule for hex colours in TS and TSX, allowing `src/emails` |
| L1050: every component in every state | A judgement call; the 404 check depends on QA-21 | A test that enumerates the U4 component list |
| L1053, L1054: baselines match the direction; emails render | Judgement and a manual check | Mark them as the lead's manual checks |
| L1055: ₹ and IST "on every page and email" | Only the B19 test exists | An e2e scan of every page for "Rs", "INR", "$" and ".00" |
| L1057: no placeholders | No command exists | A grep for lorem, ipsum, John Doe and placeholder in `src`, `docs/design` and `test` |
| L1060: every deviation has an ADR | A process item | Leave it as the lead's sign-off |

- **Confidence:** verified

---

## Can each B requirement, Q6 and Q7 be tested with the §4.5 helpers?

| ID | Verdict |
|---|---|
| B1, B11 | Yes, if `callRoute`'s `path` accepts a query string (QA-17). Page size is covered by QA-11 |
| B2, B5, B12, B17, B18 | Yes |
| B3 | Only once the 2dsphere index has been built (QA-18) |
| B4, B7 | No. They need multipart bodies, or a raw body plus headers (QA-17) |
| B6 | No. `next/cache` throws outside Next.js (QA-16); what to reset to depends on QA-08 |
| B8 | Yes, once the clock can be pinned (QA-20) |
| B9 | Partly. Testing "every environment" needs `APP_ENV` (QA-21) |
| B10 | No, as written (QA-19) |
| B13, B14, B20 | Only partly at runtime; the rest needs static checks (QA-25) |
| B15 | Yes, but the `/me` photo upload needs multipart (QA-17) |
| B16 | No. It needs `createUser({ email })` and built unique indexes (QA-17, QA-18) |
| B19 | Yes, once the month and year boundaries are fixed (QA-10) |
| Q6 | The thresholds are sensible; the configuration needs fixing (QA-23) |
| Q7 | Needs QA-19, QA-20 and QA-21 |

## Small wording fixes

- **L143 and L161** both declare the unique index on `slug`. Declare it once; Mongoose will likely warn about a duplicate index otherwise.
- **L183:** a sparse unique index on `stripeSessionId` still indexes documents where the field is `null` ("even if the index field contains a null value"; https://www.mongodb.com/docs/manual/core/index-sparse/). Two `null` values would collide. Use a partial index on `{ $type: 'string' }`, or never write `null`.
- **L172:** reviews have no `{ user: 1 }` index, but U13 needs to look up which tours a user has reviewed.
- **L167:** say "1–1000 characters after trimming", so a review made only of spaces is rejected.
- **seed/README.md:L31:** "Rajasthan in October to February" is contradicted by the seed: Ranthambore Tiger Safari departs on 15 Apr 2027, and Golden Triangle Heritage, which ends in Jaipur, on 6 Mar 2027. Say "October to April".
- **L755–L756:** the wireframe itinerary doesn't match the seed. It says "Drive along the Alaknanda to Joshimath" and "Walk up to Ghangaria", where the seed says "Drive along the Alaknanda river to Joshimath" and "Drive to Govindghat, then walk up to Ghangaria". Mockups should use the seed text.
- **L857:** `v1.test.ts` and `access-matrix.test.ts` each hold many tests in one file. Add "and every test clears the collections it writes".
- **L609:** run the whole Vitest suite with `TZ=UTC`. This machine's time zone is `Asia/Calcutta`, so date tests can pass locally and still fail in CI.
