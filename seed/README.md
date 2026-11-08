# Seed data

The content Natours v2 starts with: 13 small-group tours across India, the guides who lead
them, travellers who have booked and reviewed them, and freely licensed photos.
`scripts/seed.ts` (plan.md task P1-CA5, requirement D10) loads it.

| File | Contents |
|---|---|
| `data/tours.json` | 13 tours with itineraries, coordinates, start dates, guides and photo credits |
| `data/users.json` | 35 users: 1 admin, 5 lead guides, 9 guides and 20 travellers |
| `data/bookings.json` | 58 paid bookings: 52 past trips (one behind each review) and 6 upcoming |
| `data/reviews.json` | 52 reviews in English, 4 per tour |
| `img/tours/` | 52 photos: a cover and 3 more per tour, at most 1920 px wide |
| `CREDITS.md` | Author, licence and source for every photo |

## How the seed script should load it

- **IDs.** Every document has a fixed `_id` (24 hex characters). Insert them as `ObjectId`s so
  references between files (`guides`, `tour`, `user`) line up and re-running the seed is idempotent.
- **Passwords.** Users have no `password` field. Set every seed user's password from the
  `SEED_USER_PASSWORD` environment variable (required; development and staging only, never
  committed) and hash it once through the model.
- **Emails** use the reserved `example.com` domain, so seed accounts can never receive real mail.
  In development, Mailpit catches everything anyway.
- **Photos.** Upload `img/tours/<file>` to storage under `tours/<file>`; `imageCover`, `images` and
  `photoCredits[].file` all use the file name. Users have no photos; the app shows initials (U4).
- **Dates.** `startDates` and booking `startDate` values are calendar days in India Standard Time
  (`YYYY-MM-DD`); store them as 00:00 IST (B19). `createdAt` values are ISO timestamps with a
  `+05:30` offset.
- **Keeping dates current.** All tour start dates are after 8 November 2026 and fall in each
  region's season (for example Ladakh in June to September, Rajasthan in October to February).
  If any tour start date has passed when the seed runs, move **every** date in every file
  (tour start dates, bookings and reviews) forward by the same whole number of years. Tours then
  stay in season, past trips stay in the past and upcoming bookings stay in the future.
- **Ratings.** `ratingsAverage` and `ratingsQuantity` already match the reviews. Recalculating
  them through the review service after loading should give the same numbers.
- **Prices** are whole rupees (B20). Bookings use currency `inr`.

## Rules the data already follows

- Every review comes from a traveller with a paid booking on a past departure of that tour,
  matching the "only people who booked can review" rule. Each traveller reviews a tour at most once.
- Guides named in a review are the guides assigned to that tour.
- No Golden Triangle departure puts the Taj Mahal visit (day 4) on a Friday, when it is closed.
- Every upcoming booking's start date is one of the tour's start dates.
- Itinerary coordinates come from Wikipedia, or from geotagged Wikimedia Commons photos where
  Wikipedia has none. Day 2 of the Kedarkantha trek (the Juda Ka Talab camp) has no reliable
  coordinates, so it has no map stop; the tour description covers it.
- The people are fictional. Names were chosen to be ordinary Indian names from many regions,
  not real public figures.
