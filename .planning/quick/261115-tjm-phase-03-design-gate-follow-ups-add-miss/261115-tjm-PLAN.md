---
phase: 03-design-system-and-app-shell
plan: 261115-tjm
type: execute
wave: 1
depends_on: []
files_modified:
  - docs/design/copy.md
  - test/app/facts-strip.spec.ts
  - src/components/ui/facts-strip.tsx
  - src/components/ui/facts-strip.module.css
  - docs/design/screens/styleguide-375-light.png
  - docs/design/screens/styleguide-375-dark.png
  - docs/design/screens/styleguide-1280-light.png
  - docs/design/screens/styleguide-1280-dark.png
autonomous: true
requirements: [U4, U5, U20]

must_haves:
  truths:
    - "docs/design/copy.md lists every product-facing string from the 03-10 design-gate list, exactly as the ui/ components render it, and none of the styleguide's dev-only notes or state labels."
    - "At 375px wide the facts strip sits in two aligned columns: the location shares a line with another fact, so it never sits alone before the stars, and nothing overflows."
    - "At 1280px wide the facts strip is still one row."
    - "The four docs/design/screens/styleguide-*.png files are re-captured from the fixed page, and the styleguide nav is unchanged."
  artifacts:
    - path: "docs/design/copy.md"
      provides: "the approved component wording, appended in the file's existing table style"
    - path: "test/app/facts-strip.spec.ts"
      provides: "geometry checks for the facts strip at four narrow widths and at 1280"
    - path: "src/components/ui/facts-strip.module.css"
      provides: "two-column grid below 64em, one flex row from 64em"
    - path: "docs/design/screens/styleguide-375-light.png"
      provides: "re-captured design-gate screenshot (three siblings: 375-dark, 1280-light, 1280-dark)"
  key_links:
    - from: "src/components/ui/facts-strip.tsx"
      to: "src/components/ui/facts-strip.module.css"
      via: "the rating item carries the rating class, which spans both grid columns"
---

<objective>
Close the two follow-ups the user chose at the Phase 3 design gate (the design is approved as is, with these two follow-ups).

1. Add the product-facing strings that the ui/ components render but docs/design/copy.md lacks, exactly as rendered, as approved copy (per follow-up 1). The strings are the ones listed under "Items for the design gate" in 03-10-SUMMARY.md.
2. Make the FactsStrip wrap tidily at 375px so the location never sits alone on a line before the stars, then re-capture the four styleguide screenshots (per follow-up 2).

Purpose: U20 says pages use exactly the wording in copy.md, so every string a component renders needs to be there before Phase 4 builds pages from them. U4 and U5 need the styleguide screenshots to show a facts strip the user can approve.
Output: an extended copy.md, a corrected FactsStrip with a geometry spec, and four refreshed screenshots.

Not in scope, and not to be touched: plan.md, playwright.config.ts, the ESLint config, anything under src/app/styleguide/ (the styleguide nav stays unchanged), the 44px touch-target rule (`--touch-target`), and any new animation. Strings that appear only as dev-only styleguide notes or state labels are not copy and are not added.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.claude/CLAUDE.md
@docs/design/copy.md
@.planning/phases/03-design-system-and-app-shell/03-10-SUMMARY.md
@src/components/ui/facts-strip.tsx
@src/components/ui/facts-strip.module.css
@test/app/styleguide-full.spec.ts

## Source coverage

| Source | Item | Covered by |
|--------|------|------------|
| GOAL | design-gate follow-up 1: approved copy for the unlisted strings | Task 1 |
| GOAL | design-gate follow-up 2: tidy facts strip at 375px | Task 2 |
| GOAL | re-capture the four styleguide screenshots, nav unchanged | Task 3 |
| REQ | U4, U5 (ui/ set and styleguide shown in both themes and widths) | Tasks 2 and 3 |
| REQ | U20 (copy.md holds the wording; pages use exactly it) | Task 1 |
| RESEARCH | none for a quick task | not applicable |
| CONTEXT | no CONTEXT.md; the two follow-ups above are the user's locked decisions | Tasks 1 to 3 |

## Findings the planner already checked against the real code

- Every string in the 03-10 list exists in src exactly as it is quoted below (greps run on the current tree). Where a string is built from a value, the source form is: `Up to {groupSize} people` in `src/components/ui/facts-strip.tsx`, `Page {page} of {totalPages}` in `src/components/ui/pagination.tsx`, `© {currentYear} Natours.` in `src/components/ui/footer.tsx`, and `{formatPrice(priceRupees)} per person` in `src/components/ui/booking-panel.tsx` (also `{amount} per person` in `price.tsx`).
- "You’re booked for" is spelled in `booking-panel.tsx` with the typographic apostrophe U+2019. Every existing copy.md string uses a straight apostrophe. Write the new string as rendered (U+2019) and say so in the new section's intro. Do not "fix" it either way. Raise the mismatch in the SUMMARY for the user to decide.
- Section-supplied strings (passed in by a styleguide section, rendered by a ui/ component): "No upcoming tours yet." and "No past tours yet." (empty-state-section), "Start date is required." (start-date-select-section), "Review is required." (review-form-section), "Deactivate account" (confirm-dialog-section), "Tour photo" (file-input-section), "Lead guide" and "Guide" (guide-item-section), "Your changes are saved." and "Start dates are shown in India Standard Time." (alert-section), "Review posted for Kerala Backwaters and Hills." (toast-section), "Tour already booked" (select-section), "Read the photo credits" (link-section). They are in the user's list, so they are added.
- Facts strip today: a flex-wrap row below 64em. Measured at 375px wide (strip width 311px), the Rishikesh strip puts Medium, 6 days and Up to 14 people on line 1, the location alone on line 2 and the stars alone on line 3. The location and the stars together need about 323px, so they cannot share a line at 375px, and a one-line fix by tweaking gaps would be fragile. The approved mockup and docs/design/direction.md show facts "in columns or on separate lines".
- The project has one breakpoint, `width >= 64em`, mobile first. Do not add another.
- `.prettierignore` lists `*.md`, so copy.md is not prettier-checked. The new spec is.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Append the approved component wording to docs/design/copy.md</name>
  <files>docs/design/copy.md</files>
  <action>
Follow-up 1. Additions only: no existing line of copy.md is changed or removed. Do not edit plan.md. Do not add the styleguide's explanatory prose, section notes or state labels (for example the sentence under a section heading, or a label such as "Already booked" above a demo). Only strings a user would see in the product.

Before writing each string, read it in the component or section named in the "Findings" list above and copy it character for character, including its full stop. Indian English with British spelling; none of the strings needs a spelling change.

Step A. In the existing "Field-validation wording" table, insert two rows directly after the "Required field left blank" row, in the same two-column style:
- Rule "Start date not chosen", wording "Start date is required."
- Rule "Review comment left blank", wording "Review is required."
These follow the "{Field name} is required." pattern that row already states.

Step B. After the "Credits" section at the end of the file, append one new H2 "Component wording" with a short intro (sentence case, no apology): the `ui/` components render these strings, they were approved at the Phase 3 design gate, and pages use them exactly (U20). A value in braces is filled in by the page, dates by `formatDate()` and prices by `formatPrice()`. Add that the apostrophe in "You’re" is the typographic one, as the booking panel renders it.

Then add the H3 groups below, each a two-column table headed "Where" and "Wording", using the same `|---|---|` separator style as the existing tables. Quote each wording in double quotes as the existing tables do.

H3 "Booking panel and price"
- Booking panel, traveller has booked this start date: "You’re booked for {date}." followed by the link "My tours", for example "You’re booked for 17 Jul 2027."
- Booking panel, no upcoming start dates: "No upcoming start dates for this tour." followed by the link "See other tours"
- Price beside a tour's start dates: "{price} per person", for example "₹42,999 per person"

H3 "Empty states" (state the fact, then the one action, per the rule above)
- My tours, no upcoming tours: "No upcoming tours yet." followed by the link "See all tours"
- My tours, no past tours: "No past tours yet." followed by the link "See all tours"

H3 "Reviews"
- Star input, group label: "Rate this tour"
- Review form, comment label: "Your review"
- Review form, submit button: "Post review"
- Your own review, edit link: "Edit review"
- Your own review, delete button: "Delete review"

H3 "Guides"
- The guide who leads the tour: "Lead guide"
- Any other guide on the tour: "Guide"

H3 "Forms and account"
- File input for a tour photo, label: "Tour photo"
- File input, nothing chosen yet: "No photo chosen"
- Select, disabled, for a tour the traveller has already booked, label: "Tour already booked"
- Account, button that opens the deactivation dialog: "Deactivate account"

H3 "Alerts and toasts"
- Success alert: "Your changes are saved."
- Info alert about dates: "Start dates are shown in India Standard Time."
- Success toast after a review is posted: "Review posted for {tour name}.", for example "Review posted for Kerala Backwaters and Hills."
- Toast close button, accessible name (the visible mark is ×): "Dismiss"

H3 "Tour page, pagination and footer"
- Facts strip, group size: "Up to {n} people", for example "Up to 14 people"
- Pagination, where the reader is: "Page {n} of {total}", for example "Page 1 of 3"
- Footer, copyright line: "© {year} Natours." with the current year, for example "© 2026 Natours."
- Link to the credits page: "Read the photo credits"

Strings that already match copy.md ("Log in to book", "Book this tour", "No tours match these filters.", "Clear filters", "Check the highlighted fields and try again.", the photo credit wording) are not repeated.

While checking against the real components, if you notice another product-facing string that a ui/ component renders and copy.md lacks but that is NOT in the list above (for example a confirm dialog's title, description or "Cancel", "Previous" and "Next", or the star radio labels), do not add it. List each one in the SUMMARY under "Found, not added" so the user can decide.

Commit: `docs(design): record the component wording approved at the design gate [U20] (261115-tjm)`. Stage only docs/design/copy.md. No dependency is added.
  </action>
  <verify>
    <automated>fail=0; for n in "You’re booked for {date}." "No upcoming start dates for this tour." "See other tours" "{price} per person" "No upcoming tours yet." "No past tours yet." "See all tours" "Start date is required." "Review is required." "Rate this tour" "Your review" "Post review" "Edit review" "Delete review" '"Lead guide"' '"Guide"' "Tour photo" "No photo chosen" "Tour already booked" "Deactivate account" "Your changes are saved." "Start dates are shown in India Standard Time." "Review posted for {tour name}." "Review posted for Kerala Backwaters and Hills." '"Dismiss"' "Up to {n} people" "Page {n} of {total}" "© {year} Natours." "Read the photo credits"; do grep -qF -- "$n" docs/design/copy.md || { echo "missing from copy.md: $n"; fail=1; }; done; for n in "You’re booked for" "No upcoming start dates for this tour." "See other tours" "per person" "No upcoming tours yet." "No past tours yet." "See all tours" "Start date is required." "Review is required." "Rate this tour" "Your review" "Post review" "Edit review" "Delete review" 'role="Lead guide"' 'role="Guide"' "Tour photo" "No photo chosen" "Tour already booked" "Deactivate account" "Your changes are saved." "Start dates are shown in India Standard Time." "Review posted for Kerala Backwaters and Hills." 'aria-label="Dismiss"' "Up to {groupSize} people" "Page {page} of {totalPages}" "© {currentYear} Natours." "Read the photo credits"; do grep -rqF -- "$n" src || { echo "not rendered in src: $n"; fail=1; }; done; ! grep -qE 'Three variants|Auto-dismisses|Bookable: logged in|Reload the page|Cancel has focus' docs/design/copy.md || { echo "dev-only styleguide text leaked into copy.md"; fail=1; }; stat=$(git diff --numstat -- docs/design/copy.md) || fail=1; printf '%s\n' "$stat" | awk '$1>0 && $2==0 {ok=1} END{exit !ok}' || { echo "copy.md must gain lines and lose none (run this before committing)"; fail=1; }; test $fail = 0</automated>
  </verify>
  <done>copy.md holds all 26 strings from the 03-10 list (the two required-field messages in the Field-validation table, the rest under the new "Component wording" section), each spelled exactly as src renders it. None of the styleguide's dev-only notes or state labels was added. No existing line of copy.md changed. Any further unlisted strings found are recorded for the SUMMARY, not added. The check above passes (at HEAD every copy.md needle is absent, so it starts red).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Make the facts strip wrap tidily at 375px (spec first)</name>
  <files>test/app/facts-strip.spec.ts, src/components/ui/facts-strip.tsx, src/components/ui/facts-strip.module.css</files>
  <behavior>
    The spec opens /styleguide and reads the five list items of each facts strip in the "Facts strip" region (the page shows two strips: Rishikesh and Leh). Item order in the DOM is difficulty, length, group size, location, rating. Compare bounding boxes in the page.
    - At 360, 375, 414 and 768px wide, each strip: no item's right edge passes the strip's right edge (allow 1px) and the strip does not scroll sideways. Test title starts with "[U4, U5]".
    - At those widths, the location item shares a line with at least one other fact (its vertical range overlaps another item's), so the location never sits alone before the stars.
    - At those widths, the five items start at no more than two distinct left edges (rounded), meaning two aligned columns.
    - At 1280px wide, all five items share one top (one row). This already passes today and guards the 64em-and-up layout.
    Expected before the fix, at 375px, for the Rishikesh strip: the "shares a line" check and the "two columns" check both fail (location alone on line 2; left edges 0, 114 and 181). The 1280px check passes.
  </behavior>
  <action>
Follow-up 2. Test first, then the fix. Tokens only (no px, no hex), everything stays inside `@layer components`, the `--touch-target` rule is not touched, no animation or transition is added, no new breakpoint (the only one is `width >= 64em`, mobile first).

Step 0, dev server (Playwright needs a warmed server). Do not use pkill, killall or any pattern-based kill, ever. Check `lsof -nP -iTCP:3000 -sTCP:LISTEN`.
- If nothing listens on 3000: start `PORT=3000 APP_ENV=ci npm run dev` in the background from the checkout root (Bash run_in_background). Afterwards find your own listener PID with `lsof -nP -iTCP:3000 -sTCP:LISTEN -t` and keep it in your notes. It is yours because you confirmed the port was free first.
- If a next-server you did not start already holds 3000: leave it alone. It may serve a different checkout than yours. Start your own on another free port, for example `PORT=3100 APP_ENV=ci npm run dev` in the background, note the PID of the listener on that port, and create the temporary untracked file `playwright.config.local-261115.ts` at the repo root. It imports the default export of `./playwright.config`, sets the `app` project's `use.baseURL` to `http://localhost:3100`, and sets `webServer` to undefined. Pass `--config=playwright.config.local-261115.ts` to every Playwright command in this plan. Never `git add` it, and delete it before any static check or commit.
- If your `next dev` exits at once saying another dev instance already runs in this directory, then the server on the port serves this very directory. Do not stop it. Use it through the default config and record that in the SUMMARY.
Warm the server once: curl `/`, `/styleguide` and a 404 path such as `/no-such-page-261115` (the first compile can take a minute or two). Run Playwright with `--workers=1`.

Step 1, RED. Create `test/app/facts-strip.spec.ts` as described in `<behavior>`. Style: follow `test/app/star-rating-input.spec.ts` (viewport per `test.describe`, scope with `page.getByRole('region', { name: 'Facts strip' })`, one `evaluate` that returns the boxes). Comments follow the project's Q5 rule: plain prose, never commented-out code. Run `npx prettier --write test/app/facts-strip.spec.ts`. Run the spec and confirm it fails at 375px for the reasons in `<behavior>` (record the failing test names). Commit the failing spec: `test(ui): add a geometry check for the facts strip at narrow widths [U4, U5] (261115-tjm)`.

Step 2, GREEN. Edit `src/components/ui/facts-strip.module.css`:
- Below 64em (the base rules) `.strip` becomes a grid of two equal columns that can shrink (`repeat(2, minmax(0, 1fr))`) with the existing `gap: var(--space-2) var(--space-5)`. Keep margin, padding, list-style, colour and font-size as they are. Drop `flex-wrap` from the base rule.
- `.fact` keeps its flex layout and gains `min-width: 0` so the location can wrap inside its column instead of overflowing.
- Add `.rating { grid-column: 1 / -1; }` so the stars take a row of their own. The stars are the widest fact (about 145px) and would overflow a half column on narrow screens.
- Inside the existing `@media (width >= 64em)` block, `.strip` returns to `display: flex; flex-wrap: nowrap;` with the existing wider gap, and `.fact` keeps `white-space: nowrap`. The 64em-and-up layout must look exactly as it does now.
Edit `src/components/ui/facts-strip.tsx`: the rating `<li>` gets both classes (`styles.fact` and `styles.rating`, joined the way `pagination.tsx` joins two classes), and the comment above the component is updated to say the facts sit in two aligned columns below 64em, with the rating on its own row, and in one row from 64em. Do not change the DOM order or the text of any fact (the Vitest check in test/components/ui/facts-strip.test.ts must still pass untouched). Do not edit anything under src/app/styleguide/.

Run the new spec and confirm every test passes at all five widths. Then run `npx vitest run test/components/ui/facts-strip.test.ts` and `npx stylelint "src/components/ui/facts-strip.module.css"`. Commit: `fix(ui): lay the facts strip out in two aligned columns below 64em [U4, U5] (261115-tjm)` (stage the tsx and css only).
  </action>
  <verify>
    <automated>npx vitest run test/components/ui/facts-strip.test.ts && npx stylelint "src/components/ui/facts-strip.module.css" && npx prettier --check test/app/facts-strip.spec.ts src/components/ui/facts-strip.tsx && npx playwright test --project=app --workers=1 test/app/facts-strip.spec.ts</automated>
    (If the temporary config is in use, add `--config=playwright.config.local-261115.ts` to the Playwright command. The dev server from Step 0 must be running.)
  </verify>
  <done>The spec was red at 375px before the change (location alone on a line, three or more column edges) and is green at 360, 375, 414, 768 and 1280px after it. At 375px the strip is two aligned columns with the stars on their own row and the location beside another fact, with no overflow. The 64em-and-up layout is unchanged, the Vitest check still passes, and stylelint and prettier are clean. Two commits exist (test, then fix).</done>
</task>

<task type="auto">
  <name>Task 3: Re-capture the styleguide screenshots and run the full sweep</name>
  <files>docs/design/screens/styleguide-375-light.png, docs/design/screens/styleguide-375-dark.png, docs/design/screens/styleguide-1280-light.png, docs/design/screens/styleguide-1280-dark.png</files>
  <action>
Follow-up 2, second half. The four screenshots are written by `test/app/styleguide-full.spec.ts` itself, so do not edit that spec or the styleguide page. The nav stays as it is.

Step 1. If the server from Task 2 is not still running, repeat Task 2's Step 0 (start, note your own PID, warm `/`, `/styleguide` and a 404 path). Re-run only the capture spec: `npx playwright test --project=app --workers=1 test/app/styleguide-full.spec.ts` (add `--config=playwright.config.local-261115.ts` if that file is in use). Confirm `git status --short docs/design/screens` shows exactly the four `styleguide-*.png` files as modified and no other file in that folder.

Step 2. Look at the Facts strip section at 375px wide. The captures are very tall, so take a throwaway element screenshot of the "Facts strip" region at 375px wide to a path outside the repo (a short node script that imports `@playwright/test` and opens `/styleguide` on your server) and view it. Confirm both strips are two aligned columns, the location is beside another fact, the stars have their own row, and nothing is clipped. Delete the throwaway script and image afterwards.

Step 3. Run the whole app project once on the final code: `npx playwright test --project=app --workers=1` (same `--config` note). Every test must pass, including the new facts strip spec and the existing star rating, shell and styleguide specs. This run captures the four screenshots a final time; that is expected. If a test fails, fix its cause; do not loosen a test, and do not edit playwright.config.ts or the ESLint config.

Step 4. Stop only the server you started, by its own PID (a plain `kill <PID>`), then confirm with `lsof` that your port no longer listens. If wrapper processes you started remain (the npm and pino-pretty parents of your PID, found with `ps -o pid,ppid,command`), stop those by PID too. Leave any server you did not start running. Delete `playwright.config.local-261115.ts` and any log or PID notes you created. `git status` must show no untracked file of yours.

Step 5. Run the static sweep (the automated check below). All of it must pass.

Step 6. Commit only the four PNGs: `docs(design): re-capture the styleguide screenshots after the facts strip fix [U4, U5] (261115-tjm)`.

Step 7. Write `.planning/quick/261115-tjm-phase-03-design-gate-follow-ups-add-miss/261115-tjm-SUMMARY.md` (do not commit it with the code; the quick-task orchestrator commits it). Cover: the strings added and where; the typographic apostrophe in "You’re" against the straight apostrophes elsewhere in copy.md; "Found, not added" strings from Task 1; the facts strip layout chosen and why; which port and PID you used and that you stopped only your own; and the results of every command below.
  </action>
  <verify>
    <automated>test ! -e playwright.config.local-261115.ts && npx tsc --noEmit && npx eslint src test --max-warnings=0 && npx stylelint "src/**/*.css" --allow-empty-input && npm run check:conventions && npm run knip && npx vitest run --exclude '.claude/**' && npx prettier --check src test</automated>
  </verify>
  <done>The four docs/design/screens/styleguide-*.png files are re-captured from the fixed page and committed alone. The full app Playwright project passes at --workers=1. tsc, eslint (src and test, zero warnings), stylelint, check:conventions, knip, Vitest (excluding .claude) and prettier all pass. The server you started is stopped, any other server is untouched, the temporary config is gone, and the SUMMARY is written.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| executor shell to local processes | the executor starts and stops its own dev server next to a server it did not start |
| repo working tree to git history | a temporary Playwright config and PID or log notes could be committed by accident |
| copy.md to rendered product | copy.md becomes the source later pages take their wording from |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QT-01 | Denial of Service | stopping the wrong dev server | medium | mitigate | stop only the PID of the listener the executor started on its own port; no pkill, killall or pattern kill; confirm with lsof afterwards |
| T-QT-02 | Tampering | temporary Playwright config committed | low | mitigate | file is untracked, deleted before the static sweep (the verify command asserts it is gone), and every commit stages named files only |
| T-QT-03 | Tampering | copy.md wording drifting from the components | low | mitigate | the Task 1 check greps every string in both copy.md and src, and requires additions only |
| T-QT-04 | Information Disclosure | dev-only styleguide text published as product copy | low | mitigate | the Task 1 check fails if any dev-only note leaks into copy.md |
| T-QT-SC | Tampering | npm, pip and cargo installs | high | accept | no package is installed or changed in this plan, so the package-legitimacy gate does not apply |
</threat_model>

<verification>
- Task 1 check: all 26 strings present in copy.md and in src, no dev-only text, additions only.
- Task 2 check: facts-strip.spec.ts red before the CSS change at 375px, green after at 360, 375, 414, 768 and 1280px; Vitest facts-strip test, stylelint and prettier pass.
- Task 3 check: four PNGs re-captured, the full app Playwright project passes at --workers=1, and tsc, eslint, stylelint, check:conventions, knip, Vitest and prettier all pass.
- `git diff --stat main -- plan.md playwright.config.ts src/app/styleguide` shows no change.
</verification>

<success_criteria>
- Follow-up 1 is done: copy.md carries the approved wording, exactly as rendered, with nothing dev-only.
- Follow-up 2 is done: the facts strip is tidy at 375px, the screenshots show it, and the nav is unchanged.
- Commits are Conventional Commits with the requirement IDs in square brackets and the plan reference `(261115-tjm)`.
</success_criteria>

<output>
Create `.planning/quick/261115-tjm-phase-03-design-gate-follow-ups-add-miss/261115-tjm-SUMMARY.md` when done
</output>
