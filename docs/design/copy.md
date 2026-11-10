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
| Duplicate email on sign-up | "That email is already registered." |
| Duplicate tour name | "A tour with that name already exists." |
| Invalid email format | "Enter a valid email address." |
| Price not a positive whole number | "Price must be a whole number of rupees, at least ₹1." |

## Credits (attribution wording)

Seed photos are licensed CC BY, CC BY-SA or similar and require credit (U27). Each tour page's "Photo credits" section and the site-wide `/credits` page use this wording shape for every photo: "Photo by {author}, {licence}" with the author name and licence each linking out — to the photographer's source page and the licence text respectively. This matches the shape already used in the Phase 2 mockups (`docs/design/mockups/tour.html`, `docs/design/mockups/overview.html`), sourced from `seed/CREDITS.md`.
