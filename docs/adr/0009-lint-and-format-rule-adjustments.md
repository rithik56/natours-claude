# 0009. Lint and format rule adjustments

Status: Accepted
Date: 9 Nov 2026
Requirements: Q2, Q3, Q4, Q5, S21
Plan review: DEL-26, QA-17, DES-12, ARC-03

## Context

`plan.md` Q2 asks for ESLint, Prettier and stylelint with zero warnings, and Q3 to Q5 set naming, comment and import rules. Turning those into commands that fail with `--max-warnings=0` needed a few choices the plan doesn't make. Each one is recorded here so the config stays honest about what it enforces.

## Decision

- **`security/detect-object-injection` is off.** `eslint-plugin-security` keeps its recommended config, but this one rule warns on every variable-key access such as `table[key]`. Code written under `noUncheckedIndexedAccess` is full of those, and a warning breaks `--max-warnings=0`. Injection is handled by Zod allowlists on input (S7) instead.
- **`security/detect-non-literal-fs-filename` is off for `scripts/**` and `test/**` only.** The check scripts and tests read repository files whose paths they build themselves. No request input reaches them. The rule stays on for `src/`.
- **A module's `model` can be imported by `test/**` and `scripts/**`.** Everywhere else under `src/`, importing `@/server/modules/*/model` (or the relative forms) is an error, except as a type import. Test factories and the Phase 4 seed need to build documents directly (DEL-26, QA-17).
- **`zod` is restricted to `src/server/validation.ts` and `src/server/config-schema.ts`.** User-facing wording then comes only from `src/lib/messages.ts` through `src/server/validation.ts` (DES-12).
- **`next/cache` is restricted to `src/server/adapters/real-cache.ts`.** Caching goes through the adapter, so tests can swap in a fake (ARC-03).
- **`react/no-danger` and `no-console` are errors,** as is `@typescript-eslint/no-explicit-any`. User content is rendered as JSX text only (S21), and server code logs through the logger (Q5).
- **Prettier never formats Markdown, `seed/`, `.planning/`, `.claude/` or `docs/plan-review/`.** `plan.md` stays unedited and the seed data stays byte-for-byte as supplied. The first `npm run format` reformatted the plan 01-01 code.
- **stylelint runs with `--allow-empty-input`** until Phase 3 adds CSS. Without the flag, zero matching files is an error.
- **Q3 and Q5 are enforced by `scripts/check-conventions.ts`,** not by an extra ESLint plugin. The script checks kebab-case file names, issue-linked TODO and FIXME comments, commented-out code, `Action` export names in `actions.ts`, and the `server-only` first import in `src/server` (R6). The commented-out-code rule is a conservative heuristic; code review covers what it misses.
- **`package.json` sets `"type": "module"`,** so Node runs the TypeScript scripts as ES modules without the typeless-package warning. `vitest.config.ts` was also renamed to `vitest.config.mts`, which cleared Vite's warning about ESM syntax in a CommonJS-loaded file.

## Consequences

- `npm run lint`, `lint:css`, `format:check`, `check:client`, `check:conventions` and `knip` all fail on a violation, locally and in CI.
- A variable-key access is not flagged by lint. Review and Zod allowlists carry that risk.
- Later plans that add a restricted import to a new file extend the override list in `eslint.config.mjs` and say so in their own commit.
