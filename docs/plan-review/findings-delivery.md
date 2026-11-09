# Findings: delivery

Reviewer: `delivery`. Scope: plan.md §0, §11, §12, §13, §14 and CLAUDE.md, checked against the current Claude Code agent teams docs. Round 1 (independent review), 8 Nov 2026 (IST).

**Sources read** (fetched read-only with `curl -sL` into my scratchpad):
- Claude Code: https://code.claude.com/docs/en/agent-teams.md, …/tools-reference.md, …/interactive-mode.md, …/hooks.md, …/costs.md
- Next.js: https://nextjs.org/blog/next-16 and https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js source (canary):
  - https://raw.githubusercontent.com/vercel/next.js/canary/packages/create-next-app/helpers/is-folder-empty.ts
  - …/create-next-app/helpers/generate-agent-files.ts
  - …/next/src/shared/lib/router/utils/sorted-routes.ts
- Render: https://render.com/docs/free.md
- Stripe CLI: https://docs.stripe.com/stripe-cli/use-cli.md
- Lighthouse CI: https://raw.githubusercontent.com/GoogleChrome/lighthouse-ci/main/docs/configuration.md
- Local: `git help commit` (git 2.54.0), `git remote -v`, and Python scripts over `seed/data` and plan.md

**Severity summary:** 4 Blocker, 16 Major, 7 Minor (27 findings).

---

## Blockers

### DEL-01 Blocker: The shared task list the whole process runs on is off by default on current models
- **Where:** plan.md:L36 (§0), plan.md:L928 (§12), plan.md:L871 (DoD), plan.md:L1077–L1078 (§14 step 3)
- **Affects:** every Phase D to Phase 3 task and every dependency in §12; the DoD
- **Problem:** §0 has the human set only `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The task-tracking tools that hold the shared task list are a separate switch: `TaskCreate`, `TaskGet`, `TaskList` and `TaskUpdate`. They provide the task states, dependency blocking, automatic unblocking and file-locked claiming. They are provided by default only on Opus 4.7, Sonnet 4.6, Haiku 4.5 and earlier models. On current models neither the lead nor in-process teammates get them unless the human opts in.
- **Evidence:**
  - tools-reference.md, "Task tool availability": "available by default only on Opus 4.7, Sonnet 4.6, Haiku 4.5, and earlier models … On every other model, Claude Code leaves the tools out unless you opt in."
  - interactive-mode.md: "the list stays empty unless you opt in with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`".
  - tools-reference.md, "Task-tracking tools in subagents and agent teams":
    - a shell export is **not** passed to split-pane teammates; use `claude --settings '{"env":{"CLAUDE_CODE_ENABLE_TODO_TOOLS":"1"}}'`;
    - "Without the Task tools, an agent coordinates with its team through messages instead of the shared task list."
  - This review session runs on Opus 5.5 and has no task tool. That is why the lead keeps `docs/plan-review/tasks.md` by hand.
- **Effect on the build:**
  - Kickoff step 3 can't be done as written.
  - Nothing is ever "blocked", so web can start P1-WE2 before PD-4 and the designer can start PD-3 before the human approves.
  - The DoD's last box ("marked complete in the shared task list") can't be ticked.
- **Proposed fix:** replace plan.md:L36 with:
  > **Enabling agent teams.** Agent teams is an experimental Claude Code feature. Put both variables in the `env` block of `.claude/settings.json`, not only in your shell, because split-pane teammates don't inherit shell exports: `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1", "CLAUDE_CODE_ENABLE_TODO_TOOLS": "1" }`. The second variable turns on the shared task list, which current models don't get by default. Before P0-1 the lead confirms it has the `TaskCreate` tool, and stops if it doesn't. Check the Claude Code docs for the current setup.

  Also mirror the list in `docs/tasks.md` (see DEL-07).
- **Confidence:** verified

### DEL-02 Blocker: The reviewer's failing-by-design tests make every other teammate's Definition of Done impossible
- **Where:** plan.md:L986–L987 (P1-RV1, P1-RV2, both depending only on P0), plan.md:L865 (DoD: "`npm test` all pass"), plan.md:L942 (P0-7 CI runs tests on every push)
- **Affects:** every task's DoD; P1-RV1; P1-RV2; D11
- **Problem:**
  - P1-RV2 says "Tests may fail until the matching feature lands", and it starts at team creation.
  - P1-RV1 tests every route in §1.4 and every action in §1.6 from day one.
  - Both live in the default test suite (`test/regression/`, `test/security/`), and every task's DoD requires `npm test` to pass.
  - The reviewer can't meet its own DoD either.
- **Evidence:** the quotes above. The access matrix covers about 40 routes and 12 actions, almost none of which exist until late Phase 1.
- **Effect on the build:**
  - From the reviewer's first commit until the last feature lands, `npm test` is red for everyone and CI fails on every push.
  - No task can honestly be marked done.
  - Either teammates ignore the DoD, so real regressions hide among expected failures, or they wait.
- **Proposed fix:** add to P1-RV1 and P1-RV2:
  > These tests run in a separate Vitest project, `npm run test:regression`, which is not part of `npm test`, the DoD or the P0-7 CI job. The reviewer tells each owner which of their IDs pass. `test:regression` must pass at the Phase 1 gate, and from then on it is part of `npm test`.
- **Confidence:** verified (plan text)

### DEL-03 Blocker: From 22 Nov 2026 the seed's date-shift rule produces the wrong product (52 future-dated past trips, no bookable departures for a year)
- **Where:** plan.md:L664 (D10), plan.md:L50 (§0), seed/README.md "Keeping dates current"; task P1-CA5
- **Affects:** D10, B19, P1-CA5, U11, U13, U14, P2-RV1, the Phase 2 gate screenshots, P3 staging
- **Problem:** D10: "If any tour start date has passed, it moves **all** dates (tour start dates, bookings, reviews) forward by the same whole number of years, so tours stay in season and past trips stay in the past." The seed's earliest departure is 21 Nov 2026, 13 days from today. Phase 0 alone will take longer than that, so P1-CA5's seed will always run after it. A one-year shift of *everything* then moves the past trips (Jan to Aug 2026) into 2027, which is in the future.
- **Evidence:** script over `seed/data`, simulating a seed run on 22 Nov 2026:
  ```
  tours 13 users 35 reviews 52 bookings 58      (§0 counts are correct)
  start dates min/max 2026-11-21 2027-10-16
  past booking startDate range 2026-01-10 2026-08-08
  review createdAt range 2026-01-15T20:15:00+05:30 2026-08-20T20:15:00+05:30
  shift years 1
  past bookings that land in the future after shift: 52 of 52
  earliest bookable departure after shift: 2027-11-21
  tour start dates within 12 months of 2026-11-22 before shift: 38 after shift: 1
  ```
- **Effect on the build:**
  - Every seed traveller's 2026 trips appear under "Upcoming" on My tours.
  - All 52 reviews are dated in 2027, for trips that haven't happened.
  - "Write a review" never appears on a past trip.
  - Every tour's next departure is a year away.
  - The Phase 2 gate screenshots and staging show this to the human.
- **Proposed fix:** replace the D10 sentence (and the matching seed/README.md paragraph) with:
  > If a tour start date has passed when the seed runs, move **that date** forward by whole years until it is in the future, so it stays in season. Bookings and reviews keep their dates; an upcoming booking whose date has passed becomes a past trip. Only if the seed's reference date (8 Nov 2026) is more than a year ago, first move every date in every file forward by the number of whole years since 8 Nov 2026.

  Also add a D10 test (see DEL-20).
- **Confidence:** verified

### DEL-04 Blocker: Next.js 16 no longer prints "First Load JS", so P0-7's baseline, R9's check and the Phase 1 gate can't be done as written
- **Where:** plan.md:L630 (R9), plan.md:L942 (P0-7 "`docs/bundle-baseline.json` from a first `next build`"), plan.md:L968 (P1-PL5 `check-bundle.ts`), plan.md:L992 (Phase 1 gate "the bundle budget … pass"), plan.md:L1044 (§13)
- **Affects:** R9, P0-7, P1-PL5, Phase 1 gate, D11
- **Problem:** R9 says "Phase 0 records each route's 'First Load JS' from `next build`". The plan targets Next.js 16, whose build output no longer has that column.
- **Evidence:** https://nextjs.org/docs/app/guides/upgrading/version-16: "Next.js 16 removes the size and First Load JS metrics from the next build output. We found these to be inaccurate in server-driven architectures using React Server Components … The most effective way to measure actual route performance is through tools such as Chrome Lighthouse".
- **Effect on the build:**
  - P0-7 can't produce the baseline, which holds up the Phase 0 gate.
  - `check-bundle.ts` has nothing to parse.
  - The Phase 1 gate's bundle check can't run.
  - (Likely also raised by architect or qa; I report it because it stops a task and a gate.)
- **Proposed fix:** a decision for the lead in ADR 0001. Recommendation: replace R9's measurement with Lighthouse CI budgets.
  > **R9 JavaScript budget.** Lighthouse CI asserts `resource-summary:script:size` on every page in §1.5 (except `/styleguide`). Phase 0 records each route's value for the placeholder pages in `docs/bundle-baseline.json`. No page may exceed its baseline by more than 40 KB. The tour page gets its own budget that includes the lazily loaded map.

  LHCI documents budgets of the form `resource-summary:<resourceType>:(size|count)` (lighthouse-ci configuration.md). The alternative is a script over Next.js 16's build manifests, whose format I couldn't verify.
- **Confidence:** verified (removal); likely (LHCI replacement measures what R9 intends)

---

## Major

### DEL-05 Major: Per-task plan approval isn't enforced by Claude Code, and seven teammates make the lead a serial bottleneck
- **Where:** plan.md:L896 (§11.2 rule 1), L897 (rule 2), L898 (rule 3), L829 (U26 baseline approval), L1005 (P2-ALL1), L883 (lead owns `test/setup.ts`, `test/helpers/`), L1079–L1080 (§14 step 4)
- **Affects:** all tasks; §11.2; §14 steps 1, 4 and 6
- **Problem:**
  1. **The approval isn't enforced.** The plan requires a plan message before *every* task and "Wait for approval". Claude Code's built-in approval works differently:
     - a teammate starts in plan mode only if the lead was in plan mode when it was spawned;
     - it leaves plan mode after its first approved plan;
     - "If you haven't changed that teammate's permission mode since it was spawned, Claude Code approves the plan as soon as the request arrives, without the lead reviewing it."

     So per-task approval is a messaging convention that nothing enforces.
  2. **Everything else also routes through one session:**
     - about 40 task plans (5 Phase D, 22 Phase 1, 7 Phase 2, 3 Phase 3), plus one for every reviewer finding task;
     - every new package (rule 3);
     - every contract question and ADR (rule 2);
     - every change to the lead-owned `test/setup.ts` and `test/helpers/` that a module's tests need;
     - every changed screenshot baseline (U26);
     - OpenAPI assembly;
     - four gates.
  3. **Twelve tasks across all seven teammates become startable at the same moment** (Appendix B), so seven plans arrive at once.
  4. **The lead starts the team with a heavy context.** It does all seven Phase 0 tasks in the context it later coordinates from.
  5. The docs advise "Start with 3-5 teammates" and "5-6 tasks per teammate". The team size is a deliberate choice; the defect is that the approval load grows with it while there is one approver.
- **Evidence:** agent-teams.md, "Have teammates plan before implementing" and "Choose an appropriate team size"; dependency script (Appendix B).
- **Effect on the build:** teammates either idle waiting or start before approval, which defeats the §7 server/client check the approval exists for. Approvals get shallower as the lead's context fills and compacts.
- **Proposed fix:** replace §11.2 rule 1 with:
  > 1. **Plan first, once per phase.** At the start of each phase, send the lead one plan covering all your tasks in that phase: files, approach, what runs on the server and what in the browser, and the IDs you'll test. Wait for approval before your first edit. After that, send a new plan only for a task that changes a contract, adds a Client Component or needs a new dependency. Fixes for reviewer findings need no plan.

  Add to §14 step 1: "When the Phase 0 gate passes, commit, write `docs/tasks.md`, and start a fresh lead session for steps 2–8." Batch package requests: teammates send them to the lead, and the lead installs at most twice a day.
- **Confidence:** verified (docs behaviour); likely (bottleneck effect)

### DEL-06 Major: Every teammate's permission prompts land on the human, and none of the ownership or git rules is enforced
- **Where:** plan.md:L68 ("The lead handles everything else"), L879, L899–L902 (§11.2 rule 4), L890 (reviewer read-only)
- **Affects:** §0, §11.1, §11.2, §14
- **Problem:**
  - The docs: "Teammate permission prompts appear in the lead session, so approve them there yourself." And: "You can't set per-teammate permission modes at spawn time. A new teammate starts with the lead's mode, including `bypassPermissions`."
  - The plan sets up no allowlist, so every `npm`, `npx playwright`, `git add` and `git commit`, `docker compose` and file write from seven teammates prompts the human.
  - If the human avoids that by running the lead in `bypassPermissions` or `auto`, every teammate inherits it. The ownership map and the git rules ("never `git add -A`", "never reset, rebase, stash or force-push") then become honour-system only.
- **Evidence:** agent-teams.md, "Permissions" and "Too many permission prompts" ("Pre-approve common operations in your permission settings before spawning teammates"). hooks.md:
  - `PreToolUse` input carries `agent_id` and `agent_type` for in-process teammates;
  - `TaskCompleted` "Use this to enforce completion criteria like passing tests or lint checks", and its input includes `teammate_name`.
- **Effect on the build:** the human is tied to the terminal for days, contradicting L68, or the rules that make parallel work safe go unenforced.
- **Proposed fix:**
  - Add to P0-1: write `.claude/settings.json` (owned by the lead) with:
    - `permissions.allow`: `Bash(npm run *)`, `Bash(npx vitest *)`, `Bash(npx playwright *)`, `Bash(git add *)`, `Bash(git commit *)`, `Bash(git status*)`, `Bash(git diff*)`, `Bash(git log*)`, `Bash(docker compose *)`;
    - `permissions.deny`: `Bash(git add -A*)`, `Bash(git add .)`, `Bash(git reset*)`, `Bash(git rebase*)`, `Bash(git stash*)`, `Bash(git push*)`, `Bash(git checkout -- *)`;
    - a `TaskCompleted` hook that runs `npm run typecheck && npm run lint` and refuses completion if they fail.
  - Replace L68 with:
    > **Your role as the human.** You keep the lead's terminal open while the team runs and answer any permission prompt the allowlist doesn't cover. You provide the accounts and secrets in the table below, approve the design at the design gate, and approve or request changes at the Phase 2 gate. The lead handles everything else.
  - An ownership-enforcing `PreToolUse` hook is possible, but whether `agent_type` carries a teammate's name when it was spawned without a definition is **unverified**.
- **Confidence:** verified (docs); likely (effect)

### DEL-07 Major: No recovery procedure when the lead session ends; teammates and the task list don't come back
- **Where:** plan.md:§0, §14 (no resume step), L1075–L1078
- **Affects:** the whole multi-day build
- **Problem:** the build will run for days in one lead session. The docs list these limitations:
  - "No session resumption with in-process teammates: `/resume` and `/rewind` do not restore in-process teammates."
  - "One team per session."
  - "Task status can lag … blocks dependent tasks."
  - The task list is stored under `~/.claude/tasks/{team-name}/`, and the team name is session-derived (`session-` plus the first eight characters of the session ID).

  The plan keeps no copy of task state in the repo and has no re-spawn procedure.
- **Evidence:** agent-teams.md, "Limitations" and "Architecture".
- **Effect on the build:** a closed terminal, a sleeping laptop or a crash loses all seven teammates mid-phase. The new lead has no task list and must reconstruct who was doing what.
- **Proposed fix:**
  - Add to P0-7: "Write `.claude/agents/<name>.md` for each teammate (its §11.3 brief, its ownership row, and 'read `docs/tasks.md` for your tasks'), and `docs/tasks.md` mirroring the shared list." Agent-teams.md "Use subagent definitions for teammates" supports spawning a teammate from a definition.
  - Add §14 step 9:
    > If the lead session ends, start a new one, recreate the shared task list from `docs/tasks.md`, and spawn each teammate again from `.claude/agents/<name>.md`, telling it which of its tasks are done. The lead updates `docs/tasks.md` whenever a task completes.
- **Confidence:** verified (docs)

### DEL-08 Major: One shared checkout breaks commits, dev servers and the DoD as soon as several teammates work at once
- **Where:** plan.md:L879 ("Teammates share one checkout"), L899–L902 (rule 4), L865 (DoD), L858 (Q8)
- **Affects:** Q8 traceability, the DoD, P1-RV3, PD-4, P2-DS1, P2-RV1, P1-PL5
- **Problem:**
  1. **Commits pick up other teammates' files.** "Stage only your owned paths" doesn't protect commits. The index is shared, so if teammate A stages its files and teammate B commits before A does, B's commit contains A's files under B's task ID.
  2. **Only one dev server and one build at a time.** Next.js 16 "lockfile mechanism prevents multiple next dev or next build instances on the same project". Designer (styleguide screenshots), web (page screenshots), reviewer (Playwright, axe) and platform (bundle check) can't each run their own dev server or build.
  3. **Other teammates' work in progress breaks your checks.** `tsc --noEmit` and `npm test` check the whole tree, so one teammate's half-written file fails everyone else's DoD.
  4. **Worktree isolation isn't available for teammates.** A teammate is launched only when the Agent call has a name and does *not* pass `isolation`.
- **Evidence:**
  - `git help commit`: listing files "ignore[s] changes staged in the index, and instead record[s] the current content of the listed files (which must already be known to Git)".
  - nextjs.org/docs/app/guides/upgrading/version-16, "Concurrent dev and build".
  - agent-teams.md, "How Claude starts agent teams": "unless the call is a fork or passes `isolation` on the call itself".
- **Effect on the build:** commits with the wrong task IDs, dev servers that refuse to start, and DoD checks that fail for reasons outside the teammate's own task.
- **Proposed fix:** replace rule 4 with:
  > 4. **Git and shared tools.**
  >    - Commit only your own paths: `git add <new files>`, then `git commit -m "feat(tours): query builder with allowlist [P1-CA1]" -- <your paths>`.
  >    - Never reset, rebase, stash or push. Only the lead pushes, at each gate.
  >    - One `npm run dev` (port 3000) runs for the whole team, started by the human in a separate terminal. Playwright uses `webServer.reuseExistingServer: true`.
  >    - `next build` runs only in gate checks and in the reviewer's Lighthouse and visual tasks, one at a time.
  >    - Your DoD runs `npm run typecheck`, `npm run lint` and your own tests (`npx vitest run test/integration/<module>`). The full `npm test` runs at gates.
  >    - Don't leave a half-written export in a file someone else imports.
- **Confidence:** verified

### DEL-09 Major: Web's tasks are blocked behind the whole component library and the human gate, which contradicts web's brief
- **Where:** plan.md:L921 (web brief "Before the design gate, build routes, data loading and forms with plain unstyled markup"), L930, L957 (PD-4 "Deliver in this order so `web` can start early"), L982–L985 (P1-WE2 to P1-WE5 all depend on PD-4)
- **Affects:** P1-WE2 to P1-WE5, PD-4, Phase 1 gate
- **Problem:**
  - A task-level dependency on PD-4 unblocks only when *all* of PD-4 (about 30 components plus the styleguide) completes. The docs: "shows as blocked … until they're completed. Teammates don't self-claim a blocked task."
  - PD-4 itself waits on PD-3, which waits on the human's design gate.
  - So before the gate, web can only claim P1-WE1. The pre-gate "data loading and forms" work in the brief belongs to WE2 to WE5, which are blocked, and is tracked nowhere.
  - After the gate, the brief has web rebuild pages "only from `ui/` components", so the unstyled markup is thrown away.
- **Evidence:** dependency script (Appendix B): web tasks blocked by PD-4 are P1-WE2, P1-WE3, P1-WE4 and P1-WE5. Longest chain: P0-1 … P0-7 → PD-1 → PD-2 → **design gate (human)** → PD-3 → PD-4 → P1-WE2 → Phase 1 gate → P2-WE1 → P2-DS1 → P2-RV2 → P2-PL1 → Phase 2 gate (19 steps).
- **Effect on the build:** web idles through the human gate, PD-3 and all of PD-4, then becomes the bottleneck for the Phase 1 gate. "Deliver in this order" has no effect. Untracked pre-gate work bypasses plan approval and review.
- **Proposed fix:**
  - Split PD-4 into tasks in its delivery order:
    - PD-4a: header, footer, skip link
    - PD-4b: form parts
    - PD-4c: tour row, difficulty, price, pagination, empty state
    - PD-4d: facts strip, booking panel
    - PD-4e: itinerary, map frame
    - PD-4f: reviews, star rating, guide item, avatar, photo credits
    - PD-4g: the rest
  - Split each of P1-WE2 to P1-WE5 into two tasks:
    - `-a` "data loading, Server Action wiring and unstyled markup", depending on the backend tasks and P1-WE1 but not on design;
    - `-b` "build from `ui/` components", depending on `-a` and the specific PD-4 parts. For example, P1-WE2b depends on P1-WE2a, PD-4b and PD-4c.
  - Change the brief to: "Before the design gate, do your `-a` tasks."
- **Confidence:** verified (plan text + docs)

### DEL-10 Major: Phase-level dependencies aren't tasks; P1-RV4 never completes, so Phase 2 never unblocks; Phase 3 has no dependencies
- **Where:** plan.md:L989 (P1-RV4, depends on "ongoing"), L1001–L1006 ("Depends on: Phase 1"), L991–L995 and L1009–L1013 (gates aren't tasks), L1017–L1022 (Phase 3 table has no Depends-on column), L953 and L964 etc. ("Depends on: P0"; Phase 0 tasks aren't loaded, per §14 step 3)
- **Affects:** all Phase 2 and Phase 3 tasks, the gates
- **Problem:** the task list can only depend on tasks. "Phase 1" has to become "every P1 task", which includes P1-RV4, a task that never ends. "P0" refers to tasks that are never loaded. The Phase 1 and Phase 2 gates aren't tasks, so nothing blocks Phase 2 until the gate checks pass. Phase 3 has no dependencies at all, so P3-RV1 (staging smoke test) is claimable on day one.
- **Evidence:** plan text; dependency script (Appendix B).
- **Effect on the build:** either P2 is blocked forever, or the lead loads P2 without dependencies and teammates start Phase 2 before the gate.
- **Proposed fix:**
  - Drop "P0" from Depends-on (Phase 0 is finished before the list exists).
  - Add lead tasks:
    - **G1 Phase 1 gate**, depending on every PD and P1 task except P1-RV4;
    - **G2 Phase 2 gate**, depending on every P2 task.
  - P2 tasks depend on G1.
  - Add a Phase 3 Depends-on column:
    - P3-PL1 depends on G2 and the human's accounts (task H3, see the human table);
    - P3-PL2 and P3-RV1 depend on P3-PL1;
    - P3-LD1 depends on P3-PL2 and P3-RV1.
  - Replace P1-RV4 with: "For each completed task, the reviewer creates `RV-<task ID>`. Findings become tasks `F-<task ID>-<n>` tagged with requirement IDs, for example `F-P1-CA4-1 [S5] updateReviewAction lets non-author edit`." This also gives fixes a task ID for Q8 and CLAUDE.md (see DEL-23).
- **Confidence:** verified

### DEL-11 Major: Missing dependencies between Phase 1 tasks
- **Where:** plan.md:§12, L964–L989
- **Affects:** P1-WE1, P1-WE2, P1-WE5, P1-CO1, P1-CA2, P1-PL4, P1-PL2, PD-5
- **Problem and evidence:**

  | Task | Needs | Why (plan text) | Listed? |
  |---|---|---|---|
  | P1-WE2 overview | P1-CA2 | §7.2 L638: overview calls `toursService.list(query)`. §4.4 L521: that function is "cached with tag `tours`", and P1-CA2 is "Tour service with cache tags". | Only CA1 |
  | P1-WE5 My tours | P1-CA4 | U13 L811: "Past tours offer 'Write a review' if the user hasn't reviewed it" needs `reviewsService.canReview` (L525, built in CA4). | No |
  | P1-WE1 header, sitemap | P1-ID1, P1-CA2 | L309: `logoutAction` is used in the header. R10 L631: `sitemap.ts` lists every tour. | P0 only |
  | P1-CO1 checkout | P1-CA2 | S17 L577: price from the database; B8: 404 for a missing tour. §3.2 rule 6 (L381): modules can't import another module's model, so CO1 needs `toursService.getById` (L523). | P0 only |
  | P1-CA2 tour delete | a bookings function | L239: "Returns 409 if the tour has bookings". §4.4 lists only `hasPaidBooking` and `listMine`, and no task asks commerce to provide e.g. `bookingsService.countForTour`. | No task, no contract |
  | P1-PL4 graceful shutdown | a lead ADR | D5 L659: "The lead checks the current Next.js docs … and records it in an ADR". There is no lead task for it. | No |
  | P1-PL2 email rendering vs PD-5 | a template | PL2 renders React Email templates, but templates are designer-owned (`src/emails/`) and PD-5 depends on PL2 *and* on the human gate. | Circular in practice |

- **Effect on the build:** teammates claim tasks whose inputs don't exist yet. They stub them (rework) or reach into another module's model, which breaks the Q2 lint rule and rule 6.
- **Proposed fix:**
  - Add the dependencies above.
  - Add to §4.4 and P1-CO3: "`bookingsService.countForTour(tourId)` returns `number`; never cached."
  - Add lead task P0-8 "D5 shutdown ADR" before P1-PL4.
  - Add to P1-PL2: "Test rendering against a test-only template in `test/fixtures/emails/`; PD-5 replaces it."
- **Confidence:** verified (plan text)

### DEL-12 Major: The same components are claimed by both `designer` (`ui/`) and `web` (`features/`)
- **Where:** plan.md:L424 (§3.3 `features/`: "tour row, booking panel, review form, route map (web)"), L797 (U4 `ui/` list), L957 (PD-4), L981 (P1-WE1 "root layout with header and footer, `MobileMenu`"), L639–L644 (§7.2 client components), L856 (Q6), L892, L888 and L890
- **Affects:** U4, U14, U15, U19, PD-4, P1-WE1, P1-WE3, P1-WE5; test ownership
- **Problem:** two owners for:
  - **Components claimed by both sides:**

    | Component | `designer` claims it in | `web` claims it in |
    |---|---|---|
    | tour row | U4, PD-4 | §3.3 `features/` |
    | booking panel | U4, PD-4 | §3.3 `features/` |
    | review form | U4, PD-4 | §3.3, P1-WE3 |
    | header, footer, mobile menu | U4, PD-4 (delivered first) | P1-WE1, U19 |
    | star rating input | U4 | §7.2 `StarRatingInput`, U14 |
    | file input with preview | U4 | §7.2 `PhotoInput`, U15 |
    | confirm dialog | U4 | §7.2 `DeactivateDialog` |
    | photo credits | U4 | P1-WE3 |
    | map frame | U4 | `RouteMap` in P1-WE3 |
  - `docs/design/a11y-walkthrough.md`: designer's `docs/design/**` and also reviewer's explicit path.
  - D10: platform ("D1–D13") and catalog.
  - `test/components/`: web and designer. Q6's star-input and photo-input tests have no clear author.
- **Evidence:** the quoted lines.
- **Effect on the build:** both teammates build the header, booking panel and review form, or each waits for the other. Their versions of the same component diverge.
- **Proposed fix:** add to §4.6:
  > Every component in U4 lives in `ui/`, and `designer` owns its markup, CSS and client logic (including `MobileMenu`, `StarRatingInput`, `PhotoInput` and `ConfirmDialog`). `web` owns thin wrappers in `features/` that connect data and Server Actions, for example `features/booking-panel-form.tsx` renders `ui/BookingPanel` with the tour's dates and `startCheckoutAction`. `RouteMap` (Leaflet) is `web`'s; `ui/MapFrame` is its frame. P1-WE1 builds an unstyled header and swaps in `ui/Header` after PD-4a.

  Then:
  - replace §3.3 L424 with "page-level wrappers that connect `ui/` components to data and actions, plus `RouteMap` (web)";
  - set platform to "D1–D9, D11–D13";
  - make reviewer's path `docs/design/a11y-walkthrough.md` an explicit exception to designer's `docs/design/**`;
  - split `test/components/ui/` (designer) from `test/components/features/` (web).
- **Confidence:** verified

### DEL-13 Major: Files nobody owns, and tasks that require writing someone else's file
- **Where:** plan.md:§11.1 L881–L892; §12 P0-1, P1-RV3, P2-RV2, P2-ALL1, P3-PL2, PD-3
- **Affects:** P1-RV3, P2-RV1, P2-RV2, P2-ALL1, P3-PL2, PD-3, Q6, Q10, Q11, D4, D9, D13, S18
- **Problem:** see Appendix A for the full map.
  - **No owner:**
    - `playwright.config.ts` (P1-RV3's "no-JavaScript Playwright project", U26, P2-RV1)
    - the Vitest config (Q6 coverage thresholds)
    - `.env.example` (D4; every new config key)
    - `.gitignore` (D9)
    - `README.md` (Q10, D12, P3-PL2)
    - knip and Redocly configs
    - `AGENTS.md`: create-next-app writes it, and `next dev` "rewrites AGENTS.md on mismatch" (create-next-app `generate-agent-files.ts`; verified on canary, unverified on stable)
    - create-next-app's `src/app/globals.css`, `page.module.css` and `public/*.svg` (Next.js and Vercel logos, which are placeholder images under CLAUDE.md)
    - `CLAUDE.md` and `.claude/**`
    - an OpenAPI fragment for `/healthz` and `/readyz`
    - platform's own tests (`test/integration/<module>/` covers modules only)
    - the location of P0-2's format tests
  - **Tasks that require writing someone else's file:**
    - P2-RV2 "the Lighthouse CI config" needs `lighthouserc.json`, which is platform's, while the reviewer is "read-only everywhere else";
    - P2-ALL1 "lead … adds `redocly lint` to CI" needs `.github/`, which is platform's;
    - P3-PL2 "README sections" (no owner);
    - PD-3's themes and fonts must be imported in `src/app/layout.tsx` (U3 L796, U6 L799), which is web's.
- **Effect on the build:** the reviewer can't create its Playwright projects or Lighthouse budgets without breaking ownership; coverage thresholds and `.env.example` drift; teammates argue over or duplicate root config files.
- **Proposed fix:** add to §11.1:
  - lead: `.env.example`, `.gitignore`, `README.md`, `vitest.config.ts`, `CLAUDE.md`, `.claude/**`, `AGENTS.md`, `docs/tasks.md`;
  - platform: knip and Redocly configs, `test/integration/platform/**`, `docs/openapi/paths/operations.yaml`;
  - reviewer: `playwright.config.ts` and `lighthouserc.json` (moved from platform; platform's CI only calls the scripts).

  Add to P0-1: "Delete create-next-app's sample page, `page.module.css`, `globals.css` and `public/*.svg`." Add to PD-3: "`web` adds the imports of `src/styles/*.css` and `fonts.ts` to `src/app/layout.tsx` when PD-3 is ready." Teammates who need README text send it to the lead.
- **Confidence:** verified (plan text); create-next-app files verified from canary source

### DEL-14 Major: No hand-off rule for Phase 0 files, and the rule that "only the lead changes a contract" collides with file ownership
- **Where:** plan.md:L883 (the only hand-off rule is for models), L457 (§4 "Only the lead changes a contract"), L936–L942 (P0-1 to P0-7), L969 (P1-ID1 "harden `getCurrentUser`"), L964 (P1-PL1 "origin check in `withApi`")
- **Affects:** P0-1 to P0-7; P1-PL1, P1-ID1, P1-CO1, P1-CA2; §4
- **Problem:** in Phase 0 the lead writes files that §11.1 gives to others afterwards:
  - **platform:** `config.ts`, `instrumentation.ts`, `logger.ts`, `errors.ts`, `deps.ts`, `db.ts`, `server/api/**`, `server/actions/**`, `/healthz`, all fake adapters, `next.config.ts`, the ESLint, stylelint and Prettier configs, the CI workflow;
  - **identity:** `session.ts`, `redirects.ts`, `users/dto.ts`;
  - **catalog:** `tours/dto.ts`, `reviews/dto.ts`;
  - **commerce:** `bookings/dto.ts`, and `hasPaidBooking` in `bookings/service.ts`;
  - **web:** placeholder pages, `layout.tsx`.

  Many of these implement §4 contracts (`withApi`, `action()`, `getSession`, `requireRole`, the mappers). The plan never says whether the new owner may change them, or only the lead.
- **Evidence:** plan text as quoted.
- **Effect on the build:** owners either treat these as lead files and ask permission for each change (adding to DEL-05), or change exported signatures that other teammates are coding against.
- **Proposed fix:** add to §11.1 after the table:
  > At team creation, every Phase 0 file passes to its owner in this table. Owners may change the implementation freely. Changing an exported name, a signature or a behaviour described in `docs/contracts.md` goes through the lead (§11.2 rule 2).
- **Confidence:** verified

### DEL-15 Major: P2-RV2 and P2-PL1 depend on each other, and screenshot baselines are taken before design fixes land
- **Where:** plan.md:L829 (U26 "Baselines are generated in the CI container"), L942 (P0-7 CI: typecheck, lint, tests, build only), L1004 (P2-RV2 depends on P2-DS1), L1007 (P2-PL1 "Complete the CI pipeline as described in D11" depends on P2-RV2), L1002 (P2-DS1 "file fixes for web")
- **Affects:** U26, U24, D11, P2-RV2, P2-PL1, P2-DS1, Phase 2 gate
- **Problem:**
  - **The two tasks wait on each other.** P2-RV2 must generate baselines in the CI container, but CI only gets Playwright and Lighthouse in P2-PL1, which waits for P2-RV2.
  - **No way back into the repo.** Nothing says how baselines made in a GitHub Actions container get back into the repo.
  - **Baselines come too early.** P2-DS1 "files fixes" as new tasks *after* it completes, yet P2-RV2 depends only on P2-DS1, so baselines are captured before the fixes and every fix changes a baseline, each needing the lead's approval.
- **Evidence:** plan text; dependency script.
- **Effect on the build:** P2-RV2 stalls or makes baselines on a local machine, which U26 forbids. Baselines are then redone after design fixes.
- **Proposed fix:**
  - Split P2-PL1:
    - **P2-PL1a** (after G1): "CI jobs for Playwright and Lighthouse CI, plus `npm run test:visual:update`, which runs Playwright in the pinned `mcr.microsoft.com/playwright` image locally and in CI";
    - **P2-PL1b** (after P2-RV2): the rest of D11.
  - Add **P2-DS2** "designer signs off design QA", depending on every fix task P2-DS1 files.
  - P2-RV2 depends on P2-PL1a and P2-DS2.
- **Confidence:** verified (plan text); Playwright Docker image name from memory, unverified

### DEL-16 Major: The `docker compose` gate checks have no payments or storage setup, and the plan says those accounts aren't needed until Phase 3
- **Where:** plan.md:L56 (prerequisites "aren't needed until" Phase 3), L662 (D8 compose: mongo, redis, mailpit, web, worker), L656 (D2 "filesystem is treated as read-only"), L966 (P1-PL3 adapters "local, S3"), L384 (§3.2 rule 9 fakes "by environment"), L1003 (P2-RV1 smoke "against `docker compose` … with the fake Stripe client, simulate the webhook"), L1013 (Phase 2 gate "checks the main user flows by hand"), L1033–L1036 (§13)
- **Affects:** P2-RV1, Phase 2 gate, §13 backend checks, D2, D8, S2
- **Problem:** the plan never says which adapters run in compose.
  - **Storage:** compose has no object storage, so seed photos and uploads go to a "local" adapter on a read-only container filesystem. There's no host for `next/image` `remotePatterns`, and "uploaded images survive a container restart" can't hold.
  - **Payments:** with the real Stripe adapter there are no keys until Phase 3, so the lead's hand check of booking at the Phase 2 gate can't run. With the fake, the browser has nowhere real to go, and a fake checkout page in a production build is a debug endpoint (S2).
- **Effect on the build:** P2-RV1 and the Phase 2 gate's manual flows can't be performed as written, or teammates add an S2-violating fake checkout route.
- **Proposed fix (decision for the human; recommend option a):**
  - **(a)** Add MinIO (S3-compatible) and a one-shot bucket-creation service to `docker-compose.yml`, so every environment except unit tests uses the S3 adapter. Move Stripe **test-mode** keys from "before Phase 3" to "before the Phase 2 gate". Compose runs the Stripe CLI as `stripe listen --forward-to http://web:3000/webhooks/stripe` (the `--forward-to` flag is documented at docs.stripe.com/stripe-cli/use-cli). P2-RV1 then uses real test mode.
  - **(b)** Keep fakes in compose. Then P2-RV1 posts a signed fake event through a test helper, and the Phase 2 gate drops "booking" from the hand checks.
- **Confidence:** verified (plan text, Stripe CLI flag); likely (MinIO fit)

### DEL-17 Major: What the human must provide is incomplete, mistimed and partly contradicted by L68
- **Where:** plan.md:L56–L61, L68, L841, L955, L1013, L1081–L1087
- **Affects:** P0-7, D11, D12, D14, P1-CA5, P1-PL5, Phase 2 gate, Phase 3
- **Problem:**
  - **Missing from the list:**
    - a GitHub repository with Actions enabled (P0-7 CI, the Phase 2 gate's "CI passes in full", Dependabot for S18). Nobody is told to push, so CI never runs. This repo does have `origin https://github.com/rithik56/natours-claude.git`, but L3 says "an empty repository".
    - Docker on the build machine (P1-PL5, P2-RV1, Phase 2 gate);
    - a map-tile account or key if D14 picks a provider that needs one (decided in P0-7, needed in P1-WE3);
    - `SEED_USER_PASSWORD` for staging;
    - Render costs. Background workers have no free tier. A free web service "spins down … 15 minutes without … traffic" and takes "about one minute" to start, which makes P3-RV1's Lighthouse run against staging unreliable. Free Key Value "do[es] not continually persist" (render.com/docs/free).
    - Stripe dashboard access to create the staging webhook (P3-PL1);
    - permission prompts (DEL-06).
  - **Missing loops:** neither gate defines what happens when the human asks for changes. L68 says the human only "see[s]" the Phase 2 screenshots, and §14 step 7 says "send me", with no approval or change step.
- **Evidence:** render.com/docs/free.md (free service types: web services, Postgres, Key Value; spin-down; Key Value not persisted); plan text; `git remote -v`.
- **Effect on the build:**
  - P0-7's CI never runs and the Phase 2 gate "CI passes in full" can't be checked.
  - Phase 3 stalls on unpaid Render plans.
  - Design-gate changes have no defined rework path.
- **Proposed fix:** replace L56–L61 and L68 with the table in "What the human must provide, and when" below. Add to the design gate row: "If the human asks for changes, the designer revises PD-1 and PD-2 and the lead shows them again." Add to the Phase 2 gate: "The human approves or lists changes; changes become `web` and `designer` tasks, and the gate repeats."
- **Confidence:** verified

### DEL-18 Major: Changes to users leave stale guide and reviewer details in the cached tour and review pages, and no task clears them
- **Where:** plan.md:L522 (`getBySlug` cached with `tour:<id>`), L602 (B12: tour page populates guides' name, photo, role), L524 (`listForTour` cached with `reviews:<tourId>`), L566 (S6 deactivated users "left out of queries"), L918 (catalog brief: "every write that changes tours or reviews must clear the right tags"), L971–L972 (P1-ID3, P1-ID4)
- **Affects:** R5, S6, P1-ID3, P1-ID4, P1-CA2, P1-CA4
- **Problem:** the tour and review caches hold user data: guide name, photo and role, and review authors. Writes that change that data belong to identity: `updateMeAction` (name, photo), admin `PATCH /users/[id]` (name, role, active), and `deactivateMeAction`. Catalog owns the tags but never sees these writes. Identity has no task or contract for clearing them.
- **Effect on the build:**
  - A guide who changes their photo still shows the old one on tour pages.
  - A deactivated guide or reviewer still appears on cached pages, against S6.
  - The two-user cache test won't catch it.
- **Proposed fix:**
  - Add to §4.4: "`toursCache.invalidateForUser(userId)` in `tours/cache.ts` (catalog) clears `tour:<id>` for every tour the user guides and `reviews:<tourId>` for every tour they reviewed."
  - Add it to P1-CA2.
  - Add to P1-ID3 and P1-ID4: "call `toursCache.invalidateForUser` after changing a user's name, photo, role or `active`", with tests tagged R5 and S6.
- **Confidence:** verified (plan text)

### DEL-19 Major: §11.1 and §12 disagree about who owns several requirements, so some will be missed
- **Where:** plan.md:L884–L890 (§11.1) against L964–L989 (§12 IDs columns)
- **Affects:** S1, S2, S5, S7, S9, S19, S22, B12, B19, B20, D10, D14, U7, U22, U24, U25, U26, R11
- **Problem** (full table in Appendix C):
  - **S5 and B12:** P1-CO3 (commerce) lists them; §11.1 doesn't give them to commerce. Identity owns S5 through its "S3–S9" range but has no S5 task.
  - **S7:** identity owns it through "S3–S9", but no identity task lists it. Login's "fields must be strings" check is assigned to nobody; P1-CA1 covers only the query builder.
  - **S9:** P1-CO1 lists it; commerce isn't an owner.
  - **S19:** owned by platform, tasked to web (P1-WE1).
  - **S2:** owned by platform, but `/styleguide`'s `notFound()` is designer's file. No task.
  - **S22:** tasked to P1-ID2 (forgot, reset, change password). The behaviour is in `loginAction` (P1-ID1), the login page (P1-WE4) and "Log in to book" (P1-WE3).
  - **S1:** only bookings has an owner. Declaring access for auth, users, tours and reviews routes is nobody's job.
  - **D14:** no owner. Decided by the lead (P0-7), built by web (P1-WE3).
  - **U7:** owned by designer, tasked to platform (P1-PL3), implemented in web's pages.
  - **U25:** owned by designer. The self-drawing route line lives in web's `RouteMap`.
  - **R11:** only P1-WE2 lists it, though the no-JavaScript list covers WE3 to WE5.
  - **U22, U24, U26:** the reviewer verifies them, but nobody owns *meeting* them.
  - **B19 and B20:** owned by catalog and commerce. The formatting is the lead's (P0-2) and the display is web's.
- **Effect on the build:** reviewer findings go to the wrong owner, and requirements fall between teammates. S7 on the login form and S1 access declarations for non-booking routes are the likeliest to be missed.
- **Proposed fix:** make each §11.1 "Main requirement IDs" cell the union of that teammate's §12 IDs columns, and add owners for gaps:
  - commerce: S1 (bookings), S4, S5, S9, S17, B7, B8, B12, B20;
  - identity: S3, S4, S6, S7 (login input), S8, S9, S13, S14, S20, S22, S23, B13–B16, and S1 for auth and users routes;
  - catalog: S1 for tours and reviews routes;
  - web: S19, D14 (map), U7, U22 and U24 (meeting them), and R11 on WE3 to WE5;
  - designer: U22 (contrast, focus), U25 (except the route line);
  - platform: drop S19, and D10 from its range.

  Retag S22 onto P1-ID1 and P1-WE4.
- **Confidence:** verified

### DEL-20 Major: Some requirements have no task, no test or no final-acceptance check
- **Where:** plan.md:§12 IDs columns, §5 to §10 test statements, §13 L1026–L1060
- **Affects:** IDs below. The Q IDs apply to every task through the DoD, so missing Q tasks are expected and not counted.
- **Problem:** from Appendix C:
  - **No implementing task in §12** (beyond the reviewer's regression test):
    - S18 and D4: their CI steps aren't in any task. D11's list (L665) also omits the D4 `.env.example` check, Dependabot and Redocly.
    - S21, B13, D1;
    - U21 (= R11);
    - U23: 320 to 1920px, checked at 375, 768, 1280 and 1920. Nobody checks 768 or 1920; the DoD, P2-DS1 and U26 all use 375 and 1280.
    - Only in the work text: S2, B9, B17, B18, D11, D12, D13, U17, U24, U26.
  - **No test:** R1 (validity), R3, R8, R10, D5, D7, **D10** (seed idempotency, `--reset`, refusing production, the date shift; see DEL-03), D14, U6, U7, U17 to U20, U23, U25, Q8, Q9. The U27 credit test has no author.
  - **No §13 check:** R4, R6, D1, D4, D5, D7, D10, D11, D12, D14, U3, U6, U7, U9 to U19, U23, U25, and Q3, Q4, Q5, Q7, Q8, Q9.
  - **Gate conflict:** the Phase 1 gate requires "every regression test" to pass, including S18, whose checks only arrive in Phase 2 (P2-PL1, via D11).
- **Effect on the build:**
  - The Phase 1 gate fails on S18, or S18's test gets weakened.
  - The seed script ships untested, and DEL-03 shows the risk.
  - Final acceptance (P3-LD1) won't notice regressions in U9 to U19.
- **Proposed fix:**
  - Add to P1-PL5: "`scripts/check-env.ts` (D4: every config key is in `.env.example`; S18: no `NEXT_PUBLIC_` name contains `SECRET`, `KEY` or `PASSWORD`) and `.github/dependabot.yml`", tagged S18 and D4.
  - Add to D11's list "the D4 check, Redocly".
  - Add to P1-CA5: "integration tests for idempotency, `--reset`, refusing `NODE_ENV=production`, and the date rule at 22 Nov 2026 and 9 Nov 2027".
  - Change U23 to "checked at 375 and 1280px in screenshots, and at 320, 768 and 1920px by a Playwright test that asserts no horizontal scroll".
  - Add a §13 line: "U9 to U19 pass the e2e and no-JavaScript projects."
- **Confidence:** verified (plan text)

---

## Minor

### DEL-21 Minor: Backend teammates go idle halfway through, and the cost guidance leaves out the documented levers
- **Where:** plan.md:L38–L40, §12; Appendix B
- **Affects:** cost; Phase 2 and Phase 3
- **Problem:**
  - Task counts: platform 8, reviewer 8, web 6, designer 6, catalog 6, identity 5, commerce 4.
  - Identity, catalog and commerce are off the critical path. After Phase 1 they have only P2-ALL1, and in Phase 3 nothing, while web carries the critical path alone.
  - The docs say "Each active teammate continues consuming tokens until it exits or the session ends", "Use Sonnet for teammates" and "Shut down teammates when their work is done".
  - The §0 cost options mention only merging roles, and "several times one session" understates eight sessions.
- **Evidence:** costs.md, "Agent team token costs"; Appendix B.
- **Effect on the build:** higher cost than the plan suggests, with no rule for when to shut teammates down.
- **Proposed fix:** add to §0 Cost:
  > The lead and seven teammates are eight sessions, and cost scales with how many are active and for how long. Name a model for each teammate when spawning it (for example Sonnet for platform, identity, catalog, commerce and reviewer). After P2-ALL1, the lead shuts down identity, catalog and commerce. Any later fix in their paths is spawned again from `.claude/agents/<name>.md` (DEL-07).
- **Confidence:** verified (docs)

### DEL-22 Minor: OpenAPI timing and ownership contradict each other
- **Where:** plan.md:L869 (DoD "OpenAPI fragment is updated if the task changed an endpoint"), L1005 (P2-ALL1 writes the fragments in Phase 2), L667 (D13 "kept in sync")
- **Affects:** D13, P2-ALL1, the DoD
- **Problem:**
  - The DoD requires fragments in every Phase 1 backend task, but P2-ALL1 schedules them for Phase 2.
  - "Each owner" can't be a single task in the list.
  - Operations endpoints have no fragment.
  - The lead edits platform's CI.
- **Proposed fix:** delete P2-ALL1. Make the fragment part of each Phase 1 API task's DoD. Add lead task P2-LD1 "assemble `openapi.yaml`, ask platform to add `redocly lint`" (depends on G1).
- **Confidence:** verified

### DEL-23 Minor: CLAUDE.md and plan.md word some rules in conflicting ways
- **Where:** CLAUDE.md:L3–L9; plan.md:L30–L33, L942, L578, L625, L686, L910, L858, L233
- **Problem:**
  1. **How much of the plan to read.** CLAUDE.md, which every teammate loads, says "Read it before changing anything". plan.md:L30–L33 says teammates read §1 to §10 and their brief. But the briefs send them to §11.2 and §12.
  2. **Placeholders.** CLAUDE.md bans "placeholder text, names or images anywhere", while:
     - P0-7 builds "a placeholder page for every route";
     - S18 requires `.env.example` "with a placeholder";
     - R4 needs skeletons, while §9.1 (L686) bans "grey boxes";
     - create-next-app ships logo SVGs.
  3. **Task IDs for fixes.** CLAUDE.md says "Every change should trace back to a task ID", and Q8 puts the task ID in commits. But reviewer findings (rule 7) and P2-DS1 fixes get no task ID (fixed by DEL-10's `F-…` IDs).
  4. **Miles.** CLAUDE.md says "distances in kilometres", while the API accepts `unit` `mi` (L233, B3).
- **Proposed fix:**
  - CLAUDE.md line 3: "Read plan.md §1–§12 and your brief in §11.3 before changing anything."
  - CLAUDE.md line 8: "No placeholder content (lorem ipsum, made-up names, stock or grey placeholder images) anywhere a person can see it. Route stubs before a feature lands, `.env.example` values and loading skeletons are allowed."
  - B3: "`mi` is accepted by the API for v1 compatibility; the UI always uses km."
- **Confidence:** verified

### DEL-24 Minor: P0-1's `create-next-app` refuses to run in this repository
- **Where:** plan.md:L3 ("Put this file at the root of an empty repository"), L936 (P0-1 "Run `create-next-app`")
- **Problem:** the repo root holds `plan.md`, `CLAUDE.md` and `seed/`, which aren't on create-next-app's allowed list. It stops with "contains files that could conflict … Either try using a new directory name, or remove the files listed above." Scaffolding in a temp directory and copying back risks overwriting `.gitignore` and `README.md` and bringing in its `AGENTS.md`.
- **Evidence:** `is-folder-empty.ts` (canary) allows `.claude`, `.git`, `docs`, `LICENSE`, etc., but not `plan.md`, `CLAUDE.md` or `seed`.
- **Proposed fix:**
  - L3: "Put this file, `CLAUDE.md` and `seed/` at the root of a new repository."
  - P0-1: "Scaffold with `create-next-app` into a temporary directory (TypeScript, App Router, `src/`, ESLint, no Tailwind, `--no-agents-md`), then copy its files in, keeping our `CLAUDE.md`, `.claude/` and `seed/`."
  - The `--no-agents-md` flag exists in canary `index.ts`; unverified on stable.
- **Confidence:** verified (canary source)

### DEL-25 Minor: Agent teams are already on during Phase 0, so "no teammates yet" can be broken by accident
- **Where:** plan.md:L932, L1072–L1074; repo `.claude/settings.json` already sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- **Problem:** the docs say that while agent teams are on, "a subagent that Claude names launches as a teammate, so teams can form even when you didn't ask for one". The lead's research in P0-1 or P0-7 (version checks, the tile-provider comparison) could create teammates early. Spawning teammates also needs an interactive session, not `-p` mode, which the plan never says.
- **Proposed fix:** add to §14 step 1: "In Phase 0, use only unnamed subagents. Run the kickoff in an interactive session."
- **Confidence:** verified (docs)

### DEL-26 Minor: Q2's model-import rule blocks the seed script and the test factories
- **Where:** plan.md:L852 (Q2: `no-restricted-imports` blocking `**/modules/*/model` from outside its module), L977 (P1-CA5), L883 (`test/helpers/` factories), L577 (S17: bookings only from a verified webhook)
- **Problem:** `scripts/seed.ts` and `test/helpers/` are outside every module but must import models. The seed can't create bookings through the service, because S17 says bookings come only from a verified webhook. P1-CA5 fails lint.
- **Proposed fix:** Q2: "… from outside its module, except `scripts/seed.ts`, `test/**` and other model files."
- **Confidence:** verified (plan text)

### DEL-27 Minor: The `[id]` and `[tourId]` folder names under `api/v1/tours` break the build
- **Where:** plan.md:L235–L239 (`/tours/[id]`), L253–L254 (`/tours/[tourId]/reviews`), L403
- **Problem:** both segments sit under `src/app/api/v1/tours/` with different names. Next.js throws "You cannot use different slug names for the same dynamic path ('id' !== 'tourId')". The rule is in `sorted-routes.ts`; that it applies to app-router route handlers is likely but I didn't test it. Catalog would need a contract change (ADR) to rename the segment.
- **Proposed fix:** L253–L254: use `/api/v1/tours/[id]/reviews`, and say the handler reads `id` as the tour ID.
- **Confidence:** likely

---

## Gates: can each gate's checks pass at that point?

| Gate | Check | Can it pass as written? | Finding |
|---|---|---|---|
| Phase 0 | typecheck, lint, test, build | Yes once P0-1 can scaffold | DEL-24 |
| Phase 0 | `docs/bundle-baseline.json` (P0-7) | **No**: Next.js 16 has no First Load JS | DEL-04 |
| Phase 0 | `docs/contracts.md` complete | Yes, but missing `countForTour` and `invalidateForUser` | DEL-11, DEL-18 |
| Design gate | human approves | Yes, but no loop if changes are requested | DEL-17 |
| Phase 1 | all tests pass | Only if regression tests are separated | DEL-02 |
| Phase 1 | bundle budget | **No** | DEL-04 |
| Phase 1 | every regression test | S18 needs Phase 2 CI work | DEL-20 |
| Phase 1 | axe in both themes | Only after the human gate, PD-3 and PD-4 (critical path) | DEL-09 |
| Phase 1 | reviewer has no open findings | P1-RV4 never completes as a task | DEL-10 |
| Phase 2 | CI passes in full | Needs a push rule and GitHub Actions; P2-RV2 and P2-PL1 wait on each other | DEL-08, DEL-15, DEL-17 |
| Phase 2 | hand check of main flows in compose | Booking and uploads not possible | DEL-16 |
| Phase 2 | designer signs off design QA | No sign-off task after fixes | DEL-15 |
| §13 / P3-LD1 | Lighthouse on staging, seed content | Free Render tier unreliable; seed dates wrong | DEL-17, DEL-03 |

## Agent teams: plan vs current docs

| Topic | Plan says | Docs say | Finding |
|---|---|---|---|
| Enabling | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Correct, but the Task tools also need `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` on current models | DEL-01 |
| Creating teammates | Lead spawns seven with briefs | Agent tool with `name`; interactive only; named subagents become teammates; `isolation` makes it a subagent | DEL-08, DEL-25 |
| Task list and dependencies | Load every task with dependencies | Pending, in progress, completed; blocked until dependencies complete; status can lag | DEL-01, DEL-10 |
| Plan approval | Per task, lead approves | Only from plan-mode spawn; auto-approved unless the human changed the mode; once | DEL-05 |
| Messaging | Message the owner or lead | Direct by name, automatic delivery, no broadcast, idle notifications | No issue |
| Permissions | Not addressed | Prompts bubble to the human; teammates inherit the lead's mode | DEL-06 |
| Shared checkout | One checkout, stage owned paths | "Avoid file conflicts"; no worktree for teammates | DEL-08 |
| Limitations | Not addressed | No resume, one team per session, no nested teams, lead fixed | DEL-07 |
| Cost | "Several times one session" | Scales with active teammates; use Sonnet; shut down when done | DEL-21 |
| Lead bottleneck with seven plans | Not addressed | 3 to 5 teammates recommended | DEL-05 |

## What the human must provide, and when

| When | What | Needed by |
|---|---|---|
| Before Phase 0 | `.claude/settings.json` with both env variables, an allowlist and deny rules (or approval to let the lead write them) | DEL-01, DEL-06 |
| Before Phase 0 | GitHub repository with Actions enabled; Docker; Node 24; network access to fastdl.mongodb.org, Google Fonts and the Playwright download | P0-1, P0-7, P1-PL5 |
| Before Phase 0 | Budget for eight concurrent sessions; an interactive terminal kept open; tmux or iTerm2 if split panes are wanted | §14 |
| Throughout | Answer permission prompts not covered by the allowlist | DEL-06 |
| End of Phase 0 (P0-7) | A tile-provider account or key, if the D14 choice needs one | P1-WE3 |
| After PD-2 | Approve the design, or request changes | Design gate (on the critical path) |
| Before the Phase 2 gate | Stripe test-mode keys, if DEL-16 option (a) is chosen | P2-RV1, Phase 2 gate |
| Phase 2 gate | Approve the screenshot set, or request changes | G2 |
| Before Phase 3 | MongoDB Atlas, SMTP provider, S3 or R2 bucket, and Render with **paid** web, worker and Key Value plans | P3-PL1, P3-RV1 |
| Phase 3 | Create the staging webhook in the Stripe dashboard (or provide a restricted key); a staging `SEED_USER_PASSWORD` | P3-PL1, P3-PL2 |

## Small wording fixes

- L3: "an empty repository" → "a new repository with `plan.md`, `CLAUDE.md`, `.claude/` and `seed/`".
- L30–L33: teammates read §1 to §12 and their brief.
- L38: "cost several times one session" → "are eight sessions; cost scales with the number of active teammates".
- L916–L922: the briefs elide their opening with "…". Say "(same opening as platform's brief)".
- L928: "Load every task below" → "Load every task from Phase D onwards".
- L1005: owner "each owner" isn't a single owner (see DEL-22).
- Phase 3 table: add a Depends-on column (DEL-10).
- L829: name the container image used for baselines.
- L1013: say where the final screenshot set is saved, for example `docs/design/final/`.
- L884: platform's "D1–D13" → "D1–D9, D11–D13".
- L888 and L890: `docs/design/**` except `a11y-walkthrough.md`.
- L665 (D11): add the D4 check, Dependabot and Redocly lint.
- L826 vs L829: U23's widths (375, 768, 1280, 1920) don't match U26 and the DoD (375, 1280).

---

## Appendix A: Ownership map (§3.3 paths and files named in §12)

| Path | Owner (§11.1) | Issue |
|---|---|---|
| `src/app/layout.tsx` | web | Holds designer's font and CSS imports (U3, U6); created by the lead in P0-1 (DEL-13, DEL-14) |
| `src/app/{not-found,error,global-error}.tsx`, `sitemap.ts`, `robots.ts` | web | `sitemap.ts` needs P1-CA2 (DEL-11) |
| `src/app/(site)/**`, `src/app/(auth)/**` | web | P0-7 placeholder pages by the lead |
| `src/app/styleguide/**` | designer | S2's `notFound()` is owned by platform (DEL-19) |
| `src/app/api/v1/{auth,users}/**` | identity | — |
| `src/app/api/v1/{tours,reviews}/**` | catalog | `[id]` vs `[tourId]` (DEL-27) |
| `src/app/api/v1/bookings/**`, `src/app/webhooks/stripe/**` | commerce | — |
| `src/app/{healthz,readyz}/**` | platform | `/healthz` by the lead (P0-5) |
| `src/proxy.ts`, `src/instrumentation.ts` | platform | `instrumentation.ts` by the lead (P0-2) |
| `src/server/{config,deps,db,logger,errors,rate-limit}.ts` | platform | By the lead in P0-2, P0-3 and P0-6 |
| `src/server/{api,actions}/**` | platform | By the lead (P0-5); these are §4.3 contracts (DEL-14) |
| `src/server/{queue,storage,stripe,mailer}/**`, `images.ts` | platform | Fakes by the lead (P0-6) |
| `src/server/session.ts`, `redirects.ts` | identity | By the lead (P0-4) |
| `src/server/modules/*/model.ts` | lead | The only explicit hand-off rule |
| `src/server/modules/{auth,users}/**` (not models) | identity | `users/dto.ts` by the lead |
| `src/server/modules/{tours,reviews}/**` (not models) | catalog | DTOs by the lead |
| `src/server/modules/bookings/**` (not model) | commerce | DTO and `hasPaidBooking` by the lead (P0-4) |
| `src/lib/format.ts` | lead | B19 and B20 are owned by catalog and commerce |
| `src/components/ui/**` | designer | **Two owners** with `features/` (DEL-12) |
| `src/components/features/**` | web | **Two owners** with `ui/` (DEL-12) |
| `src/styles/**` | designer | — |
| `src/emails/**` | designer | P1-PL2 needs a template earlier (DEL-11) |
| `src/worker/**`, `scripts/check-*.ts` | platform | — |
| `scripts/seed.ts`, `seed/**` | catalog | Q2 lint rule (DEL-26) |
| `test/setup.ts`, `test/helpers/**` | lead | Bottleneck (DEL-05) |
| `test/integration/<module>/**` | module owner (L892) | Platform's tests have no home (DEL-13) |
| `test/components/**` | web **and** designer | Two owners (DEL-12) |
| `test/{security,regression,e2e,a11y,visual}/**` | reviewer | — |
| `docs/contracts.md`, `docs/adr/`, `docs/openapi/openapi.yaml`, `docs/bundle-baseline.json` | lead | — |
| `docs/openapi/paths/{auth,users,tours,reviews,bookings}.yaml` | identity, catalog, commerce | No fragment for operations (DEL-22) |
| `docs/design/**` | designer | `a11y-walkthrough.md` also reviewer's (DEL-12) |
| `next.config.ts`, ESLint, stylelint and Prettier configs | platform | Created by the lead in P0-1 |
| `Dockerfile`, `docker-compose.yml`, `render.yaml`, `.github/**` | platform | P2-ALL1 has the lead edit CI (DEL-13) |
| `lighthouserc.json` | platform | P2-RV2 (reviewer) must write it (DEL-13) |
| `package.json`, lockfile, `tsconfig.json` | lead | — |
| `public/**` | web | create-next-app logo SVGs (DEL-13) |
| `.env.example`, `.gitignore`, `README.md`, the Vitest config, `playwright.config.ts`, knip and Redocly configs, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `src/app/globals.css`, `src/app/page.module.css` | **none** | DEL-13 |

## Appendix B: Dependency graph as written (script output)

```
no cycles in the declared graph
longest chain to Phase 2 gate: 19  P0-1 -> P0-2 -> P0-3 -> P0-4 -> P0-5 -> P0-6 -> P0-7 -> PD-1 -> PD-2
  -> Design gate (human) -> PD-3 -> PD-4 -> P1-WE2 -> Phase 1 gate -> P2-WE1 -> P2-DS1 -> P2-RV2 -> P2-PL1 -> Phase 2 gate
P1-RV4 depends on 'ongoing' => Phase 1 gate never unblocks if RV4 is a task in the list
startable at team creation (12): PD-1, P1-PL1..4, P1-ID1, P1-CA1, P1-CO1, P1-CO3, P1-WE1, P1-RV1, P1-RV2
web tasks blocked by PD-4 (hence by the human design gate): P1-WE2, P1-WE3, P1-WE4, P1-WE5
tasks per teammate: platform 8 (P1 5, P2 1, P3 2) | reviewer 8 (P1 4, P2 3, P3 1) | web 6 | designer 6 | catalog 6 (incl. P2-ALL1) | identity 5 | commerce 4
```

There are no cycles in the declared graph. The only cycle is a logical one between P2-RV2 and P2-PL1 (DEL-15). Phase 3 has no declared dependencies.

## Appendix C: Traceability (all 106 IDs)

`reviewer(verify)` means §11.1 lists the ID for the reviewer as verification only. "text only" means the task names the work but not the ID.

| ID | Owner (§11.1) | Task (§12) | Test | §13 check |
|---|---|---|---|---|
| S1 | commerce, reviewer(verify) | P1-CO3, P1-RV1, P1-RV2 | access matrix + regression | yes (L1029) |
| S2 | platform, reviewer(verify) | P1-RV2; text only: P0-5 | regression test (P1-RV2) | yes (L1050) |
| S3 | identity, reviewer(verify) | P1-ID1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S4 | identity, catalog, reviewer(verify) | P1-ID3, P1-ID4, P1-CA2, P1-CA4, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S5 | identity, catalog, reviewer(verify) | P1-CA4, P1-CO3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S6 | identity, reviewer(verify) | P1-ID1, P1-ID3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S7 | identity, catalog, reviewer(verify) | P1-CA1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S8 | identity, reviewer(verify) | P1-ID1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S9 | platform, identity, reviewer(verify) | P1-PL1, P1-ID1, P1-CO1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S10 | platform, reviewer(verify) | P1-PL1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S11 | platform, reviewer(verify) | P1-PL1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S12 | platform, reviewer(verify) | P1-PL2, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S13 | identity, reviewer(verify) | P1-ID2, P1-RV2 | regression test (P1-RV2) | yes (L1034) |
| S14 | identity, reviewer(verify) | P1-ID1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S15 | platform, reviewer(verify) | P1-PL1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S16 | platform, reviewer(verify) | P1-PL3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S17 | commerce, reviewer(verify) | P1-CO1, P1-CO2, P1-RV2 | regression test (P1-RV2) | yes (L1035) |
| S18 | platform, reviewer(verify) | P1-RV2; text only: P2-RV3 | regression test (P1-RV2) | yes (L1032, L1037) |
| S19 | platform, reviewer(verify) | P1-WE1, P1-RV2; text only: P2-RV3 | regression test (P1-RV2) | yes (regression line, L1030) |
| S20 | identity, reviewer(verify) | P1-ID1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| S21 | web, reviewer(verify) | P1-RV2; text only: P2-RV3 | regression test (P1-RV2) | yes (regression line, L1030) |
| S22 | identity, reviewer(verify) | P1-ID2, P1-RV2; text only: P0-4 | regression test (P1-RV2) | yes (regression line, L1030) |
| S23 | platform, identity, reviewer(verify) | P1-PL1, P1-ID1, P1-RV1, P1-RV2 | x-middleware-subrequest test + regression | yes (regression line, L1030) |
| B1 | catalog, reviewer(verify) | P1-CA1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B2 | catalog, reviewer(verify) | P1-CA3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B3 | catalog, reviewer(verify) | P1-CA3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B4 | catalog, reviewer(verify) | P1-CA2, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B5 | catalog, reviewer(verify) | P1-CA2, P1-RV2; text only: P0-3 | regression test (P1-RV2) | yes (regression line, L1030) |
| B6 | catalog, reviewer(verify) | P1-CA4, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B7 | commerce, reviewer(verify) | P1-CO2, P1-RV2 | regression test (P1-RV2) | yes (L1035) |
| B8 | commerce, reviewer(verify) | P1-CO1, P1-RV2 | regression test (P1-RV2) | yes (L1035) |
| B9 | platform, reviewer(verify) | P1-RV2; text only: P0-5 | regression test (P1-RV2) | yes (regression line, L1030) |
| B10 | platform, reviewer(verify) | P1-PL4, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B11 | catalog, reviewer(verify) | P1-CA1, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B12 | catalog, reviewer(verify) | P1-CA2, P1-CO3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B13 | identity, reviewer(verify) | P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B14 | identity, reviewer(verify) | P1-ID2, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B15 | identity, reviewer(verify) | P1-ID3, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B16 | identity, catalog, reviewer(verify) | P1-ID3, P1-CA2, P1-RV2 | regression test (P1-RV2) | yes (regression line, L1030) |
| B17 | platform, reviewer(verify) | P1-RV2; text only: P0-3 | regression test (P1-RV2) | yes (regression line, L1030) |
| B18 | platform, reviewer(verify) | P1-RV2; text only: P0-5 | regression test (P1-RV2) | yes (regression line, L1030) |
| B19 | catalog, reviewer(verify) | P1-CA5, P1-RV2; text only: P0-2 | UTC time-zone test + regression | yes (L1055) |
| B20 | commerce, reviewer(verify) | P1-CO1, P1-RV2; text only: P0-2 | regression test (P1-RV2) | yes (L1055) |
| R1 | web | P1-WE1 | none automated (R2 script checks only the comment) | yes (L1040) |
| R2 | platform | P1-PL5 | check-client-boundaries.ts | yes (L1040) |
| R3 | web | P1-WE2, P1-WE3 | none | yes (L1041) |
| R4 | web | P1-WE1, P1-WE3 | none (Lighthouse CLS on 2 pages only) | **none** |
| R5 | catalog, reviewer(verify) | P1-CA2, P1-CA4; text only: P2-RV1 | two-user Playwright test | yes (L1042) |
| R6 | web | P1-WE3 | build fails on server-only import; S3 prop tests | **none** |
| R7 | web | P1-WE4, P1-WE5 | no-JS project (via R11) | via R11 (L1043) |
| R8 | web | P1-WE3 | none | yes (L1044) |
| R9 | platform | P1-PL5; text only: P0-7 | check-bundle.ts (unbuildable, DEL-04) | yes (L1044) |
| R10 | web | P1-WE1 | none (Lighthouse SEO on 2 pages only) | yes (L1045) |
| R11 | web, reviewer(verify) | P1-WE2, P1-RV3 | no-JS Playwright project | yes (L1043) |
| D1 | platform | **none** | none (Docker build in CI) | **none** |
| D2 | platform | P1-PL3 | none automated | yes (L1036) |
| D3 | platform | P1-PL2 | none automated | yes (L1034) |
| D4 | platform | text only: P0-2 | CI `.env.example` key check (no task) | **none** |
| D5 | platform | P1-PL4 | none | **none** |
| D6 | platform | P1-PL4 | none automated | yes (L1033) |
| D7 | platform | P1-PL1 | none | **none** |
| D8 | platform | P1-PL5 | Docker build in CI | yes (L1033) |
| D9 | platform | P1-PL5 | none automated | yes (L1037) |
| D10 | platform, catalog | P1-CA5 | none | **none** |
| D11 | platform | text only: P2-PL1 | CI itself | **none** |
| D12 | platform | text only: P3-PL1, P3-PL2, P3-RV1 | staging smoke (P3-RV1) | **none** |
| D13 | platform | text only: P2-ALL1 | redocly lint | yes (L1032) |
| D14 | **none** | P1-WE3; text only: P0-7 | none | **none** |
| U1 | designer | PD-3 | stylelint | yes (L1049) |
| U2 | designer | PD-3 | axe in both themes | via U22 (L1051) |
| U3 | designer | PD-3 | stylelint | **none** |
| U4 | designer | PD-4 | styleguide screenshots (U26) | yes (L1050) |
| U5 | designer | PD-4 | styleguide screenshots (U26) | yes (L1050) |
| U6 | designer | PD-3 | none | **none** |
| U7 | designer | P1-PL3 | none | **none** |
| U8 | designer | PD-5 | manual (Mailpit) | yes (L1054) |
| U9 | web | P1-WE1 | axe (partial) | **none** |
| U10 | web | P1-WE2 | no-JS and e2e (partial) | **none** |
| U11 | web | P1-WE3 | no-JS and e2e (partial) | **none** |
| U12 | web | P1-WE5 | smoke (P2-RV1) | **none** |
| U13 | web | P1-WE5 | smoke (partial) | **none** |
| U14 | web | P1-WE3 | Testing Library (star input) | **none** |
| U15 | web | P1-WE5 | no-JS (partial) | **none** |
| U16 | web | P1-WE4 | no-JS (partial) | **none** |
| U17 | web | text only: P2-WE1 | none | **none** |
| U18 | web | P1-WE1 | none | **none** |
| U19 | web | P1-WE1 | none | **none** |
| U20 | designer | PD-1 | none | partial (L1055) |
| U21 | web | **none** | no-JS project | via R11 (L1043) |
| U22 | reviewer(verify) | P1-RV3; text only: P2-RV2 | axe + keyboard walkthrough | yes (L1051) |
| U23 | web | **none** | none (U26 covers 375 and 1280 only) | **none** |
| U24 | reviewer(verify) | text only: P2-RV2, P3-RV1 | Lighthouse CI | yes (L1052) |
| U25 | designer | PD-4 | none | **none** |
| U26 | reviewer(verify) | text only: P2-RV2 | Playwright screenshots | yes (L1053) |
| U27 | web | P1-WE3 | credit test (no author named) | yes (L1056) |
| Q1 | **none** | **none** (DoD) | tsc in CI | yes (L1032) |
| Q2 | **none** | **none** (DoD) | ESLint, stylelint, Prettier in CI | yes (L1032) |
| Q3 | **none** | **none** (DoD) | none | **none** |
| Q4 | **none** | **none** (DoD) | ESLint `no-restricted-imports` | **none** |
| Q5 | **none** | **none** (DoD) | none (`no-console` only) | **none** |
| Q6 | **none** | **none** (DoD) | coverage thresholds | yes (L1031) |
| Q7 | **none** | **none** (DoD) | none | **none** |
| Q8 | lead | **none** | none | **none** |
| Q9 | **none** | **none** (DoD) | none | **none** |
| Q10 | lead | **none** | none | yes (L1060) |
| Q11 | **none** | **none** (DoD) | knip in CI | yes (L1032) |

**Summary of gaps:**
- **No owner (13):** D14, U22, U24, U26 (verification only), and Q1–Q7, Q9, Q11.
- **No implementing task (28; \* = named only in work text):** S2\*, S18\*, S21\*, B9\*, B13, B17\*, B18\*, D1, D4\*, D11\*, D12\*, D13\*, U17\*, U21, U23, U24\*, U26\*, and Q1–Q11.
- **No test (28):** R1, R3, R4, R8, R10, D1, D2, D3, D5, D6, D7, D9, D10, D14, U6, U7, U17, U18, U19, U20, U23, U25, Q3, Q5, Q7, Q8, Q9, Q10.
- **No §13 check (32):** R4, R6, D1, D4, D5, D7, D10, D11, D12, D14, U3, U6, U7, U9–U19, U23, U25, Q3, Q4, Q5, Q7, Q8, Q9.
- **Used but never defined:** none. The scan's only hit, `D72`, is a photo filename in `seed/CREDITS.md`.
