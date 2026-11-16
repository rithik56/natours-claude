# Copy: glossary, voice rules and wording

Documentation only, per DES-12 and U20. `src/lib/messages.ts` does not exist yet — Phase 1 did not create it (02-RESEARCH.md "Copy Governance"). It is created by whichever later phase first throws a user-facing `AppError`, and that phase's code must source its strings from this document's wording table, not from Zod's English default messages (Zod 4.6.7 ships strings like "Too small: expected ... to have >=..." and "Invalid input: expected ..." — these must never reach a user, DES-12).

## Glossary

- **Tour** — a small-group trip across India with a fixed itinerary, a difficulty rating and a price. Seed example: "Valley of Flowers Trek".
- **Start date** — one specific date a tour departs on. A tour can have several start dates; a booking is always for exactly one.
- **Booking** — a traveller's paid reservation on one tour's start date.
- **Guide** — the person who leads the tour; shown with a name and photo on the tour page.
- **Review** — a star rating and comment a traveller leaves after completing a tour they booked.

## Indian English and formatting rules

Transcribed from plan.md §9.2 "Voice and copy":

- Indian English with British spelling: *colour*, *organise*, *travelling* — never *color*, *organize*, *traveling*.
- Plain and specific, in sentence case, written from the traveller's point of view.
- Prices: `₹24,999` and `₹1,24,999` — Indian digit grouping, no decimals. Always produced by `formatPrice()` (`src/lib/format.ts`), never hand-typed.
- Dates: `12 Mar 2027` — day, three-letter month, year always shown. Always produced by `formatDate()`, never hand-typed (01-CONTEXT.md D-01/D-02, DES-14).
- Distances in kilometres, heights in metres — e.g. "89 km", "4,329 m", via `formatDistance()`-equivalent conventions, never miles or feet.
- Never use: "exotic", "mystical", "incredible" — these are the tourism clichés §9.3 rules out.

## Button and message wording rules

- **Buttons say exactly what happens, never "Submit".** An action keeps the same word through the whole flow: "Book this tour" on the tour page → the Stripe Checkout screen → "Booked" on My tours. Other examples: "Save changes" (account forms), "Write a review", "Clear filters", "Log in to book".
- **Errors say what happened and how to fix it, and don't apologise.** No "Oops!", no "Sorry, something went wrong" with nothing else — say the actual problem and the actual next step.
- **Empty states invite the next action.** Example from §9.2: "No tours match these filters. Clear filters." Every empty state in the product follows this shape: state the fact, then name the one action that resolves it.

## Error code wording (plan.md §4.2)

Every `AppError` thrown by a service carries one of these 12 codes (§4.2). The table below is the exact user-facing wording `src/lib/messages.ts` must use for each — specific to this product, not a generic Zod/HTTP default.

| Code | HTTP | User-facing wording |
|---|---|---|
| `VALIDATION_ERROR` | 400 | "Check the highlighted fields and try again." (field-specific wording appears next to each field via `fieldErrors` — see "Field-validation wording" below) |
| `UNAUTHENTICATED` | 401 | "Log in to continue." |
| `INVALID_CREDENTIALS` | 401 | "That email or password is not correct." |
| `TOKEN_EXPIRED` | 401 | "Your session has ended. Log in again to continue." |
| `FORBIDDEN` | 403 | "You don't have access to this." |
| `NOT_FOUND` | 404 | "We couldn't find that page." |
| `CONFLICT` | 409 | "That email is already registered." (used for a duplicate email; "A tour with that name already exists." for a duplicate tour name — wording names the specific conflict, never a generic "Conflict") |
| `PAYLOAD_TOO_LARGE` | 413 | "That file is too large. Choose one under 5 MB." |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | "That file type isn't supported. Choose a JPEG, PNG or WebP image." |
| `RATE_LIMITED` | 429 | "Too many attempts. Try again in a few minutes." (when `retryAfterSeconds` is known: "Too many attempts. Try again in {n} seconds.") |
| `INTERNAL` | 500 | "Something went wrong on our side. Try again in a moment." |
| `SERVICE_UNAVAILABLE` | 503 | "This isn't available right now. Try again shortly." |

## Field-validation wording

These are the specific `fieldErrors` messages for the validation rules plan.md already fixes, shown next to the field they belong to (U16):

| Rule | Field-level wording |
|---|---|
| Password 8–72 characters | "Password must be 8 to 72 characters." |
| Required field left blank | "{Field name} is required." — e.g. "Email is required.", "Tour name is required." |
| Start date not chosen | "Start date is required." |
| Review comment left blank | "Review is required." |
| Duplicate email on sign-up | "That email is already registered." |
| Duplicate tour name | "A tour with that name already exists." |
| Invalid email format | "Enter a valid email address." |
| Price not a positive whole number | "Price must be a whole number of rupees, at least ₹1." |

## Credits (attribution wording)

Seed photos are licensed CC BY, CC BY-SA or similar and require credit (U27). The seed has no author link, so the author is always plain text. Only the licence links out, to its licence text, and on `/credits` the photo title links to its source page. Two wording shapes are used. A caption under a photo reads "Photo: {author}, {licence}". A credit list reads "Photo by {author}, {licence}": the tour page's "Photo credits" section, and each row of the site-wide `/credits` page. The shapes follow the Phase 2 mockups (`docs/design/mockups/tour.html`, `docs/design/mockups/overview.html`), sourced from `seed/CREDITS.md`, with the author link removed.

## Component wording

The `ui/` components render the strings below. They were approved at the Phase 3 design gate, and pages use them exactly (U20). A value in braces is filled in by the page: dates by `formatDate()` and prices by `formatPrice()`. The apostrophe in "You’re" is the typographic one (U+2019), as the booking panel renders it.

### Booking panel and price

| Where | Wording |
|---|---|
| Booking panel, traveller has booked this start date | "You’re booked for {date}." followed by the link "My tours", for example "You’re booked for 17 Jul 2027." |
| Booking panel, no upcoming start dates | "No upcoming start dates for this tour." followed by the link "See other tours" |
| Price beside a tour's start dates | "{price} per person", for example "₹42,999 per person" |

### Empty states

State the fact, then the one action, per the rule above.

| Where | Wording |
|---|---|
| My tours, no upcoming tours | "No upcoming tours yet." followed by the link "See all tours" |
| My tours, no past tours | "No past tours yet." followed by the link "See all tours" |

### Reviews

| Where | Wording |
|---|---|
| Star input, group label | "Rate this tour" |
| Review form, comment label | "Your review" |
| Review form, submit button | "Post review" |
| Your own review, edit link | "Edit review" |
| Your own review, delete button | "Delete review" |

### Guides

| Where | Wording |
|---|---|
| The guide who leads the tour | "Lead guide" |
| Any other guide on the tour | "Guide" |

### Forms and account

| Where | Wording |
|---|---|
| File input for a tour photo, label | "Tour photo" |
| File input, nothing chosen yet | "No photo chosen" |
| Select, disabled, for a tour the traveller has already booked, label | "Tour already booked" |
| Account, button that opens the deactivation dialog | "Deactivate account" |

### Alerts and toasts

| Where | Wording |
|---|---|
| Success alert | "Your changes are saved." |
| Info alert about dates | "Start dates are shown in India Standard Time." |
| Success toast after a review is posted | "Review posted for {tour name}.", for example "Review posted for Kerala Backwaters and Hills." |
| Toast close button, accessible name (the visible mark is ×) | "Dismiss" |

### Tour page, pagination and footer

| Where | Wording |
|---|---|
| Facts strip, group size | "Up to {n} people", for example "Up to 14 people" |
| Pagination, where the reader is | "Page {n} of {total}", for example "Page 1 of 3" |
| Footer, copyright line | "© {year} Natours." with the current year, for example "© 2026 Natours." |
| Link to the credits page | "Read the photo credits" |

### Phase 4 wording (approved 16 Nov 2026, plan 04-01)

The user approved every row below as written on 16 Nov 2026, at the plan 04-01 content checkpoint. Status: **New** = first approved on 16 Nov 2026; **Mockup** = approved in the Phase 2 or Phase 3 mockups and direction, added here because `copy.md` lacked it; **copy.md** = already approved above, listed for the page that uses it.

## Tour list

Rules from the Indian English section apply. Prices only through `formatPrice`, months only through `formatMonth`.

| Element | Wording | Status |
|---|---|---|
| List page heading (`h1`) | "Find your next trip" | Mockup |
| Filter disclosure, no filter active | "Filters" | New |
| Filter disclosure, one or more filters active | "Filters ({n} active)", for example "Filters (2 active)" | New |
| Filter form, accessible name | "Filter tours" | Mockup |
| Field labels | "Difficulty", "Length", "Month", "Max price", "Sort" | Mockup |
| First option of each select (empty value) | "Any difficulty", "Any length", "Any month", "Any price" | Mockup |
| Length options | "3 to 4 days", "5 to 6 days", "7 to 8 days" | New |
| Max price options, built as `Up to {formatPrice(n)}` | "Up to ₹20,000", "Up to ₹30,000", "Up to ₹40,000" | New |
| Month options, built by `formatMonth` | "Nov 2026" style, one per month with an upcoming departure | New (helper) |
| Sort options | "Rating, highest first" (default), "Price, low to high", "Price, high to low", "Length, shortest first", "Length, longest first" | New, except the two price options (Mockup) |
| Filter submit button | "Show tours" | Mockup |
| Result count, paragraph above the list | "{n} tours", "1 tour", "0 tours" | Mockup (plural), New (singular) |
| Empty state, message and action | "No tours match these filters." then "Clear filters" | copy.md |
| List row with no upcoming start date (component change C8) | "No upcoming dates" | New |
| Pagination, text links | "Previous", "Next" (existing `pagination` component text) | New entry |
| Pagination, accessible name of the nav | "Tour pages" | New |

## Tour page

| Element | Wording | Status |
|---|---|---|
| Itinerary heading (`h2`) | "Itinerary" | New |
| Day label in the itinerary | "Day {n}" | Mockup |
| Route map, accessible name | "Route map: {n} stops, days {a} to {b}" | Mockup |
| Section heading (`h2`) | "About this tour" | Mockup |
| Gallery heading (`h2`) | "Photos" | New |
| Guide section heading (`h2`) | "Your guides" | Mockup |
| Reviews heading (`h2`, the anchor `#reviews`) | "Reviews" | Mockup |
| Review pagination, accessible name of the nav | "Review pagination" | Mockup |
| Reviews empty state (plain muted line, no action) | "No reviews yet." | New |
| Photo credits heading (`h2`) | "Photo credits" | Mockup |
| Caption under the cover and each gallery photo | "Photo: {author}, {licence}". The author is plain text; the licence links to its licence text | Mockup (cover), D-09 (gallery) |
| Credit list row | "Photo by {author}, {licence}". The author is plain text; the licence links | copy.md shape, corrected above |
| Rating accessible name, built into `StarRating` | "Rated {value} out of {max}" | Mockup |
| Booking panel field label | "Start date" | Mockup |
| Booking panel link for a signed-out visitor | "Log in to book" | Mockup |

## Credits page

| Element | Wording | Status |
|---|---|---|
| Page heading (`h1`) | "Photo credits" | Mockup |
| Intro line under the heading | "Every photo on Natours is from Wikimedia Commons, used under the licence shown. Photos were resized and saved as JPEG; nothing else was changed." | New |
| Group heading (`h2`) | The tour name, linked to its tour page | Real seed names, no new copy |
| Credit row | The photo title linked to its source page, then "Photo by {author}, {licence}" with the licence linked | copy.md shape, corrected above |

## Page titles and descriptions

Titles use the root template `%s | Natours`, with the default title "Natours". The author and tour descriptions are drafted from the seed; `{summary}` is the tour's real summary.

| Page | Title | Description | Status |
|---|---|---|---|
| `/` | "Small-group tours across India" | "Small-group tours across India, from the high passes of Ladakh to the backwaters of Kerala." | New |
| `/tour/[slug]` | "{tour name}", for example "Ladakh High Passes" | "{tour summary} {n} days, {price} per person." for example "Walk through alpine meadows in full bloom and climb to the glacial lake at Hemkund Sahib. 6 days, ₹18,999 per person." | New (template) |
| `/credits` | "Photo credits" | "Author, licence and source for every photo on Natours." | New |

## Map attribution

| Element | Wording | Status |
|---|---|---|
| Leaflet attribution control, wherever the India boundary is drawn (ADR 0028) | "India boundary: Survey of India, via DataMeet Maps, {licence}", with `{licence}` set to "CC BY-SA 2.5 / ODbL" as ADR 0028 records. The prefix "Leaflet" is switched off | New |

## Tour API messages

These are the messages an API client receives, as `AppError` messages (plan.md §4.2). They follow the same rules as the rest of this document.

| Case | HTTP | Wording | Status |
|---|---|---|---|
| Deleting a tour that has bookings | 409 | "This tour has bookings, so it can't be deleted." | New (no next step proposed yet; see the note below) |
| Images upload with no file | 400 | "Choose a photo to upload." | New |
| An uploaded file without its credit | 400 | "Add a credit for each photo you upload." | New |
| More than one cover in one upload | 400 | "Upload one cover photo at a time." | New |
| More than three gallery images | 400 | "A tour can have up to three gallery photos." | New |
| A credits part that is not valid JSON | 400 | "The credits are not valid JSON. Check the credits and try again." | New |

Note: the 409 message says what happened but not the next step, because the API has no way to cancel a booking in Phase 4. The user approved it as written on 16 Nov 2026. Name the next step once Phase 6 defines it.
