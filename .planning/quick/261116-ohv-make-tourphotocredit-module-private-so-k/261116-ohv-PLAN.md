---
phase: 04-browse-tours
plan: 261116-ohv
type: execute
wave: 1
depends_on: []
files_modified:
  - src/server/modules/tours/dto.ts
  - .planning/phases/04-browse-tours/deferred-items.md
autonomous: true
requirements: [Q11, D11]

must_haves:
  truths:
    - "`npx knip` reports no issues: the unused-exported-type finding for TourPhotoCredit is gone, so the CI checks job's knip step passes."
    - "TourPhotoCredit is still declared in src/server/modules/tours/dto.ts, as a module-private type, and TourDetail.photoCredits is still typed with it."
    - "`npx tsc --noEmit` and `npm test` pass unchanged: no importer anywhere depended on the export."
    - "The deferred-items.md entry for TourPhotoCredit reads `status: resolved` and cites this quick task."
  artifacts:
    - path: "src/server/modules/tours/dto.ts"
      provides: "TourPhotoCredit declared without the export keyword; the type and its doc comment are otherwise unchanged"
    - path: ".planning/phases/04-browse-tours/deferred-items.md"
      provides: "the open TourPhotoCredit entry marked resolved by quick task 261116-ohv"
  key_links:
    - from: "src/server/modules/tours/dto.ts (TourDetail.photoCredits)"
      to: "src/server/modules/tours/dto.ts (TourPhotoCredit)"
      via: "same-file type reference, which is why the type is kept and only the export is dropped"
---

<objective>
Drop the `export` keyword from the `TourPhotoCredit` type in `src/server/modules/tours/dto.ts` so knip stops reporting it as an unused exported type, and mark the matching deferred item resolved.

Purpose: The CI checks job runs knip (D11, Q11: no unused dependencies or exports). Live at planning time, on main at a087f97, `npx knip` reports exactly one issue, "Unused exported types (1)", `TourPhotoCredit  type  src/server/modules/tours/dto.ts:62:13`. A grep of `src test scripts docs` finds the name only at dto.ts:62 (the declaration) and dto.ts:73 (`photoCredits: TourPhotoCredit[];` inside `TourDetail`). Nothing imports it, so the type stays and only its export goes. It was logged as an open item in `.planning/phases/04-browse-tours/deferred-items.md` during plan 04-03.

Output: One keyword removed from dto.ts, one deferred-items entry flipped from open to resolved. No dependency, schema or behaviour change.

Not in scope: do not pre-export the type for later phase 4 plans (04-06, 04-10). If one of them adds an importer, that plan re-exports it in the same change.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/server/modules/tours/dto.ts
@.planning/phases/04-browse-tours/deferred-items.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Make TourPhotoCredit module-private in dto.ts</name>
  <files>src/server/modules/tours/dto.ts</files>
  <action>
In `src/server/modules/tours/dto.ts`, edit the declaration of the `TourPhotoCredit` type at line 62 (the `Omit<TourFields['photoCredits'][number], 'alt'> & { alt: string }` alias, with the doc comment "A photo credit as a page shows it: `alt` is always text (D-15)." on line 61). Remove only the leading `export ` keyword so the line begins with `type TourPhotoCredit = Omit<`. Keep the doc comment, the type body, the `TourDetail` type on lines 68-74 and everything else in the file exactly as they are. Do not delete the type: `TourDetail.photoCredits` (line 73) uses it, and tsc would fail without it.

Why a module-private type and not a deletion or a re-export: the live knip and grep evidence shows no importer, so dropping `export` is the smallest change that satisfies Q11 and D11. Do not add the export back for 04-06 or 04-10 ahead of need.

Edit with the Edit tool on the one line. Do not run prettier --write across the repo.

Commit per the GSD quick workflow, staging only `src/server/modules/tours/dto.ts`. Use the message `fix(tours): make TourPhotoCredit module-private so knip passes [Q11, D11] (quick-261116-ohv)` and end it with the attribution line from the session's system-reminder. No dependency is added, so no body reason is needed.
  </action>
  <verify>
    <automated>test "$(grep -c '^export type TourPhotoCredit' src/server/modules/tours/dto.ts)" = 0 && test "$(grep -c '^type TourPhotoCredit' src/server/modules/tours/dto.ts)" = 1 && test "$(grep -c 'photoCredits: TourPhotoCredit\[\]' src/server/modules/tours/dto.ts)" = 1 && npx knip && npx tsc --noEmit && npx prettier --check src/server/modules/tours/dto.ts && npx eslint --max-warnings=0 src/server/modules/tours/dto.ts</automated>
  </verify>
  <done>Baselines on main at a087f97: the exported-declaration grep returns 1, the module-private-declaration grep returns 0, and `npx knip` prints "Unused exported types (1)". After the edit the exported-declaration grep returns 0, the module-private-declaration grep returns 1, the `photoCredits: TourPhotoCredit[]` reference is still there once, `npx knip` prints nothing and exits 0, and `npx tsc --noEmit`, prettier and eslint pass on dto.ts.</done>
</task>

<task type="auto">
  <name>Task 2: Mark the deferred item resolved and run the full test suite</name>
  <files>.planning/phases/04-browse-tours/deferred-items.md</files>
  <action>
In `.planning/phases/04-browse-tours/deferred-items.md`, find the `TourPhotoCredit` entry (line 5) and the indented status line under it (line 6, which currently marks the item as not yet done). Replace that status line, using Edit and keeping the two-space indent, with two lines: `  status: resolved` followed by `  resolution: quick task 261116-ohv dropped the export keyword from TourPhotoCredit in src/server/modules/tours/dto.ts. The type stays, used by TourDetail.photoCredits. If a later phase 4 plan (04-06 or 04-10) adds an importer, it re-exports the type then.`

Leave the entry's description text (line 5) and the file heading unchanged: it is the record of what was found and why. Add no other entries. The .planning directory is ignored by prettier, so no format step is needed.

After the edit, run the full unit and integration suite to prove that nothing relied on the export.

Commit per the GSD quick workflow, staging only `.planning/phases/04-browse-tours/deferred-items.md` and this quick task's PLAN.md and SUMMARY.md. Use the message `docs(planning): mark the TourPhotoCredit deferred item resolved [Q11] (quick-261116-ohv)` and end it with the attribution line from the session's system-reminder.
  </action>
  <verify>
    <automated>test "$(grep -c 'status: resolved' .planning/phases/04-browse-tours/deferred-items.md)" = 1 && test "$(grep -c 'status: open' .planning/phases/04-browse-tours/deferred-items.md)" = 0 && grep -q 'quick task 261116-ohv' .planning/phases/04-browse-tours/deferred-items.md && npm test</automated>
  </verify>
  <done>Baselines: `status: open` count is 1 and `status: resolved` count is 0. After the edit `status: open` is 0, `status: resolved` is 1, the entry cites quick task 261116-ohv, and `npm test` passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| module to importers | a type's export is a TypeScript-only surface; removing it can only break a compile, never a runtime path |
| repo working tree to git history | the commit could pick up unrelated files if staged with a wildcard |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QT-01 | Tampering | dto.ts type surface (a hidden importer breaks) | low | mitigate | the live grep over src, test, scripts and docs found no importer, and the Task 1 verify runs `npx tsc --noEmit` and knip, which catch any importer the grep missed |
| T-QT-02 | Tampering | commit staging unrelated files | low | mitigate | each commit stages the named files only, with no `git add -A` or `git add .` |
| T-QT-03 | Information Disclosure | dto.ts photo-credit data shape | low | accept | a type-level export change only; no data, field or response shape changes, and TourDetail still returns the same photoCredits |
| T-QT-SC | Tampering | npm, pip and cargo installs | high | accept | no package is installed or changed in this plan, so the package-legitimacy gate does not apply |
</threat_model>

<verification>
- `npx knip` prints no issues and exits 0 (baseline: "Unused exported types (1)").
- `npx tsc --noEmit` passes.
- `npm test` passes.
- `grep -rn TourPhotoCredit src test scripts docs` still finds only the declaration and the `TourDetail.photoCredits` use in dto.ts (two lines, same as the baseline).
- `git diff --stat a087f97 -- plan.md package.json package-lock.json` shows no change.
</verification>

<success_criteria>
- knip is clean, so the CI checks job's knip step passes (D11, Q11).
- The only code change is the removal of the `export` keyword on one line of dto.ts.
- The deferred item is marked resolved and cites quick task 261116-ohv.
- Commits are Conventional Commits with the requirement IDs in square brackets and the plan reference `(quick-261116-ohv)`.
</success_criteria>

<output>
Create `.planning/quick/261116-ohv-make-tourphotocredit-module-private-so-k/261116-ohv-SUMMARY.md` when done
</output>
