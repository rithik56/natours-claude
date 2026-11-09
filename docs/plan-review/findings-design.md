# Findings: design

Reviewer: `design` (prefix DES). Scope: §9, §1.2 items 8–11, §7.2 from the user's side, D14, `seed/CREDITS.md`. Round 1, 8 November 2026 (IST). Seed claims come from Python scripts run over `seed/data`. External facts are checked against the URLs cited.

## Checked and correct (no finding)

- **Contrast ratios.** Every ratio in §9.2 (plan.md:L705–L713) recalculates correctly with the WCAG 2.x formula: 12.27, 7.23, 7.91, 7.64, 5.55, 6.07 and 1.60. v1's `#777` on white is 4.478:1, so L675 is right.
- **Wireframe facts.** L738–L755 match `tours.json`: Kerala 5 days, easy, Fort Kochi, 5 Dec, ₹24,999; Ladakh 8 days, difficult, Leh, 12 Jun, ₹42,999; Valley of Flowers medium, 6 days, up to 14, Rishikesh, ★ 4.5, 10 Jul, ₹18,999. The brief's ranges (3–8 days, ₹12,999–₹42,999) also match.
- **Seed prose.** It already follows §9.2: British spelling, metres and kilometres, no "exotic", "mystical" or "incredible", no Rs or $. No seed tour has a `priceDiscount`.
- **Price formatting.** `formatPrice` as specified gives `₹24,999` and `₹1,24,999` (Node 22).
- **Fonts.** Anek Latin and Anek Devanagari are both in `next/font/google` (next 16.4.5 `font-data.json`) with axes `wdth` 75–125 and `wght` 100–800. Semi-condensed (87.5%) is available through `axes: ['wdth']`. Anek Latin has `tnum`. See DES-13 for the subset caveats.

## Findings

### DES-01 Major: The seed's whole-year date shift turns all 52 past trips into upcoming ones
- Where: plan.md:L664 (D10), `seed/README.md`:L30–L34. Affects D10, B19, U13, U14, U26; P1-CA5, P2-RV2.
- Problem: D10 says that if any tour start date has passed, the seed moves every date forward by the same whole number of years, "so tours stay in season and past trips stay in the past". The earliest start date is 21 Nov 2026 (Meghalaya), 13 days from today. All 52 past bookings fall between 10 Jan and 8 Aug 2026.
- Evidence: I simulated a seed run on 22 Nov 2026. N = 1, and all 52 past bookings move to Jan–Aug 2027, which is in the future. Review `createdAt` values (15 Jan–20 Aug 2026) also move into 2027. A run after 21 Nov 2027 needs N = 2. That puts day 4 of all three Golden Triangle departures ("Sunrise at the Taj Mahal") on a Friday (2028-11-28, 2029-01-30, 2029-03-06), breaking the README rule at L44.
- Effect on the build: almost any seed run during the build makes My tours list 52 travellers' finished trips as upcoming. Every seed review is then dated in the future, written by someone whose trip hasn't happened. `canReview` and "Write a review" (U13) behave as if nobody has travelled. Screenshots and e2e tests capture the wrong state.
- Proposed fix (D10, replacing "moves all dates … forward by the same whole number of years"): "Let N be the smallest whole number of years that puts every tour start date after today (IST). Shift tour start dates and upcoming bookings by N years. Shift each past booking and its review by N years if the review's `createdAt` then stays before today, otherwise by N − 1 years. After shifting, the seed checks the README rules (no Golden Triangle day 4 on a Friday, every review after its trip) and fails loudly if one breaks." Mirror this in `seed/README.md`.
- Confidence: verified.

### DES-02 Major: The Tour model has no field for the place name that the overview and facts strip show
- Where: plan.md:L157 (`startLocation` is "GeoJSON Point"), L726, L739/L742/L750. Affects U10, U11, R10; P0-3, P1-WE2, P1-WE3, P1-CA5.
- Problem: each overview row shows a "region" ("Fort Kochi, Kerala"), and the facts strip shows "Rishikesh, Uttarakhand". That text exists only in `startLocation.address` and `startLocation.description`, in all 13 tours. §1.3 defines `startLocation` as a bare GeoJSON Point, and P0-3 says to write the models "exactly as in §1.3".
- Evidence: a script over `tours.json` gives `startLocation` keys `{type, coordinates, address, description}` in 13 of 13 tours.
- Effect on the build: Mongoose's strict mode silently drops `address` and `description` when the seed loads. The overview rows and facts strip then have no place name, and `web` either invents one or reverse-geocodes.
- Proposed fix (§1.3 Tour table): "`startLocation`: GeoJSON Point plus `address` (string, required, for example `Rishikesh, Uttarakhand`, shown on the overview and in the facts strip) and `description` (string)." Add `address` to `toTourSummary` and `toTourDetail`.
- Confidence: verified.

### DES-03 Major: The overview's page size, default sort and tiebreak are undefined, so pages and screenshots are unstable
- Where: plan.md:L808 (U10, "pagination when there are more than 12 tours"), L247 and L601 (`limit` default 20), L591 (B1 default `-createdAt`), L735. Affects U10, B1, B11, U26; P1-CA1, P1-WE2.
- Problem, in three parts:
  1. U10 implies 12 tours per page. The query builder that the overview shares (L241) defaults to 20. Read as written, the 13 seed tours show either no pagination (20 per page) or a page 2 holding one tour (12 per page). `catalog` and `web` will pick differently.
  2. The default sort, `-createdAt`, isn't one of the user's sort options (price, rating, length), so the Sort select can't show the order the user is looking at. The seed inserts all tours in one run, so their `createdAt` values are near-identical and the order is arbitrary.
  3. Ratings tie heavily (eight tours at 4.5, four at 4.8) and lengths tie (6 days ×4, and 7, 5, 4 and 3 days ×2 each). MongoDB says its sort "is not a 'stable sort'" (https://www.mongodb.com/docs/manual/reference/method/cursor.sort/, "Sort Consistency"), so with skip and limit a tour can appear on both pages or on neither.
- Effect on the build: users can miss tours or see duplicates when sorting by rating, and U26 overview screenshots vary between runs.
- Proposed fix: in U10, "The overview shows 12 tours per page (it passes `limit=12`; the API default stays 20)." In B1, "Every sort appends `_id` as the final key. The overview's default sort is 'Next departure' (earliest future start date, then name), and the Sort select lists it first; the API default stays `-createdAt`."
- Confidence: verified (data and MongoDB doc). That the conflict affects the build is likely.

### DES-04 Major: The mobile booking bar is unspecified, and as drawn it fails WCAG 2.2 SC 2.4.11 (Focus Not Obscured)
- Where: plan.md:L727 ("becomes a bar at the bottom of the screen on mobile"), L794 (U1, "one elevation (for overlays only)"), L825 (U22), L632 (R11). Affects U11, U22, U23, U17, R11; PD-4, P1-WE3.
- Problem: the plan doesn't say what the bar contains. It could be the whole form (heading, start-date select, price and button at 44 px each, at 320 px wide, with no JavaScript), or a summary that links to the full panel. It doesn't say how the bar keeps focused controls visible, or where toasts go, since toasts share the single elevation and bottom edge. WCAG 2.2 AA 2.4.11 requires that a focused component is "not entirely hidden due to author-created content". The Understanding document names "sticky footers" as the typical cause. axe can't detect this, so the U22 test passes while the page fails.
- Evidence: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html (Level AA).
- Effect on the build: designer and web build different bars. Tabbing through reviews and credits on a phone hides focused links behind the bar. Toasts collide with it. The bar's skeleton (R4) is undefined.
- Proposed fix: add to §9.2 Layout: "On mobile the booking bar shows the price ('₹18,999 per person') and one 'Choose a start date' link (`href="#book"`) to the full booking panel, which sits in the page flow after the itinerary. The page sets `scroll-padding-bottom` to the bar's height (a token), so a focused element is never hidden behind it. Toasts appear above the bar. The bar, toasts, dialogs and the mobile menu share the one overlay elevation." Add 2.4.11 to U22, checked in the keyboard walkthrough.
- Confidence: verified (WCAG). The design gap is from the plan text.

### DES-05 Major: The Leaflet map can't be styled or made accessible as U3, U22 and WCAG 2.2 require
- Where: plan.md:L796 (U3: component rules in `@layer components`, no `!important`), L825 (U22: 44×44 targets; "doesn't trap keyboard focus"), L629 (R8), L763–L765. Affects U3, U4 (map frame), U22, R8; PD-4, P1-WE3.
- Problem and evidence:
  1. **Cascade layers.** Leaflet's own `leaflet.css` is unlayered. MDN says that "all normal declarations within CSS layers have a lower priority than declarations declared outside of a layer" (https://developer.mozilla.org/en-US/docs/Web/CSS/@layer). With U3's ban on `!important`, the map frame's `@layer components` rules can't override Leaflet: not the zoom buttons, not the attribution colours.
  2. **Target size.** Leaflet 1.9.4 (current `latest` on npm) sizes zoom buttons at `.leaflet-touch .leaflet-bar a { width: 30px; height: 30px }`, which fails U22's 44×44.
  3. **Tab stops.** Markers default to `keyboard: true`, which sets `tabIndex = '0'` and `role="button"` (leaflet-src.js:7915). The eight Ladakh day markers become eight tab stops that do nothing.
  4. **Dragging.** `dragging: true` and `scrollWheelZoom: true` by default. On phones, a one-finger scroll over a full-width map pans the map instead of the page. WCAG 2.2 AA 2.5.7 (Dragging Movements) uses exactly this as its example: "A map allows users to drag the view … and the map has up/down/left/right buttons" (https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
- Effect on the build: the map frame can't be restyled within the CSS rules. The tour page fails the plan's own 44 px rule and 2.5.7, and phone users get stuck scrolling over the map.
- Proposed fix: add to U3, "Third-party CSS (Leaflet) is imported into a `vendor` layer declared before `tokens`, for example `@import 'leaflet/dist/leaflet.css' layer(vendor);`." Platform must confirm the bundler supports `layer()` on imports (unverified). Add to §9.2 Signature: "The map is fitted to the route and is an illustration. The itinerary list is its text alternative. Dragging, scroll-wheel zoom and keyboard focus are off on the map and its markers (`dragging: false`, `scrollWheelZoom: false`, `keyboard: false`). Zoom in and out use 44 px buttons."
- Confidence: verified (Leaflet source and CSS, MDN, WCAG). The `layer()` import support is unverified.

### DES-06 Major: The U27 credits don't meet the photo licences, and two authors would show as truncated sentences
- Where: plan.md:L830 (U27), L109, L155; `seed/CREDITS.md`:L3, L41, L56; `photoCredits` in `tours.json`. Affects U27; P1-WE3, P1-CA5.
- Problem and evidence (Commons `extmetadata` API, all 52 files; licence texts on creativecommons.org):
  1. **Title.** Seven photos are under pre-4.0 licences (6 CC BY-SA 3.0, 1 CC BY 2.0). Those licences require "the title of the Work if supplied" (BY-SA 3.0 §4(c)(ii); BY 2.0 §4(b)). CC's FAQ (https://creativecommons.org/faq/) says: "For versions prior to 4.0, you must also provide the title of the work." U27 asks only for author, licence, licence link and source link.
  2. **Licensor-supplied notices.** Under 4.0 §3(a)(1)(A), you must keep the creator credit "in any reasonable manner requested by the Licensor" and "a copyright notice" if supplied. Ten photos supply one that the seed doesn't carry: © Vyacheslav Argenberg (7 photos); "© Giles Laurent, gileslaurent.com, License CC BY-SA" (2); and for the Taj Mahal cover, "© Yann Forget / Wikimedia Commons", where the seed says only "Yann".
  3. **Modifications.** 4.0 §3(a)(1)(B) says "indicate if You modified the Licensed Material". CC's FAQ gives "cropped a photo" as the example; trivial changes such as format conversion needn't be noted. The overview thumbnails and the wide hero crop the photos. U27 has no modification notice; `CREDITS.md`:L3 mentions resizing, but the site won't.
  4. **Truncated author strings.** The Thar Desert cover and spiti-valley-star-gazer-3 have this author: "This Photo was taken by Timothy A. Gonsalves. Feel free to use my photos, but please mention me as the author. I would". It is a cut-off scrape of the Commons Artist field, and it would display verbatim. That field also says "Please contact me before commercial use". CC BY-SA 4.0 allows commercial use, so this is a request, not a condition.
  5. **Reachability.** The overview shows 13 cover photos but credits them only on `/credits`, and nothing in the plan links to `/credits` (it isn't in the footer spec).
- Effect on the build: the shipped site breaches the licences for at least 17 of the 52 photos. Under 4.0 §6(a), rights terminate on breach until it is cured. A visibly broken credit line appears on two tour pages.
- Proposed fix:
  - (a) Add `copyrightNotice` (optional) to `photoCredits`. Set the authors to "Timothy A. Gonsalves" and "Yann Forget", and fill the ten notices from Commons. Catalog owns `seed/**`.
  - (b) Replace U27's list with: "Each credit shows the title, the author as the licensor asked, any copyright notice, the licence name linked to the licence, and the source link. `/credits` and each Photo credits section say 'Photos have been resized and cropped to fit the page.' The footer links to `/credits`."
  - (c) Decision for the human: keep the two Gonsalves photos (the licence allows commercial use) or replace them or ask him. I recommend asking him and replacing them if he says no.
- Confidence: verified (data, Commons API, licence texts, CC FAQ).

### DES-07 Major: There is no way to credit uploaded or replaced photos, so U27's rule fails after the first admin upload
- Where: plan.md:L155, L238 (`PUT /[id]/images`: multipart files only), L576 (S16: "Images … get random keys"), L830 ("A test checks that every tour photo has a credit"). Affects U27, B4, S4, S16; P1-CA2, P1-WE3.
- Problem: credits match photos by `photoCredits[].file`. Replacing a photo stores it under a new random key, so the old credit points at a file that no longer exists, and the new photo has none. The images endpoint takes no credit fields, and §1.4 doesn't say whether `PATCH /tours/[id]` may set `photoCredits`. The plan exempts "the company's own" photos, but no field marks a photo as the company's own, so the U27 test can't tell which photos need a credit.
- Effect on the build: after any admin image change, `/credits` lists a credit for a removed photo, a new photo shows without credit, and the U27 test either fails or gets weakened.
- Proposed fix: §1.4, `PUT /[id]/images` also takes a `credits` JSON part, one entry per uploaded file (`title`, `author`, `license`, `licenseUrl`, `sourceUrl`, optional `copyrightNotice`, or `own: true`). The service rewrites `photoCredits` in the same update and removes credits for replaced files. U27's test becomes "every key in `imageCover` and `images` has exactly one credit or `own: true`".
- Confidence: verified (plan text).

### DES-08 Major: D14 is mis-scoped: zooming in doesn't avoid the border on the Ladakh route, and the decision isn't the lead's to make
- Where: plan.md:L668 (D14), L942 (P0-7), L56–L61 (prerequisites), L68, L578 (S18), L857 (Q7). Affects D14, S11, S18, Q7, U24, U26; P0-7, P1-WE3.
- Problem and evidence:
  1. **Accuracy.** The plan understates the issue. OSM maps the borders as they are on the ground, following the Line of Control (https://wiki.openstreetmap.org/wiki/Disputed_territories). The OSM wiki's India rendering page says "To comply with Indian law, please use one of the OSM India tileservers or setup your own instance" (https://wiki.openstreetmap.org/wiki/India/Rendering_server). openstreetmap.in, the one India-boundary map it points to, is now an embedded atlas with no documented public tile endpoint.
  2. **The zoom option doesn't work for Ladakh.** Day 5's stop is Pangong Tso at 78.46°E, 33.91°N. Wikipedia gives the lake's centre at 78.90°E, 33.72°N and says the Line of Actual Control "passes through the lake". The route's box is about 89 × 74 km, so a 343 px phone map that fits it needs zoom 8, which shows about ±0.94° of longitude around 77.97°E. That reaches about 78.9°E, where the line crosses the lake. The Line of Actual Control (LAC) is therefore at the edge of, or inside, the route map. That last step is my calculation, so it is "likely". The other tours' borders, such as Bangladesh at Dawki, aren't disputed.
  3. **The lead can't make this decision.** It is a legal and compliance call: Indian rules on depicting boundaries (unverified in detail). Paid providers also need an account, accepted terms and spending. None of that is on the prerequisites list, and L68 leaves "everything else" to the lead.
  4. **Name clash with S18.** A keyed provider's browser key (for example `NEXT_PUBLIC_MAP_TILES_KEY`) fails S18's CI check, which bans `KEY` in `NEXT_PUBLIC_` names, although such keys are public by design.
  5. **OSM tile terms.** OSM's tiles require "a valid HTTP Referer header" from web pages (https://operations.osmfoundation.org/policies/tiles/), which rules out `Referrer-Policy: no-referrer`.
  6. **Tests and dark theme.** Q7 fakes tiles in tests but no mechanism is named, and a dark theme needs dark tiles.
- Effect on the build: the lead writes an ADR choosing "OSM plus zoom", and the Ladakh page ships showing the de facto line. Alternatively, Phase 0 stalls waiting for an account nobody listed.
- Proposed fix: make D14 a decision for the human at the design gate, with the lead preparing the options in Phase 0:
  - **(A)** A commercial tile provider that offers an India view, if one is confirmed. It needs an account, a key exempt from S18 by an explicit allow-list, its CSP host, and a dark style.
  - **(B)** No third-party tiles. Leaflet draws the route and day markers over a simple outline of the state from an official-boundary dataset (the dataset's licence is unverified). This adds no tile host to the CSP, needs no network in CI or Lighthouse runs, needs no key, themes through tokens, and suits the plan's "quiet" direction.
  - **(C)** OSM tiles with locked bounds and zoom. Rejected for Ladakh, per point 2.
  - I recommend (B) for v2.0. Add "map provider account (if D14 chooses one)" to the prerequisites.
- Confidence: verified (OSM wiki and policy, Wikipedia coordinates, seed data, S18 text). The geometry is likely; the specifics of Indian law are unverified.

### DES-09 Major: The design gate shows the human too little, and the task dependencies block `web` for its whole duration
- Where: plan.md:L834–L843 (§9.7), L686, L921 (web brief), L928, L953–L958, L981–L985, L991–L995, L1081–L1083. Affects U1–U8; PD-2, the design gate, P1-WE2 to P1-WE5, and the Phase 1 gate.
- Problem, what the human receives: `direction.md` plus screenshots of static HTML and CSS mockups of two pages. Nothing asks for the dark theme, `copy.md` or the D14 map look. A static mockup can't render a real map, so it gets a grey box, which L686 forbids, or an improvised image. The signature (the line drawing itself in ≤ 1.2 s) can't be judged from a screenshot. There are no approval criteria, and nothing says what happens after "changes".
- Problem, blocking: P1-WE2 to P1-WE5 depend on all of PD-4, the whole component library and styleguide. This contradicts both the web brief's "Before the design gate, build routes, data loading and forms with plain unstyled markup" and PD-4's "deliver in this order so `web` can start early". Agent teams enforce dependencies: "Teammates don't self-claim a blocked task" (https://code.claude.com/docs/en/agent-teams.md). The chain is: PD-1, PD-2, the human (no time limit), PD-3, all of PD-4, then WE2–WE5, then the Phase 1 gate. `web` idles from the end of WE1 until PD-4 finishes, and the designer idles during the wait.
- Effect on the build: the human approves without seeing dark mode, the map or the copy, so changes come after the Phase 2 gate as rework. Phase 1 can't close until the human answers and the component library is done, and idle teammates still cost tokens.
- Proposed fix:
  - (a) §9.7 step 3: "Mockups cover the overview and tour page at 375 and 1280 px in light and dark. The tour page draws the Valley of Flowers route as inline SVG from the seed coordinates, using the D14 option, and animates it with CSS only. The lead gives the human the mockup HTML files to open, the screenshots, `direction.md`, `copy.md`, a contrast table for both themes, and the D14 options. The human's choices are 'approve', 'approve with changes' (the designer revises and the lead re-shows only the changed screens) or 'rework'."
  - (b) Remove PD-4 from the dependencies of WE2–WE5, so that they build unstyled. Split PD-4 into PD-4a to PD-4g in the listed order, and add styling tasks P1-WE2s to P1-WE5s that each depend on their PD-4 parts.
  - (c) When PD-2 is done, the lead tells the human the gate is now the critical path and what is waiting on it.
- Confidence: verified (plan text, agent teams docs).

### DES-10 Major: U26's screenshot baselines can't be produced as described
- Where: plan.md:L829 (U26), L294 and L570 (S2: `/styleguide` is `notFound()` in production), L827 (U24 runs against `next start`), L857 (Q7), L664 (D10). Affects U26, U5, U22, S2; P2-RV2, P2-PL1.
- Problem and evidence:
  1. **The styleguide is unreachable in CI.** Next.js assigns `NODE_ENV` "`production` for all other commands" than `next dev` (https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/02-guides/environment-variables.mdx). A styleguide gated on `NODE_ENV` therefore returns 404 in any test run against a production build. Against `next dev`, the dev indicator appears in the screenshots (bottom-left by default, per the `devIndicators` doc).
  2. **Baselines are per platform.** Playwright names baselines by platform (`…-chromium-darwin.png`) and says to compare "in the same environment where the baseline screenshots were generated" (https://playwright.dev/docs/test-snapshots). The team works on macOS. "Generated in the CI container" has no path for getting the images committed, and D11 names no container image.
  3. **Content depends on the server's clock.** The next start date, which dates count as future, and upcoming versus past bookings all come from the server's clock, plus the D10 shift (DES-01). `page.clock` controls only the browser.
  4. **Tiles and motion.** Tiles are faked by an unnamed mechanism, and the route line animates.
- Effect on the build: the styleguide screenshots fail, or the suite runs on `next dev` and is flaky. Baselines made on a Mac never match CI, and baselines drift as days pass.
- Proposed fix (U26): "Visual tests run against `next build && next start` with `ENABLE_STYLEGUIDE=true`, a config.ts flag that Zod rejects when `APP_ENV=production`. Baselines are generated and compared only in the `mcr.microsoft.com/playwright:<pinned version>-noble` image, locally through `docker run` and in CI through `container:`. The `-linux` baselines are committed. Tests set `TEST_NOW=2026-11-08T10:00:00+05:30`, read through a single `now()` helper that all date logic uses, and `reducedMotion: 'reduce'`, and they route tile requests to a fixture (or need none under D14 option B)."
- Confidence: verified (Next.js and Playwright docs). The clock drift is likely.

### DES-11 Major: U24's Lighthouse targets fail on Best Practices as the plan stands, and Performance ≥ 90 depends on unstated conditions
- Where: plan.md:L827 (U24), L571 (S11), L629 (R8), L800 (U7), L799 (U6). Affects U24, S11, R8, U7; P2-RV2, P2-PL1, P3-RV1.
- Problem and evidence:
  1. **CSP blocks next/image's inline styles.** `next/image` 16.4.5 always writes an inline style: `color: 'transparent'`, plus `position: 'absolute'` for `fill` (`dist/shared/lib/get-img-props.js`:399–410). S11 allows no `'unsafe-inline'` for styles without an ADR, and Next's CSP guide uses `style-src 'self' 'nonce-…'` in production. MDN says "Inline style attributes are also blocked" (style-src page). Every photo then logs a CSP violation, and `fill` photos lose their positioning.
  2. **Best Practices drops below 95.** Lighthouse 13.6.0's Best Practices weights total 27. `errors-in-console` (1) plus `inspector-issues` (1) failing gives 25/27 = 92.6. A blocked or failed tile request in CI does the same.
  3. **The map loads off-screen.** R8's `ssr: false` import still loads Leaflet and its tiles right after hydration, even when the map is below the fold on mobile (photo, facts strip, then map). That competes with the hero photo, the LCP element, on Lighthouse's throttled mobile profile.
  4. **CI setup is unstated.** Running LHCI against `next start` needs Mongo, Redis, seeded data and image storage that `next/image` can reach. None of that is described for CI.
  5. **Fonts.** A preloaded Anek Devanagari file would add 726 KB (DES-13).
  6. Accessibility 100 is realistic. Lighthouse's `target-size` audit checks 24 px, so Leaflet's 30 px buttons pass it.
- Effect on the build: the U24 gate fails in CI with no code defect a teammate can find quickly, and photos may render broken under the strict CSP.
- Proposed fix:
  - (a) Record now, as an ADR, either `style-src 'unsafe-inline'` (needed by `next/image`) or a tested alternative.
  - (b) R8: "`RouteMap` imports Leaflet only when the map frame comes within one viewport (`IntersectionObserver`)."
  - (c) U24: "LHCI runs against a production build with Mongo and Redis services, the seed, the test clock and the tile fixture (or D14 option B), and asserts categories with the default 3 runs."
  - (d) U6 wording per DES-13.
- Confidence: verified (Next.js source, Lighthouse config, MDN). The performance impact is likely.

### DES-12 Major: User-facing messages come from schemas and services owned by other teammates, so U20's copy rules can't hold
- Where: plan.md:L818 (U20: "Pages use exactly that wording"), L815 (U17), L774 (errors "say what happened and how to fix it"), L490 (`AppError(code, message)`), L330 (Zod everywhere), L888 (designer owns `docs/design/**`). Affects U16, U17, U20, B9, B16; P1-ID*, P1-CA*, P1-CO*, P2-WE1.
- Problem: field errors shown next to fields (U16) are Zod messages written in `schemas.ts` by identity, catalog and commerce. Action and API errors are `AppError` messages written in services. Neither is required to use `copy.md`. Zod 4.6.7's English defaults read like "Too small: expected ${origin} to have >=${minimum} ${unit}" and "Invalid input: expected …" (`zod/v4/locales/en.js`:82, :65).
- Effect on the build: login, signup and checkout show machine wording, and fixing it later touches every module's schemas.
- Proposed fix: add to U20, "`copy.md` lists the message for every §4.2 error code and every field rule. The lead adds `src/lib/messages.ts` (lead-owned, words written by the designer), and schemas and `AppError` calls take their messages from it. For example: 'Your password needs 8 to 72 characters.', 'That email already has an account. Log in instead.', 'Choose a start date for this tour.'" Add to the DoD: "no Zod default message reaches the UI."
- Confidence: verified (plan text, Zod source).

### DES-13 Minor: The fonts are available, but ₹ isn't in the Latin subset and the Devanagari file is large
- Where: plan.md:L333, L716, L799 (U6: "only the weights and subsets the design uses (Latin now; Devanagari ready …)"). Affects U6, U24, B20; PD-3.
- Problem and evidence: Google Fonts' CSS for Anek Latin puts U+20B9 in latin-ext (`U+20AD-20C4`), not latin. fontTools confirms that the latin file (104 KB) lacks ₹ and the latin-ext file (83 KB) has it. `next/font` self-hosts every subset but preloads only the listed ones (`loader.js`:102). With `subsets: ['latin']`, every ₹ on the page loads a second file late and briefly renders in the fallback font. For a variable font with `axes: ['wdth']`, `next/font` downloads the full 100–800 weight range, so "only the weights the design uses" can't be met. Anek Devanagari's devanagari file is 726 KB.
- Effect on the build: ₹ visibly swaps fonts in prices, and preloading a Devanagari face "to be ready" breaks the mobile performance budget.
- Proposed fix (U6): "Anek Latin with `axes: ['wdth']` and `subsets: ['latin', 'latin-ext']` (latin-ext carries ₹). Anek Devanagari isn't loaded until Hindi ships."
- Confidence: verified.

### DES-14 Minor: `formatDate` in `en-IN` gives "4 Sept 2027", and the wireframes drop the year with no rule for when
- Where: plan.md:L534, L772, L717, L738 and L753 ("5 Dec", "10 Jul"). Affects B19, U20; P0-2, PD-1.
- Evidence: Node 22, `en-IN`, `{day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Kolkata'}` gives "4 Sept 2027" against "12 Mar 2027". Two tours start in September (Ladakh 4 Sep, Spiti 18 Sep 2027).
- Effect on the build: date columns misalign by a character, tests written to the three-letter pattern fail, and the year-less style has no rule even though start dates span Nov 2026 to Oct 2027.
- Proposed fix: §9.2 rule: "Months are three letters ('Sep'); `formatDate` builds the string from `formatToParts`. The short style (no year) is used only in overview rows and the start-date select, and only when every date shown is within the next 12 months."
- Confidence: verified (Node output). Browser ICU differences are unverified.

### DES-15 Minor: "No other part of the site uses numbered markers" conflicts with pagination and the overview's day markers
- Where: plan.md:L764, L726 ("a small milestone marker with the length in days"), L808 (pagination). Affects U4, U10.
- Problem: page numbers are numbered markers, and the overview rows use the same milestone shape with a number in it.
- Proposed fix: L764 becomes "No other part of the site uses the numbered milestone marker for sequence. Overview rows use the milestone shape for the length ('5 days') only. Pagination is 'Previous' and 'Next' with 'Page 1 of 2'."
- Confidence: verified (plan text).

### DES-16 Minor: The wireframes omit things that U10, U11 and R11 require
- Where: plan.md:L729–L760. Affects U10, U11, R11; PD-1, PD-2.
- Problem: the overview has no submit button, which a GET filter form needs without JavaScript (`FilterAutoSubmit` is optional, L638). It has no "Clear filters" and no pagination. On the tour page, "Your guides   Reviews   Photo credits" on one line reads as tabs, which would need client state not listed in §7.2. The booking panel shows only the logged-in, not-yet-booked state.
- Proposed fix: add "[Show tours]", "Clear filters" and the pagination line to the overview wireframe. Draw the guides, reviews and credits as stacked sections. Note the "Log in to book", "You've booked this tour (see My tours)" and no-dates (DES-17) states.
- Confidence: verified.

### DES-17 Minor: There's no state for a tour with no future departures
- Where: plan.md:L726, L809 (U11). Affects U10, U11.
- Evidence: the last start dates are Hampi 28 Jan 2027; Kedarkantha, Kerala and Thar Feb 2027; Golden Triangle and Meghalaya Mar 2027; Andaman, Ranthambore and Rishikesh Apr 2027. Nine of the 13 tours have no future dates by May 2027 unless the data is refreshed.
- Effect on the build: the panel renders an empty select with "Book this tour", and the overview row's "next start date" is blank.
- Proposed fix (U11): "With no future dates, the panel says 'No departures scheduled yet' and has no button. The overview row shows the same in place of the date. The month filter lists only months that have future departures."
- Confidence: verified.

### DES-18 Minor: The Kedarkantha itinerary jumps from Day 1 to Day 3
- Where: plan.md:L158, L727; `seed/README.md`:L47–L48. Affects U11, U22 (the itinerary is the map's text alternative).
- Evidence: Kedarkantha's `locations[].day` values are [1, 3, 4, 5, 6]. Day 2 (Juda Ka Talab) has no coordinates, so it has no entry at all.
- Proposed fix: allow a `locations` entry without `coordinates` (an itinerary day with no map stop), add Day 2 "Walk up through oak and pine forest to the Juda Ka Talab camp" to the seed, and have the itinerary list every day from 1 to `duration`.
- Confidence: verified.

### DES-19 Minor: U1's "no raw hex or pixel values outside tokens.css" can't hold for emails or JavaScript, and Mailpit can't show mail clients' dark modes
- Where: plan.md:L794 (U1), L801 (U8), L1049. Affects U1, U8; PD-5.
- Evidence: caniemail (https://www.caniemail.com/api/data.json) lists CSS custom properties as unsupported in Gmail, Outlook and Yahoo, so emails need literal colours. Leaflet's icon sizes and line weights and `next/image` `width` and `height` are pixel numbers in TS. Mailpit offers an HTML compatibility check and screenshots, but not client dark-mode rendering (Mailpit README).
- Proposed fix: U1 applies to CSS files under `src/`. Emails import colour constants from `src/emails/tokens.ts`, kept in step with `tokens.css`. Media queries use `em` breakpoints from `direction.md`. U8's dark check uses Mailpit's HTML check plus a manual send to one Gmail app account in dark mode.
- Confidence: verified.

### DES-20 Minor: A single Neel focus ring is invisible on a Neel header
- Where: plan.md:L698 (Neel: "Headings, primary text, header, focus ring"), L825. Affects U1, U22.
- Evidence: Neel on Neel is 1:1, and Neel on State green is 2.21:1. If "header" means the header's background, header links can't show U22's 3:1 indicator.
- Proposed fix: "`--color-focus` is Neel on light surfaces and Highway yellow on Neel surfaces (7.64:1), with a 2 px offset."
- Confidence: likely (depends on what "header" means).

### DES-21 Minor: Some U22 claims don't match WCAG 2.2 or aren't tested
- Where: plan.md:L825, L827.
- Evidence: 44×44 is SC 2.5.5 at Level AAA. AA is 2.5.8 at 24×24 (W3C Understanding pages). axe and Lighthouse check only 24 px, so the 44 px rule is untested. Contrast for text over photos (the hero's tour name) is reported by axe as needing review, not as a failure. U22's threshold (axe: no serious or critical issues) also differs from U24's Accessibility 100.
- Proposed fix: "Touch targets are at least 44×44 (a house rule beyond AA), except inline links in text. The walkthrough checks them, along with 2.4.11 and text over photos (which needs a scrim token)."
- Confidence: verified.

### DES-22 Minor: "Social preview images for every page" is defined only for tour pages
- Where: plan.md:L108, L631 (R10). Affects R10; P1-WE1.
- Proposed fix: "Other public pages use the Valley of Flowers cover (credited on `/credits`) as the default Open Graph image."
- Confidence: verified.

## Wording fixes

- L713: say whether the yellow "Book this tour" button needs a Neel border. Under WCAG 1.4.11 its text is enough, but the sentence as written forbids a yellow-only edge.
- L721: "Sentence case everywhere, except proper names (Valley of Flowers Trek, Hemkund Sahib, Natours)."
- L726: "the 'from' price" becomes "the price per person". There is one price per tour, and no seed tour has a discount.
- L754 and L756: quote the seed exactly: "Drive along the Alaknanda river to Joshimath" and "Drive to Govindghat, then walk up to Ghangaria".
- L810 (U12): "the confirmation email is on its way" promises something that's false if the webhook failed. Use "We're still confirming your payment. We'll email you as soon as it's confirmed."
- L813 (U19) and L644: an "account menu" needs client state or `<details>`. Say which, and where the `logoutAction` button sits.
- L798 (U5): say how hover, focus and active states are shown, for example through Playwright interactions rather than state classes inside components.
- L830 (U27): replace "CC BY, CC BY-SA or similar" with the exact set: CC BY-SA 4.0 (37), CC BY 4.0 (8), CC BY-SA 3.0 (6), CC BY 2.0 (1).
- `seed/CREDITS.md`:L3: add that the site resizes, crops and converts the photos to WebP or AVIF.
