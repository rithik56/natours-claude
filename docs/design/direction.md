# Design direction: "Milestone"

Written for the Phase 2 design gate (plan.md §9.7 step 1). Per locked decision D-01 (`.planning/phases/02-design-direction-and-approval-gate/02-CONTEXT.md`), this document transcribes plan.md §9.2's "Milestone" direction as specified — the palette, type, layout concept and signature element are not changed — and extends it only where §9.2 explicitly leaves the extension to the designer: the dark theme, the status colours, the font configuration, two additional wireframe pages, and the self-review.

## Brief

Natours v2 sells small-group tours across India: Himalayan treks and high passes in Uttarakhand, Ladakh and Spiti, the backwaters and tea hills of Kerala, the Thar Desert, the Andaman Islands, the heritage cities of the Golden Triangle and Hampi, tea country in Darjeeling and Sikkim, tiger country at Ranthambore, the living root bridges of Meghalaya and white water at Rishikesh. Tours run 3 to 8 days, cost ₹12,999 to ₹42,999, and are rated easy, medium or difficult.

The audience is Indian travellers in their 20s to 50s, planning on a phone. They are deciding whether a tour fits their fitness, their dates and their budget, and whether it's the right season — so the interface's first job is to answer those questions as plainly as possible, not to impress.

The primary job is to help someone choose a tour that fits and book a start date with confidence. The secondary jobs are seeing and managing bookings, leaving a review after a trip, and managing the account. Every screen in this document is built from the 13 real seed tours — their real names, places, itineraries, guides, reviews and photos — because plan.md's content rule (§9.1) forbids placeholder content anywhere a person can see it, including in this document and its mockups.

The idea behind "Milestone": all over India, roadside milestones tell travellers where they are and how far they have left — a whitewashed stone, a coloured cap, a place name, a distance in kilometres. The interface borrows that plain, legible way of giving directions. The photography carries the colour and the drama; the interface stays quiet.

## Palette and contrast

The six named colours are transcribed from plan.md §9.2 without change:

| Name | Hex | Role |
|---|---|---|
| Neel | `#1F2B4D` | Headings, primary text, header, focus ring |
| Slate | `#45505E` | Body text |
| Whitewash | `#EEF1F5` | Page background |
| Paper | `#FAFBFC` | Surfaces: forms, panels, booking panel |
| Highway yellow | `#F2B705` | The single accent: the main "Book" button and the route line on the map |
| State green | `#2F6B4F` | Secondary: success messages and selected filters |

Measured contrast ratios, transcribed from §9.2:

| Pairing | Ratio |
|---|---|
| Neel on Whitewash | 12.27:1 |
| Slate on Whitewash | 7.23:1 |
| Slate on Paper | 7.91:1 |
| Neel text on Highway yellow | 7.64:1 |
| State green text on Whitewash | 5.55:1 |
| Paper text on State green | 6.07:1 |

Highway yellow on Whitewash is only 1.6:1, so Highway yellow is never used for text and never as the only thing marking an edge. A yellow button always has Neel text. On the map, the route line gets a Neel outline so it stands out against the map background.

## Dark theme and status colours (derived)

§9.2 leaves deriving the dark theme and status colours to the designer. The method: each light-theme colour was converted to HSL. Backgrounds and surfaces keep Neel's hue (≈224°, indigo) and lower its lightness — 9% for the background, 14% for the surface — preserving the light theme's own relationship of the surface sitting slightly lighter than the background (Paper above Whitewash). For text, the lightest light-theme roles swap into the darkest-theme text roles: Whitewash itself becomes dark-theme primary/heading text, and Slate's hue is kept but lightened (HSL lightness 32% → 72%) to give a muted but legible body colour against the new dark background. Highway yellow is unchanged, since it already reads clearly on both a light and a dark surface. State green keeps its hue and saturation and is lightened (HSL lightness 30% → 55%) until its contrast against the new dark background matches or exceeds its light-theme ratio.

§9.2 names no caution/error colour — none of the six named colours is used for form or validation errors, and U16/U22 require one. A caution red was added at the same lightness discipline as State green: deliberately dark and low-saturation, in the spirit of a roadside hazard sign rather than a bright warning red, so it doesn't reintroduce §9.3's rejected "bright red accent" look. Its dark-theme value follows the same lighten-for-dark-background rule as State green.

All ratios below were computed with the WCAG relative-luminance formula — the same method that reproduces §9.2's own six ratios when applied to the light-theme hex values above, which was used as a self-check before deriving the new ones.

| Role | Light hex | Dark hex | Notes |
|---|---|---|---|
| Background | Whitewash `#EEF1F5` | `#0D1221` | Dark bg: Neel hue, HSL L 9% |
| Surface | Paper `#FAFBFC` | `#141D33` | Dark surface: Neel hue, HSL L 14% |
| Primary/heading text | Neel `#1F2B4D` | `#EEF1F5` | Dark text reuses Whitewash's hex; 16.47:1 on dark bg, 14.79:1 on dark surface |
| Body text | Slate `#45505E` | `#ADB6C3` | Slate hue lightened to HSL L 72%; 9.11:1 on dark bg, 8.18:1 on dark surface |
| Accent | Highway yellow `#F2B705` | `#F2B705` | Unchanged; 10.26:1 as text/icon on dark bg (button fill keeps Neel text, 7.64:1, in both themes) |
| Success / selected | State green `#2F6B4F` | `#5FB98F` | State green hue lightened to HSL L 55%; 7.84:1 on dark bg |
| Caution / error (new) | `#7E2C25` | `#D37269` | Low-saturation brick red, HSL(5°, 55%, 32%); 8.1:1 on Whitewash. Dark value lightened to HSL L 62%; 5.67:1 on dark bg |
| Focus ring | Neel `#1F2B4D` | Highway yellow `#F2B705` | Light mode reuses the darkest/most prominent colour (Neel); dark mode reuses the most prominent colour against a dark background (Highway yellow) |

Both themes meet WCAG AA (4.5:1 text, 3:1 UI elements) on every pairing above, satisfying U2 and U22.

## Type

One family in two widths, transcribed from §9.2 without change: **Anek Latin** set narrow (semi-condensed, semibold) for display and headings, and at normal width for body text. **Anek Devanagari** is the same design for Hindi, so the site can add Hindi later without changing fonts.

Both are confirmed available through `next/font/google` (DES-13, 02-RESEARCH.md "Fonts"). The recorded configuration:

```ts
// src/styles/fonts.ts
import { Anek_Latin } from 'next/font/google';

const anekLatin = Anek_Latin({
  subsets: ['latin', 'latin-ext'], // latin-ext carries U+20B9 (₹)
  axes: ['wdth'],                   // semi-condensed via the width axis
});
```

Anek Devanagari is not loaded yet — it is added, with the same `subsets`/`axes` shape, only when Hindi ships (U6).

Prices, days and dates line up in columns using tabular figures where the font provides them, otherwise aligned with the layout (`formatPrice`/`formatDate` from `src/lib/format.ts` are the only approved sources of these strings — see `formatPrice(24999)` → `₹24,999`, `formatDate(...)` → `5 Dec 2026`, three-letter month, year always shown).

Scale, ratio 1.25 from a 1rem (16px) body size, transcribed from §9.2:

| Step | rem | px (at 16px root) |
|---|---|---|
| 1 | 0.8 | 12.8 |
| 2 (body) | 1 | 16 |
| 3 | 1.25 | 20 |
| 4 | 1.563 | 25 |
| 5 | 1.953 | 31.25 |
| 6 | 2.441 | 39.06 |
| 7 | 3.052 | 48.83 |
| 8 | 3.815 | 61.04 |

Line height: 1.55 for body text, 1.1 for headings. Paragraphs are 45–75 characters wide. Sentence case everywhere, including headings and buttons.

## Breakpoints

Custom properties can't be used in media queries (U1), so the one breakpoint this phase uses is documented here for Phase 3 to read: **64em** (1024px at the default 16px root) marks the start of the 12-column grid (§9.2 "Content is at most about 72rem wide, on a 12-column grid from 64em up"). Below 64em, layout is a single column, mobile-first. The mockups built in plan 02-01 use this single breakpoint; U23's four audit widths (375, 768, 1280, 1920px) are checks that the layout holds at those sizes, not additional token-level breakpoints — 768px and 1280px both sit above the 64em threshold, so they render the same desktop layout as 1920px, and 375px renders the mobile layout.

## Layout and wireframes

Mobile-first and left-aligned throughout. Content is at most about 72rem wide.

### Overview

```
Overview (mobile, <64em)
┌──────────────────────────┐
│ ☰  Natours                │
├──────────────────────────┤
│ Find your next trip       │
│ [Difficulty ▾]            │
│ [Length ▾]                │
│ [Month ▾]                 │
│ [Max price ▾]             │
│ [Sort ▾]                  │
│ [ Show tours ]             │
│ 13 tours                  │
├──────────────────────────┤
│ [ photo             ]     │
│ [5 days]                  │
│ Kerala Backwaters and     │
│ Hills                     │
│ Fort Kochi, Kerala        │
│ ▲ Easy       5 Dec        │
│              ₹24,999      │
├──────────────────────────┤
│ [ photo             ]     │
│ [8 days]                  │
│ Ladakh High Passes        │
│ Leh, Ladakh                │
│ ▲▲▲ Difficult   12 Jun     │
│                 ₹42,999    │
├──────────────────────────┤
│ [ Previous ]  Page 1 of 2  │
│             [ Next ]       │
└──────────────────────────┘

Overview (desktop, ≥64em)
┌────────────────────────────────────────────────────────────────────────┐
│ Natours                                      Tours  My tours  Account  │
├────────────────────────────────────────────────────────────────────────┤
│ Find your next trip                                                    │
│ [Difficulty ▾] [Length ▾] [Month ▾] [Max price ▾] [Sort ▾] [Show tours]│
│ 13 tours                                               [ Clear filters]│
├────────────────────────────────────────────────────────────────────────┤
│ [photo]  [5 days]  Kerala Backwaters and Hills   ▲ Easy      5 Dec     │
│                    Fort Kochi, Kerala                       ₹24,999    │
├────────────────────────────────────────────────────────────────────────┤
│ [photo]  [8 days]  Ladakh High Passes            ▲▲▲ Difficult 12 Jun  │
│                    Leh, Ladakh                              ₹42,999    │
├────────────────────────────────────────────────────────────────────────┤
│                         [ Previous ]  Page 1 of 2  [ Next ]            │
└────────────────────────────────────────────────────────────────────────┘
```

The "Show tours" button submits the filters as a GET form (U10, R11 — works without JavaScript); "Clear filters" appears once any filter is set, linking back to the unfiltered URL; pagination is "Previous"/"Next"/"Page N of M" text, never a numbered marker (DES-15 — day numbers are reserved for the tour page's itinerary, §9.2 "No other part of the site uses numbered markers").

### Tour page

```
Tour page (mobile, <64em)
┌──────────────────────────┐
│ [ cover photo        ]    │
│ Valley of Flowers Trek    │
├──────────────────────────┤
│ ▲▲ Medium   6 days        │
│ Up to 14 people           │
│ Rishikesh, Uttarakhand    │
│ ★ 4.5                     │
├──────────────────────────┤
│ [ map: route line        │
│   through day markers ]  │
│   1 ── 2 ── 3 ── 4        │
├──────────────────────────┤
│ Day 1  Drive along the     │
│        Alaknanda to       │
│        Joshimath          │
│ Day 2  Walk up to          │
│        Ghangaria          │
├──────────────────────────┤
│ About this tour            │
│ (max 75 characters a line) │
├──────────────────────────┤
│ Your guides                │
├──────────────────────────┤
│ Reviews                    │
│ [ Previous ] Page 1 of 2   │
│              [ Next ]      │
├──────────────────────────┤
│ Photo credits               │
├──────────────────────────┤
│ Book this tour              │ ◄ bottom bar, sticks to
│ Start date [10 Jul ▾]       │   the bottom of the screen
│ ₹18,999 per person          │
│ [ Book this tour ]          │
└──────────────────────────┘

Tour page (desktop, ≥64em)
┌────────────────────────────────────────────────────────────────────────┐
│ [ wide photo                                                         ] │
│ [ Valley of Flowers Trek                                             ] │
├────────────────────────────────────────────────────────────────────────┤
│ ▲▲ Medium   6 days   Up to 14 people   Rishikesh, Uttarakhand   ★ 4.5  │
├─────────────────────────────────────────────┬──────────────────────────┤
│ [ map: route line through day markers     ] │ Book this tour           │
│ [ 1 ── 2 ── 3 ── 4                        ] │ Start date [10 Jul ▾]    │
│ Day 1  Drive along the Alaknanda to         │ ₹18,999 per person       │
│        Joshimath                            │ [ Book this tour ]       │
│ Day 2  Walk up to Ghangaria                 │                          │
│ About this tour (max 75 characters a line)  │                          │
│ Your guides                                 │                          │
│ Reviews                                     │                          │
│ [ Previous ]  Page 1 of 2  [ Next ]         │                          │
│ Photo credits                               │                          │
└─────────────────────────────────────────────┴──────────────────────────┘
```

Guides, reviews and photo credits are stacked sections in reading order, not tabs — there is no client-state tab switcher anywhere on the page (DES-16). The booking panel is sticky on the side on desktop and a bar at the bottom of the screen on mobile (§9.2), and has four distinct states (DES-17):

1. **Future start dates, logged in, not booked** — a start-date select, the price, and "Book this tour" (shown above).
2. **Logged out** — the same list of dates, but the button reads "Log in to book", which returns the user to this tour after logging in (S22).
3. **Already booked** — the panel says so ("You're booked for 10 Jul 2027") and links to My tours, instead of showing the date select again.
4. **No future start dates** — an empty state in the panel's place: "No upcoming start dates for this tour." with no date select or button.

### My tours

```
My tours (mobile, <64em)        My tours (desktop, ≥64em)
┌──────────────────────────┐    ┌────────────────────────────────────────┐
│ ☰  Natours                │    │ Natours      Tours My tours Account   │
├──────────────────────────┤    ├────────────────────────────────────────┤
│ My tours                  │    │ My tours                               │
│ Upcoming                  │    │ Upcoming                               │
├──────────────────────────┤    ├────────────────────────────────────────┤
│ Valley of Flowers Trek    │    │ Valley of Flowers Trek   10 Jul 2027    │
│ 10 Jul 2027               │    │                          ₹18,999 paid  │
│ ₹18,999 paid              │    │                          [ View tour ] │
│ [ View tour ]              │    ├────────────────────────────────────────┤
├──────────────────────────┤    │ Past                                    │
│ Past                       │    ├────────────────────────────────────────┤
├──────────────────────────┤    │ Kerala Backwaters and    2 Jan 2026     │
│ Kerala Backwaters and      │    │ Hills                    ₹24,999 paid  │
│ Hills                       │    │                [ View tour ]           │
│ 2 Jan 2026                 │    │                [ Write a review ]      │
│ ₹24,999 paid                │    └────────────────────────────────────────┘
│ [ View tour ]                │
│ [ Write a review ]           │
└──────────────────────────┘
```

Upcoming and past bookings are in separate groups (U13). Each row shows the start date, the price paid (`formatPrice`) and a link to the tour. Past tours offer "Write a review" only when the user hasn't already reviewed that tour. An empty group (no upcoming, or no past bookings yet) reads "No upcoming tours yet." or "No past tours yet." with a link to the tours overview.

### Account

```
Account (mobile, <64em)          Account (desktop, ≥64em)
┌──────────────────────────┐     ┌────────────────────────────────────────┐
│ ☰  Natours                │     │ Natours      Tours My tours Account    │
├──────────────────────────┤     ├────────────────────────────────────────┤
│ Account                   │     │ Account                                │
├──────────────────────────┤     ├────────────────────────────────────────┤
│ Details                   │     │ Details                [ Photo       ] │
│ Name  [___________]       │     │ Name  [___________]    [  preview  ]  │
│ Email [___________]       │     │ Email [___________]    [ Choose file] │
│ [ Save changes ]           │     │ [ Save changes ]        [ Save photo]│
├──────────────────────────┤     ├────────────────────────────────────────┤
│ Photo                      │     │ Password                               │
│ [ preview ]                 │     │ Current  [___________]                │
│ [ Choose file ]              │     │ New      [___________]                │
│ [ Save photo ]               │     │ [ Save changes ]                     │
├──────────────────────────┤     ├────────────────────────────────────────┤
│ Password                     │     │ Deactivate account                   │
│ Current [___________]        │     │ [ Deactivate account ]               │
│ New     [___________]        │     └────────────────────────────────────────┘
│ [ Save changes ]              │
├──────────────────────────┤
│ Deactivate account             │
│ [ Deactivate account ]          │
└──────────────────────────┘
```

Details, photo, password and deactivation are separate sections (U15). On desktop, details and photo sit side by side since they're both "who you are"; password and deactivation each get their own full-width row since they're one-off actions, not things edited together. The photo section always shows a preview before upload. Deactivating opens a confirm dialog (native `<dialog>`, U4) that says what will happen before the account is deactivated.

## Signature element: the route as milestones

On the tour page, the map draws the itinerary as a Highway yellow line with a Neel outline, so it stands out against the map's own background colours. Each day's stop is a small milestone-shaped marker carrying the day number, matching the day-by-day list beside it. Day numbers appear here, and only here, because the itinerary really is a sequence — no other part of the site uses numbered markers (§9.3, DES-15).

When the map first comes into view, the line draws itself once along the route in at most 1.2 seconds. With `prefers-reduced-motion`, it appears already drawn — no animation plays. This is the one place the design is bold; everything else, including the rest of this document's layout and colour choices, stays quiet (§9.2, U25).

Plan 02-01 already built a working version of this element as data-driven inline SVG (coordinates scaled from a real tour's own `locations` day coordinates into a fixed viewBox, per `docs/design/mockups/tour.html`) for the mockups — this document describes the same element as it will exist once Leaflet renders the real map in Phase 4.

## Difficulty

Shown as one, two or three small peaks, always together with the word: easy, medium, difficult. The number of peaks carries the meaning, so colour is never the only signal (§9.2, U22).

## Self-review against §9.3 "Defaults to avoid"

Every item in plan.md §9.3 is checked below. Per D-01, direction choices already specified in plan.md §9.2 don't need a deviation ADR even where the self-review's answer below explains why they're fine — only a genuinely new change would need one, and none was needed.

| §9.3 item | Present in this direction? |
|---|---|
| Cream background with a high-contrast serif and a terracotta accent; near-black with acid-green/bright red; newspaper layout with thin rules and dense columns | **Not present.** The palette is a cool blue-grey (Whitewash/Paper) with one warm accent (Highway yellow) and one muted secondary (State green); the type is Anek, not a serif; there is no dense-column newspaper layout anywhere in the wireframes above. |
| The SaaS card kit: everything in identical rounded cards with the same soft grey shadow, one border radius on everything, gradient washes as decoration | **Not present.** The overview is a list of rows, not a grid of cards (§9.2 "the road ahead"); U1 caps radius at two values each with a stated use, and U1 forbids raw values outside `tokens.css`, which rules out an undifferentiated card grid by construction. No gradients appear anywhere in this document. |
| ALL-CAPS labels above headings, middle-dot-joined details, "Word — fragment" labels, near-black `#111`, monospace for small labels, "→" on buttons/links | **Not present.** Headings and labels above are sentence case throughout (e.g. "Find your next trip", not "FIND YOUR NEXT TRIP"); facts are shown in columns or on separate lines, not joined with "·"; Neel (`#1F2B4D`) is the darkest colour used, never near-black `#111`; no monospace type is introduced; button labels above read "Book this tour", "Show tours", "Save changes" — none end in "→". |
| Headlines with one word picked out in italic, bold or another colour | **Not present.** No wireframe above shows a headline with a differently styled word; this would also contradict "colour is never the only signal" (U22). |
| Numbered markers (01, 02, 03) on content that isn't a sequence | **Not present** on anything but the tour-page itinerary. The overview uses no numbers on its rows (plain rows); pagination uses "Previous"/"Next"/"Page N of M" text (DES-15), not numbered markers, on both the overview and the reviews list. |
| Every section fading/sliding up on scroll; cards that lift or grow on hover | **Not present.** U25 permits only one self-playing motion (the route line) and caps all other motion at 200ms, triggered by something the user did, never by scroll. |
| India tourism clichés: saffron/white/green as decorative palette; mandala/paisley/rangoli ornament; Taj Mahal/elephant/lotus silhouettes; "exotic"/"mystical"/"incredible" copy; Latin fonts dressed up as Devanagari | **Not present.** The palette's green (State green, `#2F6B4F`) is a muted, functional success/secondary colour sourced from state-highway milestone caps, not a saffron-white-green tricolour composition; no ornamental patterns or cliché silhouettes appear in any wireframe; `docs/design/copy.md`'s voice rules rule out "exotic"/"mystical"/"incredible" explicitly; Anek Devanagari is a real Devanagari typeface, not a Latin face styled to resemble one. |
| From v1: green gradients, skewed image shapes, grey text below AA contrast | **Not present.** No gradients are used anywhere in this palette; U7 requires `next/image` with no stretching or clip-path shapes; every text/background pairing in the contrast tables above meets or exceeds 4.5:1 (body) or 3:1 (large text/UI), both in light and the newly derived dark theme. |

**Would I have produced this for any travel site?** No — the roadside-milestone idea, the specific Neel/Highway-yellow/State-green palette and the "route drawn as milestones" signature element are specific to this brief's content (Indian roads, Indian travellers, real seed tours), not a generic template that could be relabelled for any travel product. The self-review above shows the direction actively avoids the template defaults it would otherwise be tempting to reach for.
