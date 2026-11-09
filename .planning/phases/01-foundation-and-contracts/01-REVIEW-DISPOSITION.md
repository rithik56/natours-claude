---
phase: 01
review: 01-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: deferred
    title: "`withApi` reads an unbounded JSON body, and `PAYLOAD_TOO_LARGE` is never produced"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "`toReview` throws a `TypeError` instead of the intended error when the author is `null`"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "Password `maxlength: 72` counts characters, but bcrypt truncates at 72 bytes"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "The \"password is written only by `save()`\" guard has gaps"
  - id: WR-05
    severity: warning
    disposition: deferred
    title: "Tour slug can go stale, be empty, or collide as a misleading CONFLICT"
  - id: WR-06
    severity: warning
    disposition: fixed
    title: "`isDbUnavailableError` misses common driver outage errors, so they surface as 500"
  - id: WR-07
    severity: warning
    disposition: fixed
    title: "CI jobs have no `timeout-minutes`"
  - id: WR-08
    severity: warning
    disposition: fixed
    title: "The password-change cut-off uses the pinned clock, but the JWT `iat` uses the wall clock"
  - id: WR-09
    severity: warning
    disposition: deferred
    title: "`getSession` swallows every error, including Next control-flow and configuration errors"
  - id: IN-01
    severity: info
    disposition: open
    title: "The proxy matcher's exclusions have no path boundary"
  - id: IN-02
    severity: info
    disposition: open
    title: "`PublicUser` exposes `role` for every review author"
  - id: IN-03
    severity: info
    disposition: open
    title: "`issuesToFieldErrors` uses `in`, while the action path uses `Object.hasOwn`"
  - id: IN-04
    severity: info
    disposition: open
    title: "The `ratingsAverage` setter also rewrites query filters"
open: 4
total: 13
recorded: 2026-11-09T16:44:47.761Z
---

# Phase 01: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | deferred | deferred by the user on 9 Nov 2026: chose to leave this open for Phase 4 when approving the review fixes |
| WR-02 | warning | fixed | commit 8e17cc6 (REVIEW-FIX.md) |
| WR-03 | warning | fixed | commit 97af577 (REVIEW-FIX.md) |
| WR-04 | warning | fixed | commit a8712eb (REVIEW-FIX.md) |
| WR-05 | warning | deferred | deferred by the user on 9 Nov 2026: chose to leave this open for Phase 4 when approving the review fixes |
| WR-06 | warning | fixed | commit 2be5d5d (REVIEW-FIX.md) |
| WR-07 | warning | fixed | commit 03014b8 (REVIEW-FIX.md) |
| WR-08 | warning | fixed | commit 11336ae (REVIEW-FIX.md) |
| WR-09 | warning | deferred | deferred by the user on 9 Nov 2026: chose to leave this open for Phase 4 when approving the review fixes |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
