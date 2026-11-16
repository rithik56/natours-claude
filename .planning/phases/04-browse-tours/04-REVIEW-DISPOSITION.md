---
phase: 04
review: 04-REVIEW.md
titles: json
findings:
  - id: CR-01
    severity: critical
    disposition: fixed
    title: "Tour write routes never answer the CORS preflight"
  - id: WR-01
    severity: warning
    disposition: open
    title: "Non-Latin tour names produce an empty slug, and the second one collides"
  - id: WR-02
    severity: warning
    disposition: skipped
    title: "The root layout always renders the logged-out header"
  - id: WR-03
    severity: warning
    disposition: skipped
    title: "Per-tour and credits cache entries have no time bound"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "The rate limit runs after the full upload is read and parsed"
  - id: WR-05
    severity: warning
    disposition: open
    title: "Tour write schemas accept duplicate stop days and duplicate or unbounded guides"
  - id: IN-01
    severity: info
    disposition: open
    title: "A page number of 400 digits becomes Infinity and is echoed as `null`"
  - id: IN-02
    severity: info
    disposition: open
    title: "The `user` image preset is never used"
  - id: IN-03
    severity: info
    disposition: open
    title: "Every seed user has an `example.com` address"
  - id: IN-04
    severity: info
    disposition: open
    title: "The reset comment understates what `--reset` deletes"
  - id: IN-05
    severity: info
    disposition: open
    title: "`npm run seed` is allowed in staging but cannot succeed there yet"
  - id: IN-06
    severity: info
    disposition: open
    title: "GitHub Actions are pinned to major tags, not commit SHAs"
open: 8
total: 12
recorded: 2026-11-16T17:12:53.353Z
---

# Phase 04: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | fixed | 04-REVIEW-FIX.md |
| WR-01 | warning | open | - |
| WR-02 | warning | skipped | 04-REVIEW-FIX.md |
| WR-03 | warning | skipped | 04-REVIEW-FIX.md |
| WR-04 | warning | fixed | 04-REVIEW-FIX.md |
| WR-05 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |
| IN-04 | info | open | - |
| IN-05 | info | open | - |
| IN-06 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
