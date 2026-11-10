# Plan review: security findings

Reviewer: `security`. Scope: plan.md §5 in depth, plus the parts of §1, §3.4, §4.3 and §8 that touch auth, data exposure or input. Line numbers refer to plan.md at commit 38d7893.

**Seed checks** (script over `seed/data/`, 8 Nov 2026):
- 35 users: 1 admin, 5 lead guides, 9 guides and 20 travellers. All are `active: true` and all use `@example.com`.
- 58 bookings: all `status: paid` and `currency: inr`, none has a `stripeSessionId`, and all belong to role `user`.
- Every tour has exactly one lead guide and one guide. No tour has a `priceDiscount`.

---

### SEC-01 Major: the S23 test passes because of proxy.ts, so it proves nothing about the checks in pages, actions and handlers
- **Where:** plan.md:L583 (S23), L379 (§3.2 rule 4), L446–L449 (§3.4), L986 (P1-RV1)
- **Affects:** S23, S1, P1-RV1, P1-PL1, P1-ID1
- **Problem:** S23's test sends "requests with the `x-middleware-subrequest` header and with no cookie, and confirms protected data is still refused". On this stack the test can't fail:
  1. CVE-2025-29927 was fixed in Next.js 12.3.5, 13.5.9, 14.2.25 and 15.2.3. Next.js 16 runs `proxy.ts` normally even when that header is present.
  2. With no cookie, `proxy.ts` redirects to `/login?next=…` by itself (L449). The test sees a refusal even if every `requireUser()` call is deleted.
  
  To prove that "proxy.ts is never the only auth check", a request has to get past `proxy.ts` without a valid session. `proxy.ts` only checks that a cookie exists, so a present but invalid cookie does that.
- **Evidence:** L449: "redirects to `/login?next=…` when a protected page is requested with no session cookie". GitHub advisory GHSA-f82v-jwr5-mffw gives the patched versions above.
- **Effect on the build:** the Phase 1 gate (L993) and §13 (L1030) are passed on a test that can't detect the defect S23 exists to prevent.
- **Proposed fix:** replace the test sentence at L583 with:
  > Tests prove the checks behind `proxy.ts` work on their own. (a) Every protected page, Route Handler and Server Action is requested with a session cookie that is present but invalid: a bad signature, `alg: none`, expired, issued before `passwordChangedAt`, or belonging to a deactivated user. Each must refuse. (b) Page data functions and actions are called directly with `mockSession(null)`, bypassing `proxy.ts`, and must refuse. The `x-middleware-subrequest` request stays only as a check that the installed Next.js is patched.
  
  In the v1 column, say the CVE affected Next.js 11.1.4 to 15.2.2.
- **Confidence:** verified

### SEC-02 Blocker: auth isn't required to load the user from the database, so S6, S14 and role changes don't take effect on the API
- **Where:** plan.md:L496–L501 (§4.3 `getSession`, `getCurrentUser`, `requireUser`, `requireRole`, `withApi`, `action()`), L566 (S6), L574 (S14), L222
- **Affects:** S6, S14, S1, S4, P0-4, P0-5, P1-ID1, P1-ID4
- **Problem:** `getSession()` only verifies the JWT and returns `{ userId, role, iat }`. Only `getCurrentUser()` checks `active` and `passwordChangedAt`. The plan says `withApi` and `action()` "check auth", but never says which of the two they use. L496 says "Route Handlers pass `request.cookies`" to `getSession`. If the team follows that literally:
  - a deactivated user's token keeps working on `/api/v1` (S6 broken);
  - a token issued before a password change keeps working (S14 broken);
  - an admin who is demoted keeps admin rights until the token expires.
  
  The token lifetime (`exp`, cookie `maxAge`) is never stated. v1 used 90 days.
- **Evidence:** L496 compared with L497 ("Rejects tokens issued before a password change" is on `getCurrentUser` only). L566: "existing sessions stop working".
- **Effect on the build:** identity hardens `getCurrentUser` (L917), while platform builds `withApi` and `action()` on `getSession` (L884). Page tests pass, and the API stays open.
- **Proposed fix:**
  - §4.3: `getSession` returns `{ userId, iat }` and is internal to `session.ts`.
  - §4.3: "`requireUser`, `requireRole`, `withApi` and `action()` always use `getCurrentUser()`, which loads the user from the database on every request. Roles come from the database, never from the token." Remove `role` from the JWT.
  - S14: "Tokens expire after 7 days, and the cookie's `maxAge` matches."
  - S6: "An admin's role change or deactivation takes effect on the user's next request. This is tested through an API route, an action and a page."
- **Confidence:** verified (plan text)

### SEC-03 Major: `safeNext()` as specified is an open redirect
- **Where:** plan.md:L503, L582 (S22), L809 (U11), L816 (U16)
- **Affects:** S22, P0-4, P1-WE4
- **Problem:** "a same-site path starting with a single `/`" usually becomes `startsWith('/') && !startsWith('//')`. Browsers treat `\` as `/` and strip tabs and newlines, so all of these pass that check and leave the site:
  - `/\evil.example`
  - `/%09/evil.example` (after `searchParams` decoding)
  - `/\/evil.example`
  
  The plan gives no test vectors.
- **Evidence:** WHATWG URL Standard, basic URL parser: `\` is a path separator in special URLs, and tab and newline are removed (https://url.spec.whatwg.org/#concept-basic-url-parser).
- **Effect on the build:** the open redirect S22 was meant to close ships with a passing test.
- **Proposed fix:** L503 becomes:
  > `safeNext(next)` resolves `next` against `config.APP_URL` with `new URL()`. If the origin differs, or `next` contains `\` or a control character, it returns `/`. Otherwise it returns `pathname + search + hash`.
  
  The S22 test covers `//evil.example`, `/\evil.example`, `/%09/evil.example`, `https://evil.example` and `javascript:alert(1)`, plus a valid `/tour/valley-of-flowers-trek`. `APP_URL` is defined in SEC-12.
- **Confidence:** verified

### SEC-04 Major: signup, email change and the Redis-down path reveal which emails are registered
- **Where:** plan.md:L206, L218, L573 (S13), L580 (S20), L606 (B16), L657 (D3), L566 (S6)
- **Affects:** S13, S20, B16, D3, S6, P1-ID1–P1-ID3
- **Problem:** S13 and S20 try to hide whether an account exists, but four other paths reveal it:
  1. B16 returns 409 for a registered email on signup and on email change. That's an exact oracle.
  2. Under D3, when Redis is down, forgot-password returns 503 only for emails that exist. Unknown emails enqueue nothing and get 200.
  3. S6 says deactivated users "can't log in", but doesn't say they get the same response as a wrong password.
  4. Under S15's per-(IP, email) key, one IP can test unlimited emails at signup (see SEC-05).
- **Evidence:** L606, L657.
- **Effect on the build:** identity builds S13 and S20 carefully. The P2-RV3 sweep then finds the same information available from signup, and fixing that within scope isn't possible, because email verification is stretch (L113).
- **Proposed fix (decision for the human):**
  - **Option A (recommended):** accept enumeration through signup and record it in an ADR. Narrow S13 and S20 to "reveal no more than signup does". Then make the rest consistent:
    - forgot-password checks the rate limiter and Redis before it looks up the email, so Redis down gives 503 for every email;
    - login gives `INVALID_CREDENTIALS` with the dummy-hash compare for both unknown and deactivated accounts;
    - signup also has a per-IP limit (SEC-05).
  - **Option B:** pull email verification into v2.0, so signup always answers "Check your email".
- **Confidence:** verified

### SEC-05 Major: the rate-limit keys don't stop password spraying or credential stuffing, and the client IP's source behind Render is undefined
- **Where:** plan.md:L575 (S15), L307–L318, L500–L501, L345, L964
- **Affects:** S15, S16, P1-PL1, P1-ID1–P1-ID3
- **Problem:**
  1. **Key.** With one key per (IP, email), a single IP can spray one password across unlimited emails, and many IPs can attack one email without limit.
  2. **Client IP.** `NextRequest.ip` was removed in Next.js 15, and Server Actions only have `headers()`. Render doesn't document its header behaviour, and the reports conflict:
     - Render staff (2021): "we set the first IP in the list to the real client IP".
     - A user test (March 2024): Render "does not clear or reset any passed-in X-Forwarded-For header (it only appends to it), so a client could spoof its IP". The same user saw Cloudflare's `CF-Connecting-IP` and `True-Client-IP` headers.
     
     If the app trusts the left-most entry, one forged header gives a fresh bucket on every request, and every S15 limit is bypassed.
  3. **Coverage.** `updateMeAction` (a sharp re-encode), `startCheckoutAction` (a Stripe API call) and the review actions have no limit at all.
  4. **Redis down.** The plan doesn't say whether the limiter fails open or closed.
- **Evidence:**
  - Next.js 15 upgrade guide: "The geo and ip properties on NextRequest have been removed".
  - https://feedback.render.com/features/p/send-the-correct-xforwardedfor
- **Effect on the build:** platform has to guess. The obvious guess makes S15 bypassable with one header, and the in-memory S15 test, which has no proxy, can't catch it.
- **Proposed fix:** replace S15 with:
  > Limits are stored in Redis. The client IP comes only from `clientIp(headers)` in `rate-limit.ts`. In P1-PL1, platform deploys a throwaway probe service on Render (not part of the app, per S2), records which header carries the client IP and whether a client-sent value survives, and writes an ADR. The header name and trusted hop count are config (`CLIENT_IP_HEADER`, `TRUSTED_PROXY_HOPS`).
  >
  > Limits:
  > - 300 requests per 15 minutes per IP on `/api/v1`.
  > - On signup, login, forgot, reset and change-password: 10 per 15 minutes per IP across all emails, and separately 10 failed attempts per 15 minutes per email. The ADR accepts the 15-minute lockout risk.
  > - 20 per hour per user on `updateMeAction`, `startCheckoutAction` and the review actions.
  >
  > When Redis is unreachable, the auth limits fail closed (503) and the rest fail open, with a log line. A test sends a forged `X-Forwarded-For` entry and is still limited.
- **Confidence:** likely (Render's behaviour is unverified because the sources conflict)

### SEC-06 Major: nothing sets `refunded`, the webhook doesn't check that the session was paid, and a refund can't be matched to a booking
- **Where:** plan.md:L174–L186, L269, L271, L577 (S17), L597 (B7), L979
- **Affects:** S17, B7, P0-3, P1-CO2, P1-CO3
- **Problem:**
  1. `refunded` is in the enum, but no flow produces it. The webhook's event types are never listed, and `PATCH /bookings/[id]` has no field list.
  2. The model stores only `stripeSessionId`. Refund events identify the payment by `payment_intent`, so a refund can't be matched to a booking.
  3. S17 never requires `payment_status === 'paid'`. For delayed payment methods, Stripe sends `checkout.session.completed` before the money arrives.
  4. Unhandled event types must get a 2xx response, or Stripe keeps retrying them.
- **Evidence:** Stripe's fulfilment docs (https://docs.stripe.com/checkout/fulfillment): "Check the payment_status property to determine if it requires fulfilment" and "Delayed payment methods generate a checkout.session.async_payment_succeeded event when payment succeeds later". The docs' example fulfils on `completed` or `async_payment_succeeded`.
- **Effect on the build:** `refunded` becomes dead data. Refunded travellers stay "Booked" and keep their review eligibility (SEC-07).
- **Proposed fix:**
  - Add `stripePaymentIntentId` (unique, sparse) to the Booking model.
  - S17:
    > The webhook handles `checkout.session.completed` and `checkout.session.async_payment_succeeded`. It books only when `payment_status === 'paid'`, `currency === 'inr'` and `amount_total` equals the price in paise. It handles `charge.refunded` by setting the booking to `refunded` when the charge is fully refunded. Every other event type gets 200 and is ignored. Admins can also set `status` through `PATCH /bookings/[id]`.
  - Add one test per event type.
- **Confidence:** verified

### SEC-07 Major: review eligibility doesn't require the trip to have happened or the booking to still be paid
- **Where:** plan.md:L97, L254, L316, L525–L526, L811 (U13); seed/README.md:L41
- **Affects:** S4, S5, U13, U14, P0-4, P1-CA4
- **Problem:** §1.2, §1.4 and §1.6 require only "a paid booking". U13 offers "Write a review" only on past tours, and the seed follows "a paid booking on a past departure". Under the API rule, someone who has booked a 2027 departure can review today.
- **Effect on the build:** catalog builds `canReview` from §1.4 and web shows the button from U13. The two disagree for every upcoming booking, so reviews can come from people who haven't travelled.
- **Proposed fix:** define the rule once in §4.4:
  > `canReview` is true when the user has role `user`, has no review for the tour, and has a booking for it with `status: 'paid'` whose IST start day is before today's IST day (B19).
  
  Reuse that wording at L97, L254, L316 and in the S5 tests.
- **Confidence:** verified

### SEC-08 Major: §1.4 lets lead guides read all bookings, but S5 limits bookings to owners and admins
- **Where:** plan.md:L266–L267, L565 (S5), L561 (S1), L980
- **Affects:** S1, S5, P1-CO3, P1-RV1, P1-RV2
- **Problem:** §1.4 gives `lead-guide` every booking: names, dates and amounts paid, plus emails if the DTO includes them. S5 says "readable only by their owner and by admins". The access matrix is built from §1.4 and the S5 test from §5, so one of them fails.
- **Effect on the build:** the Phase 1 gate blocks until the lead decides mid-phase.
- **Proposed fix (decision):**
  - **Option A (recommended):** L266–L267 become admin only. The admin dashboard is stretch anyway.
  - **Option B:** lead guides can read bookings only for tours they guide, through a DTO without email. S5 changes to match.
- **Confidence:** verified

### SEC-09 Major: S3 limits queue jobs to `{ to, firstName, url }`, but `BookingConfirmed` needs the tour, date and price
- **Where:** plan.md:L563 (S3), L529, L538, L106
- **Affects:** S3, D3, U8, P1-CO2, PD-5, P1-RV2
- **Problem:** S3's test checks the job payload against `{ to, firstName, url }`. §4.4 allows `...vars`, and a booking confirmation without the tour, date and amount isn't a confirmation.
- **Effect on the build:** either the S3 test fails on the booking email, or it gets loosened to "has at least these keys". The looser test no longer catches a whole user document in a job, which is exactly the v1 bug S3 exists for.
- **Proposed fix:** replace the S3 job rule with:
  > Jobs carry the template name and exactly the props listed for that template in `docs/contracts.md`. For `BookingConfirmed` these are `to`, `firstName`, `tourName`, `startDate` (`YYYY-MM-DD`), `amountPaid` in rupees and `url`. Jobs never carry documents or password hashes. The test checks that each job's keys equal its template's list.
- **Confidence:** verified

### SEC-10 Major: one `toPublicUser` mapper serves both `/me` and public pages, so emails either leak publicly or disappear from `/me`
- **Where:** plan.md:L190, L497, L235, L253, L256, L563
- **Affects:** S3, R6, P0-3, P1-ID1, P1-CA4
- **Problem:** `/me`, `GET /users/me` and the admin endpoints need `email`. Guides and review authors on public endpoints must not show it. With only one mapper, the easy move is to include `email`, and then `GET /api/v1/tours/[tourId]/reviews` serves every reviewer's email to anyone. S3's test list never covers the public endpoints.
- **Proposed fix:** L190 lists these mappers instead:
  - `toSelf` (id, name, email, role, photo)
  - `toPublicProfile` (id, name, photo, role)
  - `toAdminUser` (adds `active` and `createdAt`)
  - `toTourSummary`, `toTourDetail`
  - `toReview` (uses `toPublicProfile`)
  - `toBooking`
  
  S3 adds: "Public tour, review and guide responses contain no `email` key at any depth."
- **Confidence:** verified

### SEC-11 Major: the DTO rule misses Server Action return values, error payloads and logs
- **Where:** plan.md:L190, L380, L505–L508, L563, L579, L599 (B9), L627, L661 (D7)
- **Affects:** S3, S19, R6, B9, D7, P0-5, P1-PL1
- **Problem:** S3 and R6 cover only API responses and Client Component props. Data also leaves the server through:
  1. **`ActionState.data`**, which is sent to the browser. Returning the updated user document from `updateMeAction` is the easy path.
  2. **Error messages.** MongoDB's E11000 message includes the collection, the index and the duplicate value. Mongoose `ValidationError` messages include the rejected value by default.
  3. **Logs.** The reset token sits in the URL path of both `/reset-password/[token]` and `PATCH /api/v1/auth/reset-password/[token]`, and it is a live credential for 10 minutes. Header logging would also record the session cookie and `stripe-signature`.
- **Proposed fix:** extend S3:
  > `ActionState.data` is a DTO or a plain value. Error responses carry only the `AppError` message; driver and Mongoose messages are logged, never returned. `logger.ts` sets pino `redact` for passwords, cookies, `authorization`, `stripe-signature` and tokens, and logs URLs with the token replaced by `[redacted]`. A test checks the log output of a failed login and of a reset request.
- **Confidence:** verified (plan text). The Mongo and Mongoose message formats are likely.

### SEC-12 Major: no configured public URL, so reset links, Stripe URLs and the origin check get built from request headers
- **Where:** plan.md:L573, L598 (B8), L810 (U12), L569 (S9), L631 (R10), L383
- **Affects:** S9, S13, S22, B8, R10, D4, P0-2, P1-ID2, P1-CO1, P1-PL1
- **Problem:** several features need the site's absolute origin:
  - the email reset link;
  - Stripe's `success_url` and `cancel_url` (Stripe requires absolute URLs);
  - canonical URLs and the sitemap;
  - the `withApi` origin check.
  
  No config value provides it. v1 built it from `req.get('host')`. With that pattern, a forgot-password request with a forged `X-Forwarded-Host` emails the victim a link to the attacker's host (reset-link poisoning). Behind Render's proxy, the origin check may also compare against the wrong host.
- **Effect on the build:** four teammates each derive the origin their own way.
- **Proposed fix:** add to §3.2 rule 8:
  > `APP_URL` (validated as an absolute https URL in production) is the only source of the site's origin. Email links, Stripe URLs, canonical URLs, the sitemap, `safeNext()` and the origin check all use it. No code builds a URL from `Host` or `X-Forwarded-*`.
  
  Add an S13 test: a forgot-password request with `X-Forwarded-Host: evil.example` still emails a link on `APP_URL`.
- **Confidence:** verified

### SEC-13 Major: the nonce CSP (S11) can't be combined with the Next.js 16 tagged cache that R5 points to
- **Where:** plan.md:L571 (S11), L626 (R5), L47, L521–L524, L936 (P0-1), L974
- **Affects:** S11, R5, P0-1, P1-PL1, P1-CA2
- **Problem:** the documentation chain leads straight to a broken combination:
  - R5 requires "the Next.js tagged data cache".
  - In Next.js 16 that's `cacheTag`, and its docs say "To use cacheTag, enable the cacheComponents flag".
  - The v16 upgrade guide says "Starting with Next.js 16, you can opt into PPR using the cacheComponents configuration".
  - The Next.js CSP guide says "Partial Prerendering (PPR) is incompatible with nonce-based CSP since static shell scripts won't have access to the nonce".
  - The `unstable_cache` page steers readers away from the API that would work: "For most use cases, use cache replaces this API in Next.js 16. We recommend opting into Cache Components".
- **Effect on the build:** the build succeeds, but the prerendered shell's inline scripts are blocked. No Client Component hydrates: MobileMenu, ReviewForm, RouteMap and the poller all stay dead. This is found in Phase 1 e2e, after catalog has built `cache.ts`, so it means rework.
- **Proposed fix (decision in P0-1, recorded in ADR-0001):**
  - **Option A (recommended):** keep `cacheComponents` off and implement R5 with `unstable_cache(fn, keys, { tags })` plus `revalidateTag`. Pages are dynamic anyway, because the root layout reads the session.
  - **Option B:** use Cache Components with the experimental hash/SRI CSP and drop the nonce. That changes S11 and relies on an experimental feature.
  
  R5 gains the sentence "`cacheComponents` stays off; PPR can't carry the S11 nonce."
- **Confidence:** verified

### SEC-14 Major: S11 lists hosts but not directives, which breaks booking without JavaScript and the photo preview
- **Where:** plan.md:L571, L446–L448, L641, L815 (U15), L632 (R11), L668 (D14), L335
- **Affects:** S11, R11, U15, U24, P1-PL1, P1-CO1, P1-WE3, P1-WE5
- **Problem:**
  1. **Stripe.** Checkout is hosted, so the pages need no Stripe script, frame or connect host. What they do need is `form-action`. Without JavaScript, `startCheckoutAction` answers the form POST with a redirect to `checkout.stripe.com`. Chrome and Safari apply `form-action` to that redirect, and the Next.js CSP example the team will copy contains `form-action 'self'`. The no-JS booking flow (R11) therefore fails in Chromium, which is the browser Playwright runs.
  2. **Photo preview.** `FileReader` produces `data:` URLs and `createObjectURL` produces `blob:` URLs. "Only exact hosts" allows neither, so the U15 preview is blocked.
  3. **Storage host.** It isn't needed, because all images go through `/_next/image` on our own origin.
  4. **Tiles.**
     - Raster tiles: every exact tile host goes in `img-src`. Providers that use `{s}` subdomains need each one listed, since wildcards aren't allowed.
     - Vector tiles: these also need `connect-src` and `worker-src blob:`.
  5. **Inline styles.** A nonce in `style-src` blocks `style` attributes, and `next/image` and React `style` props emit them. The "unsafe-inline styles ADR" therefore can't be skipped. Console errors also cost points against U24's Best Practices target of at least 95.
  6. **Nonce plumbing.** Next.js reads the nonce from the request's CSP header, so proxy must set it on the request (`NextResponse.next({ request: { headers } })`) as well as on the response.
- **Proposed fix:** S11 spells out the whole policy, set on both the request and the response:
  > `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'` (plus `'unsafe-inline'` per the ADR) `; img-src 'self' blob: data: <tile hosts>; font-src 'self'; connect-src 'self'` (plus vector hosts) `; worker-src 'self' blob:` (vector tiles only) `; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests`
  
  R11 adds a no-JS test: the booking form reaches a `checkout.stripe.com` URL returned by the fake Stripe client and intercepted by Playwright.
- **Confidence:**
  - Next.js mechanics: verified (the CSP guide).
  - `form-action` on redirects: likely (content-security-policy.com/form-action says Chrome and Safari block and Firefox allows; django-oauth-toolkit issue #1623).
  - `next/image` style attributes: likely.

### SEC-15 Major: the S1 access matrix leaves out roles and routes, and an undeclared route is public by default
- **Where:** plan.md:L561 (S1), L500–L501, L298–L318, L986, L856 (Q6)
- **Affects:** S1, S5, S6, P0-5, P1-RV1
- **Problem:**
  1. The matrix runs as anonymous, `user`, `guide` and `admin`. `lead-guide` is the only role that separates rows L236–L239 and L266–L267, and it isn't there. Owner versus non-owner and stale tokens aren't covered either.
  2. Routes come from the §1.4 and §1.6 tables, so a route or action added later is never tested. Nothing enforces "anything undeclared is denied".
  3. `auth?` and `roles?` are optional, and the plan never states the default.
  4. Next.js data-security guide: "when a Server Action is created and exported, it is reachable via a direct POST request". Any helper exported from `actions.ts` becomes an endpoint.
- **Proposed fix:** S1 becomes:
  > `withApi` and `action()` take a required `access` option (`'public' | 'auth' | { roles } | 'owner'`) with no default. The matrix finds handlers by globbing `src/app/**/route.ts` and their exported methods, finds actions by importing every `actions.ts`, and fails on anything unlisted. It runs each as anonymous, `user`, `guide`, `lead-guide`, `admin`, a deactivated user, and a token issued before a password change, plus owner and non-owner where S5 applies. It also covers `/me`, `/me/deactivate` and `/my-tours`. `actions.ts` files export only functions built with `action()`.
- **Confidence:** verified

### SEC-16 Major: NODE_ENV is the wrong switch for the styleguide and seed guards
- **Where:** plan.md:L562 (S2), L294, L646, L829 (U26), L827, L664 (D10), L1020–L1021; seed/README.md:L19–L22
- **Affects:** S2, D10, U26, P1-CA5, P2-RV2, P3-PL2, P3-RV1
- **Problem:**
  1. **Styleguide.** `next start` and the standalone server run with `NODE_ENV=production` everywhere: in CI, in docker compose and on staging. Visual tests against a production build get a 404 from `/styleguide`, so U26's styleguide screenshots can't be taken.
  2. **Seed.** The seed runs through `tsx` and `scripts/`, which aren't in the standalone image, so in practice it runs from a developer's machine where `NODE_ENV` is unset. The guard therefore never protects production: `npm run seed -- --reset` with the production `MONGODB_URI` wipes production and sets the admin's password to `SEED_USER_PASSWORD`. If instead it's run inside the staging container, the guard blocks P3-PL2.
- **Proposed fix:**
  - Add `APP_ENV` (`development | test | ci | staging | production`) to the D4 config.
  - S2: "`/styleguide` calls `notFound()` unless `APP_ENV` is `development`, `test` or `ci`."
  - D10: "The seed refuses to run unless `APP_ENV` is `development`, `test` or `staging`, and the database name in `MONGODB_URI` is `natours-dev`, `natours-test` or `natours-staging`."
- **Confidence:** verified (plan text). That standalone sets `NODE_ENV=production` is likely.

### SEC-17 Major: upload limits stop large files but not decompression bombs, and Route Handlers have no body limit
- **Where:** plan.md:L576 (S16), L531, L218, L238, L450, L313, L661, L966
- **Affects:** S16, D7, P1-PL3, P1-ID3, P1-CA2
- **Problem:**
  1. **Pixels.** The 5 MB cap limits bytes, not pixels. sharp's default `limitInputPixels` is 268,402,689. A single-colour 16,000 × 16,000 PNG compresses to under 1 MB and decodes to about 1 GB of RGBA (16,000² × 4 bytes). A few of those in parallel through the unlimited `updateMeAction` will run a small instance out of memory.
  2. **Animation.** sharp reads only the first frame by default (`pages: 1`, `animated: false`). The plan should pin that.
  3. **Format.** "Checked with sharp metadata" means sharp parses the file first, and sharp also accepts SVG, TIFF, GIF and HEIF. Check magic bytes first.
  4. **Body limits.**
     - Route Handlers have no built-in body limit: `formData()`, `json()` and `text()` buffer the whole body. A chunked body has no Content-Length, so `withApi` must count bytes as it reads, on every route including the webhook.
     - If proxy runs on `/api` (D7 wants its request ID on every response), proxy buffers bodies only up to `proxyClientMaxBodySize`, 10 MB by default, and passes on just the first 10 MB.
     - `PUT /tours/[id]/images` allows 4 × 5 MB = 20 MB.
  5. **Server Action limit.** `serverActions.bodySizeLimit` "applies to the raw HTTP request body, including the bytes that multipart/form-data adds". At exactly `5mb`, a 5 MB photo is rejected by Next.js before S16's own check can return a 413 `ActionState`.
- **Proposed fix:** S16:
  > `images.normalize` checks magic bytes (JPEG, PNG and WebP only). It then calls sharp with `limitInputPixels: 40_000_000`, `pages: 1` and `failOn: 'error'`, applies `.rotate()`, and re-encodes, using `sharp.concurrency(1)`. `withApi` enforces a byte-counted body limit on every route: 1 MB for JSON and the webhook, and 5 MB per file and 21 MB in total on `PUT /tours/[id]/images`. `experimental.serverActions.bodySizeLimit` is `'6mb'`, and the action checks 5 MB itself. The proxy matcher excludes `/api` and `/webhooks`, or `proxyClientMaxBodySize` is set to at least 21 MB. Test: a 16,000 × 16,000 PNG under 1 MB is rejected without exhausting memory.
- **Confidence:** verified (sharp constructor docs; Next.js `serverActions` and `proxyClientMaxBodySize` docs)

### SEC-18 Major: the new cookie from a password change or reset is rejected the moment it's issued
- **Where:** plan.md:L574 (S14), L497, L604 (B14), L210–L211, L131
- **Affects:** S14, B14, P1-ID1, P1-ID2
- **Problem:** JWT `iat` is in whole seconds (RFC 7519 NumericDate). `passwordChangedAt` is a Date with milliseconds, set by the model hook. Example:
  - the password is saved at 10:00:00.700, so `passwordChangedAt` is 10:00:00.700;
  - the new token is signed in the same second, so its `iat` is 10:00:00;
  - `iat * 1000 < passwordChangedAt`, so the new token is rejected.
  
  v1 worked around this with `Date.now() - 1000`, and B14's rule doesn't carry that over.
- **Effect on the build:** users are logged out straight after every password change or reset. The S14 test as written ("token issued before the change is rejected") still passes.
- **Proposed fix:** S14:
  > Reject when `iat < Math.floor(passwordChangedAt.getTime() / 1000)`. Tests with fake timers at hh:mm:ss.700: the cookie from change-password and from reset works on the next request, and a token issued one second before the change is rejected.
- **Confidence:** verified (arithmetic and RFC 7519)

### SEC-19 Major: changing the email needs no current password, so a stolen session becomes an account takeover
- **Where:** plan.md:L90, L218, L313, L211, L971
- **Affects:** S4, P1-ID3
- **Problem:** with only a session (a shared computer, a leaked cookie), an attacker can set the email to their own, use forgot-password and take the account. The old address is never told. Password change requires `currentPassword` (L211); email change, which leads to the same outcome, doesn't.
- **Proposed fix:**
  > Changing `email` through `PATCH /me` or `updateMeAction` requires `currentPassword`. Name and photo don't.
  
  Decision for the human: also email the old address (a fourth template, `EmailChanged`, recommended) or not. Add a test.
- **Confidence:** verified

### SEC-20 Minor: the bcrypt limit is 72 bytes, not 72 characters
- **Where:** plan.md:L130, L580 (S20)
- **Problem:** bcryptjs: "The maximum input length is 72 bytes (note that UTF-8 encoded characters use up to 4 bytes)". Zod's `.max(72)` counts characters. A 30-character Devanagari passphrase is 90 bytes, and everything after the 24th character is ignored. The site is Hindi-ready (L333), so this will happen.
- **Proposed fix:** "8–72 characters and at most 72 bytes in UTF-8 (`bcrypt.truncates()` is false)", with a field error in the §9.2 voice.
- **Confidence:** verified (bcryptjs README)

### SEC-21 Minor: Redis keeps reset links indefinitely, and S12 doesn't fit Render's internal Redis or SMTP
- **Where:** plan.md:L563, L572 (S12), L657 (D3), L666 (D12)
- **Problem:**
  - BullMQ stores completed and failed jobs by default ("stored in two special sets"), so reset URLs and email addresses stay in Redis.
  - Render's Key Value internal URL is "unauthenticated by default" and uses plain `redis://`; only "External connections are TLS secured". S12 read strictly would force `rediss://` and fail to connect.
  - SMTP certificate checks don't help if STARTTLS is skipped; nodemailer needs `requireTLS`.
- **Proposed fix:**
  - D3: jobs use `removeOnComplete: true` and `removeOnFail: { age: 86400 }`.
  - D12: enable Key Value authentication.
  - S12: "TLS with certificate checks on every connection that leaves the private network: Atlas, SMTP with `requireTLS: true`, and external Redis. Render's internal Redis URL is the exception, recorded in an ADR."
- **Confidence:** verified (BullMQ and Render docs). The nodemailer behaviour is unverified, because the docs page didn't render when fetched.

### SEC-22 Minor: `logoutAction` requires auth, but `POST /logout` is public
- **Where:** plan.md:L208, L309
- **Problem:** a user with a stale session (deactivated, password changed elsewhere) can't log out. The action throws `UNAUTHENTICATED` and the cookie stays. The access matrix also gets two answers for the same operation.
- **Proposed fix:** L309 access becomes "public", and logout always deletes the cookie.
- **Confidence:** verified

### SEC-23 Minor: S17 says bookings come only from the webhook, but admins can create them, and booking writes have no field lists
- **Where:** plan.md:L268–L270, L577, L564
- **Problem:** "A booking is created only from a verified webhook" contradicts the admin manual booking. Admin POST and PATCH have no allowed fields, so they can rewrite `user`, `price` or `stripeSessionId`, and a rewritten `stripeSessionId` breaks idempotency.
- **Proposed fix:**
  - S17: "A booking paid through Stripe is created only from a verified webhook".
  - L268 body: `userId`, `tourId`, `startDate`; the price comes from the tour.
  - L269 body: `status` only (see SEC-06).
- **Confidence:** verified

### SEC-24 Minor: any lead guide can change or delete any tour, including its price
- **Where:** plan.md:L236–L239
- **Problem:** the plan doesn't say whether this is intended, and the access matrix will encode whatever the table says. In the seed, each tour has one assigned lead guide.
- **Proposed fix (decision):**
  - **Option A (recommended):** lead guides can `PATCH` and `PUT images` only on tours they guide, and can't change `price`. `POST` and `DELETE` are admin only.
  - **Option B:** keep the current rule and say so in S1.
- **Confidence:** verified

### SEC-25 Minor: reset tokens can be used twice in a race, and deactivated accounts are unhandled
- **Where:** plan.md:L573, L566, L222–L223
- **Problem:**
  1. "Usable once" needs an atomic consume; otherwise two concurrent requests with the same token both succeed.
  2. Forgot-password for a deactivated account is unspecified.
  3. S6 says deactivated users are "left out of queries", which, applied to the admin endpoints too, stops admins from ever seeing or reactivating them.
- **Proposed fix:**
  - S13: consume the token with one `findOneAndUpdate({ passwordResetToken, passwordResetExpires: { $gt: now }, active: true }, { $unset })`.
  - S6: deactivated users are excluded "except in the admin user endpoints, which list and reactivate them". Forgot-password does nothing for them, with the same response as for any other email.
- **Confidence:** verified

### SEC-26 Minor: an origin in `CORS_ORIGINS` passes CORS but then fails the S9 origin check
- **Where:** plan.md:L569, L570, L194
- **Problem:** an allowlisted origin's POST, PUT, PATCH and DELETE requests fail S9. The plan also doesn't say:
  - whether credentials are allowed;
  - how `OPTIONS` preflights are answered;
  - whether a request with no `Origin` header (curl or admin scripts, the "external clients" at L194) is accepted.
- **Proposed fix:**
  > The origin check accepts the `APP_URL` origin and `CORS_ORIGINS`. A missing `Origin` is accepted, since `SameSite=Lax` already keeps the cookie off cross-site POSTs. CORS never sends `Allow-Credentials`. `withApi` answers `OPTIONS`. `CORS_ORIGINS` is empty by default.
- **Confidence:** verified

### SEC-27 Minor: one seed password covers every account, including the only admin, on a public staging site
- **Where:** plan.md:L664; seed/README.md:L19–L22; seed/data/users.json (admin `nikhil.bhatt@example.com`)
- **Problem:** anyone given the traveller test password also has the staging admin account. The admin's email is in the repository, and the per-(IP, email) limit (SEC-05) allows guessing from many IPs.
- **Proposed fix:** D10 adds "The admin's password comes from `SEED_ADMIN_PASSWORD` (required, at least 16 characters)."
- **Confidence:** verified

---

## Small wording fixes
- **S14:** "at least 32 characters" should be "at least 32 random bytes (`openssl rand -base64 32`)".
- **L450:** the setting is `experimental.serverActions.bodySizeLimit`, per the Next.js docs.
- **S20:** the dummy hash is generated at startup at cost 12, so its timing matches real hashes.
- **proxy.ts request IDs:**
  - Always generate a new `x-request-id`; never trust an incoming one.
  - Put it on the request headers so handlers can read it.
  - Next.js's CSP example matcher excludes `/api`. In that case `withApi` must generate the ID itself, which D7's "from proxy.ts" wording doesn't allow for.
- **ADR-0001** records a minimum `next` and React version patched for GHSA-fv66-9v8q-g76r (React Server Components RCE, 3 Dec 2025) and the 11 Dec 2025 follow-ups GHSA-2m3v-v2m8-q956 and GHSA-925w-6v3x-g4j4.
- **S9:** in production, name the cookie with the `__Host-` prefix.
- **S16:** re-encoding drops EXIF, so call `.rotate()` first or photos come out sideways.

## Sources read
- https://github.com/advisories/GHSA-f82v-jwr5-mffw (CVE-2025-29927; patched versions; published 21 Mar 2025)
- https://nextjs.org/docs/app/guides/content-security-policy (nonces need dynamic rendering; PPR incompatible; request-header mechanics; example `form-action 'self'` and `img-src 'self' blob: data:`)
- https://nextjs.org/docs/app/api-reference/functions/cacheTag ("To use cacheTag, enable the cacheComponents flag")
- https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- https://nextjs.org/docs/app/guides/upgrading/version-16 (PPR via `cacheComponents`; proxy rename)
- https://nextjs.org/docs/app/guides/upgrading/version-15 (`NextRequest.ip` removed)
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy (Node.js runtime by default)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize (10 MB default; partial buffering)
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions (1 MB default; the limit includes multipart overhead)
- https://nextjs.org/docs/app/guides/data-security (exported actions are reachable by direct POST)
- https://sharp.pixelplumbing.com/api-constructor (`limitInputPixels` 268402689; `pages: 1`; `animated: false`)
- https://docs.bullmq.io/guide/queues/auto-removal-of-jobs
- https://raw.githubusercontent.com/dcodeIO/bcrypt.js/main/README.md
- https://docs.stripe.com/checkout/fulfillment
- https://render.com/docs/key-value
- https://feedback.render.com/features/p/send-the-correct-xforwardedfor
- https://content-security-policy.com/form-action/ and https://github.com/django-oauth/django-oauth-toolkit/issues/1623
- GitHub advisories API for CVE-2025-55182, CVE-2025-55184 and CVE-2025-55183
- https://url.spec.whatwg.org/#concept-basic-url-parser
