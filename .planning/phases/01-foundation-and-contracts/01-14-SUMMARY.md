---
phase: 01-foundation-and-contracts
plan: 14
subsystem: docs
tags: [contracts, adr, readme, documentation, q10, q8, q9]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plans 01-02 to 01-13: the code that docs/contracts.md describes, ADRs 0001 to 0018, the CI workflow and the scripts the README lists"
provides:
  - "docs/contracts.md: the shared contracts with signatures copied from the code and compared with it by script, and a table of every difference from plan.md section 4 with its ADR"
  - "docs/adr/0019 to 0024: PROJECT.md Key Decisions 3 to 6 and 9, and the folder and test layout"
  - "docs/adr/0025: ActionState carries retryAfterSeconds (added at the orchestrator's request)"
  - "docs/adr/README.md: the ADR index, 25 entries in numeric order, with the format and how to add one"
  - "README.md: prerequisites, a quick start that was followed from a fresh copy, all 18 npm scripts, architecture, configuration, testing, quality gates with what is unverified, commit convention, deployment pointer and decisions"
affects: [01-15, phase-2, phase-3, phase-4, phase-5, phase-6, phase-7, phase-8]

actuals:
  tokens: 22100
  tasks: 3
  commits: 3
plan_head_before: a7b9e1814f1d6a185a2da5108692cb851de85b9a
plan_head_after: 202e1a68eb596a8ad206cffe5e422093ece06df3

tech-stack:
  added: []
  patterns:
    - "Contract blocks name their source file on the first line, show function bodies as ';' and are checked against that file by a script"
    - "An ADR index row exists for every docs/adr/NNNN-*.md file, in numeric order"

key-files:
  created:
    - docs/contracts.md
    - docs/adr/0019-deploy-on-aws-instead-of-render.md
    - docs/adr/0020-redis-on-the-private-network-without-tls.md
    - docs/adr/0021-duckdns-subdomain-with-caddy-https.md
    - docs/adr/0022-demo-only-test-mode-and-shutdown.md
    - docs/adr/0023-seed-rolls-forward-only-passed-start-dates.md
    - docs/adr/0024-folder-and-test-layout.md
    - docs/adr/0025-action-state-carries-retry-after.md
    - docs/adr/README.md
  modified:
    - README.md

key-decisions:
  - "docs/contracts.md records, rather than decides, the places where the code differs from plan.md; each cites an ADR (0006, 0010, 0013 to 0017, 0024, 0025)"
  - "Where no ADR yet settles a point, contracts.md says so: the shape of a list response in data (Phase 4), the cache keys and tag names (Phase 4), the BookingConfirmed props (Phase 6)"
  - "ADRs 0019 to 0023 state only what PROJECT.md, CONTEXT, RESEARCH, plan.md, the plan-review findings or the shipped code say; whatever PROJECT.md leaves unconfirmed (SES over SMTP, Let's Encrypt for the subdomain, the Elastic IP cost, the instance size and credit balance) is stated as unchecked and left to Phase 8"
  - "seed/README.md keeps its old date-shift wording because seed/ is left as supplied; ADR 0023 says the ADR takes precedence"

patterns-established:
  - "Verify documented signatures mechanically: normalise whitespace, comments and trailing commas on both sides, then require each declaration to be a substring of the source"

requirements-completed: [Q10, Q9, Q8]

coverage:
  - id: D1
    description: "docs/contracts.md gives exact TypeScript signatures for the envelope and codes, the server helpers, formatting and IST helpers, adapters, models and DTOs, config and test helpers, and names the phase that adds each later contract"
    requirement: Q10
    verification:
      - kind: other
        ref: "the plan's verify loop (every listed symbol present, 46 ts blocks) and a signature-comparison script over 45 source-tagged blocks: 165 chunks compared, 0 mismatches"
        status: pass
    human_judgment: false
  - id: D2
    description: "ADRs 0001 to 0025 are numbered without gaps, have non-empty Status, Context, Decision and Consequences sections, and are all listed in numeric order in docs/adr/README.md"
    requirement: Q10
    verification:
      - kind: other
        ref: "the plan's two verify commands for Task 2, run with /usr/bin/grep: 25 files, exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "README.md has the eight required sections, documents all 18 npm scripts, and its quick start works from a fresh copy"
    requirement: Q8
    verification:
      - kind: other
        ref: "the plan's verify command for Task 3, and the fresh-copy run reported under Verification"
        status: pass
    human_judgment: false
  - id: D4
    description: "The content of ADRs 0019 to 0023 is faithful to PROJECT.md and the review findings, and the unconfirmed items are labelled as unconfirmed"
    verification: []
    human_judgment: true
    rationale: "A script cannot judge whether a sentence invents a fact; a person who knows the AWS and SES situation should read the five ADRs once"

duration: 22min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 14: Contracts, ADRs 0019 to 0025 and README Summary

**docs/contracts.md with signatures compared against the code by script, ADRs 0019 to 0025 and their index, and a README whose quick start was followed from a fresh copy.**

## Performance

- **Duration:** about 22 min, from the previous plan's last commit at 20:48 IST to this plan's last task commit at 21:10 IST
- **Completed:** 2026-11-09
- **Tasks:** 3
- **Files:** 9 created, 1 modified

## Accomplishments

- `docs/contracts.md` (46 TypeScript blocks) covers every area D-07 lists, plus the supporting server modules and a table of the 14 places the code differs from `plan.md` section 4, each with its ADR. Section 10 names the phase that adds each later contract.
- Signatures were not retyped: each block names its source file, and a script compared them (see Verification). It found two mismatches on its first run, both class constructors that I had shown without bodies, and I replaced them with the verbatim class.
- ADRs 0019 to 0022 record Key Decisions 3 to 6, ADR 0023 records Key Decision 9, ADR 0024 records the folder and test layout as built, and ADR 0025 records the `retryAfterSeconds` field. The index lists all 25.
- The README now has a SESSION_SECRET step that works (the old text told readers to fill in every empty value and gave no way to do it), `docker compose up -d --wait mongo`, every npm script, and an honest list of what has not been verified.

## Task Commits

1. **Task 1: docs/contracts.md** - `022797d` (docs)
2. **Task 2: ADRs 0019 to 0025 and the index** - `638bdd0` (docs)
3. **Task 3: README** - `202e1a6` (docs)

**Plan metadata:** the docs commit that adds this file.

## Files Created/Modified

- `docs/contracts.md` - shared contracts as built
- `docs/adr/0019-deploy-on-aws-instead-of-render.md` to `0024-folder-and-test-layout.md` - Key Decisions 3 to 6 and 9, and the layout
- `docs/adr/0025-action-state-carries-retry-after.md` - the 01-12 deviation, which that plan said needed an ADR
- `docs/adr/README.md` - the index
- `README.md` - the Phase 1 README

## Decisions Made

See `key-decisions`. One judgement call worth a second look: ADR 0024 records that `config.ts` is not excluded from coverage, although QA-23 proposed excluding it, because the shipped `vitest.config.mts` excludes only `real-*` adapters and the config has tests.

## Deviations from Plan

**1. [Orchestrator request] ADR 0025 added outside `files_modified`**
- The dispatch asked for `docs/adr/0025-action-state-carries-retry-after.md`, which the plan does not list. It was written from `src/server/actions/action-state.ts`, `src/server/actions/action.ts` and the 01-12 summary, and it is in the index. Plan 01-14's own checks need at least 24 ADRs and no gaps, so 25 satisfies them, and no count in the plan was changed. The plan's truth "every ADR number from 0001 to 0024" is satisfied by a range that continues to 0025.

**2. [Rule 3 - Blocking] The plan's verify commands use plain `grep`**
- `grep` in this shell is ugrep, which treats a pattern starting with `-` as an option. The Task 2 and Task 3 checks were run with `/usr/bin/grep` substituted (and `-e` where a pattern could start with `-`). The checks are otherwise unchanged and all passed.

**3. [Rule 2 - Threat model T-01-53] A secret-pattern hit, reworded**
- The pre-commit grep for `mongodb+srv://`, `sk_live`, `sk_test_` and `AKIA` matched one line of contracts.md that described the `MONGODB_URI` rule by its scheme prefix. It was not a value, but the threat model says any hit stops the commit, so the line was reworded ("the `mongodb` or the `mongodb+srv` scheme") and the grep returned no hits across `docs/` and `README.md` before each commit.

**Total deviations:** 3. **Impact:** none on scope. No packages were installed.

## Auth gates

None.

## Verification

**Gate suite on the final tree, each its own command, exit 0:** `typecheck`, `lint`, `lint:css`, `format:check` (Prettier skips Markdown by ADR 0009, so this gate does not read the new documents), `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage` (43 files, 587 tests) and `build`. `git diff --exit-code HEAD -- plan.md` is clean, and `plan.md` is not among the commits.

**docs/contracts.md, mechanical check.** The script (kept in the session scratchpad, not in the repository) reads every TypeScript block whose first line names a file, splits it into declarations, strips comments, collapses whitespace and trailing commas on both sides, and requires each declaration to be a substring of that file. A signature written with `;` stands for a declaration with a body and is compared as a prefix.

- 46 TypeScript blocks: 45 are source-tagged and checked; 1 is the `plan.md` 4.3 `ActionState` shown for comparison, marked as not code in this repository.
- 165 declaration chunks compared; 0 mismatches at the end. 141 named exported declarations were also confirmed by name in the stated file with a pattern match. The `fakes` object in `test/helpers/fakes.ts` has an abridged body and was checked by `/usr/bin/grep -n -e 'export const fakes'` (line 23); `export { z }` was checked the same way.
- Corrected: 2 (the `AppError` and `ConfigError` constructors, shown without bodies, now verbatim). I also changed the `MONGODB_URI` line and two lines of prose after reading them back against the code.
- A negative test confirmed the script fails: a copy of the document with `safeNext(next: unknown)` changed to `safeNext(next: string)` exited 1 and named the declaration.
- Every `src/`, `test/`, `docs/` and `scripts/` path named in the document exists, except `src/server/cache.ts`, which appears only to say that it is the stale name in ADR 0012.
- The worked examples (`₹1,24,999`, `4 Sep 2027`, the 21 Nov 2026 bookability rule and the 5-day Meghalaya trip status) are each asserted by an existing test in `test/lib/`, and those tests pass in the suite.

**README quick start, followed from a fresh copy.** I made a clean `git clone` of the repository into a temporary folder in the session scratchpad (outside the repository), overlaid the then-uncommitted README, and ran these steps there on Node v24.22.2:

| Step | Result |
| --- | --- |
| `npm ci` | Ran. Installed, 8 moderate audit findings reported, no error. |
| `cp .env.example .env.local`, then the `node -e` one-liner that writes `SESSION_SECRET` | Ran. The secret was 48 characters. |
| `docker compose config -q` | Ran, exit 0. |
| `docker compose up -d --wait mongo` | **Not run in the copy.** The repository's own compose project already has a MongoDB container bound to 127.0.0.1:27017, and a second copy would collide on the port. I ran the same command in the main repository instead: it was a no-op that reported the container Running and Healthy. The copy used that running MongoDB. |
| `npm run dev`, then `/`, `/healthz`, `/readyz` | Ran. `/` 200 with the security headers and a nonce CSP; `/healthz` `{"status":"ok"}` 200; `/readyz` `{"status":"ready","checks":{"mongo":"up"}}` 200. |
| `/readyz` with MongoDB stopped, answering 503 | **Not run.** I did not stop the user's MongoDB container. The unit tests cover it. |
| `npm run build`, then `npm run start` and the same three requests | Ran. All 200, and `next start` read `.env.local`. |
| `npm run smoke` with the README's command | Ran: `smoke: ok`. |
| `npm test` | Ran: 43 files and 587 tests passed. The mongod binary was already cached on this machine, so I did **not** observe the README's "first run downloads a MongoDB binary". |
| `bundle:check`, `lhci:collect` | Not run here. They need Google Chrome and were run in plan 01-13. |

All servers I started were stopped (port 3000 was free afterwards; one `next-server` child that outlived its parent was found by its working directory and killed), and the temporary copy was deleted.

**What I could not run.** GitHub Actions cannot run here. Locally I ran every command that `ci.yml` runs except `npm audit --audit-level=high` and the artifact upload, and `bundle:check` (plan 01-13). Unconfirmed on a runner, and stated as such in the README: the workflow, the `$GITHUB_ENV` hand-off of `SESSION_SECRET`, Chrome for Lighthouse, and the pinned test `mongod` 8.0.34 on Linux. The `basic-ftp` override to 6.2.6 (ADR 0018) is described in the README as an override for an audit advisory, not as verified safe.

## Issues Encountered

- `npm run dev` writes an untracked `AGENTS.md` ("Generated AGENTS.md for AI agents. Set `agentRules: false` in next.config to disable.", Next 16.4.5). Every developer who follows the quick start gets one, and a clean-clone check that fails on untracked files will trip on it. It is outside this plan's files, so I did not change `next.config.ts` or `.gitignore`. It is for plan 01-15 or the orchestrator to settle, and probably needs an ADR note because the scaffold was created with `--no-agents-md` (ADR 0001).
- ADR 0012 still names `src/server/cache.ts`. The file is `src/server/adapters/cache.ts`. ADR 0016 already corrects this, and so does `docs/contracts.md`. The ADRs 0001 to 0018 were not edited.

## Known Stubs

None. The documents name three open points, each assigned to a phase: the shape of a list response in `data`, the cache keys and tag names (Phase 4) and the `BookingConfirmed` props (Phase 6).

## Facts for later plans

- `seed/README.md` still says "move every date"; ADR 0023 supersedes it. Phase 4's seed plan must read the ADR and settle how many whole years each passed start date moves.
- Phase 4 should update `docs/contracts.md` section 2.1 when it decides the list response shape, and section 10 when it adds each service.
- The README's deployment section is one sentence by design; Phase 8 writes the real one (D12).
- Plan 01-15's clean-clone check will see an untracked `AGENTS.md` if it runs `npm run dev` (see Issues Encountered).

## Self-Check: PASSED

Checked after the last task commit `202e1a6`:

- All 10 files exist: `docs/contracts.md`, `docs/adr/0019-deploy-on-aws-instead-of-render.md`, `docs/adr/0020-redis-on-the-private-network-without-tls.md`, `docs/adr/0021-duckdns-subdomain-with-caddy-https.md`, `docs/adr/0022-demo-only-test-mode-and-shutdown.md`, `docs/adr/0023-seed-rolls-forward-only-passed-start-dates.md`, `docs/adr/0024-folder-and-test-layout.md`, `docs/adr/0025-action-state-carries-retry-after.md`, `docs/adr/README.md` and `README.md`.
- The three task commits `022797d`, `638bdd0` and `202e1a6` are ancestors of HEAD on `gsd/phase-01-foundation-and-contracts`.
- `git rev-list --count a7b9e18..HEAD` measured 3 commits at the time of writing.
