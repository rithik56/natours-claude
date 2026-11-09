# 0001. Versions checked at the start

Status: Accepted
Date: 9 Nov 2026
Requirements: Q11
Plan review: ARC-22, ARC-23

## Context

`plan.md` §0 asks for the versions of the §2 stack to be checked before anything is installed, because library versions and APIs move. The check was done with `npm view` on 8 Nov 2026 (the registry versions below), and the packages for plan 01-01 were then installed on 9 Nov 2026.

Three findings from the plan review shaped the choices:

- ARC-22: some pins in `plan.md` are stale or break the install. Node 24 has been Maintenance LTS since 20 Oct 2026, `typescript@latest` is now 7, and `typescript-eslint` doesn't support it.
- ARC-23: several libraries have changed their APIs since the plan was written.
- D-06: dependencies are installed in the phase that first uses them (ADR 0004), so the versions for later phases have to be recorded now.

The developer's machine had Homebrew `node@22` and npm 10.9 before this phase. The build and the tests were run on Node v24.22.2 with npm 11.19.1 and Docker 28.5.1.

## Decision

### Installed in plan 01-01

These are the versions in `package.json` and the lockfile after plan 01-01.

| Package | Version |
|---------|---------|
| next | 16.4.5 |
| react, react-dom | 19.3.1 |
| typescript | 5.9.3 (exact) |
| eslint | 9.39.5 (`^9.39.5`) |
| eslint-config-next | 16.4.5 (exact) |
| zod | 4.6.7 |
| mongoose | 9.12.0 |
| server-only | 0.0.1 |
| @types/node | 24.19.2 (`^24.19.2`) |
| @types/react, @types/react-dom | 19.3.0 |
| vitest | 5.1.0 |
| @vitest/coverage-v8 | 5.1.0 |
| mongodb-memory-server | 11.3.0 |

The mongod that the tests use is 8.0.34, set in `package.json` under `config.mongodbMemoryServer.version`. It is the newest 8.0.x with a macOS arm64 build when probed: 8.0.35 to 8.0.40 returned 403. It matches the `mongo:8.0` Docker image, which is also 8.0.34. This was confirmed on macOS arm64 only. Linux CI is not yet confirmed and is checked when CI is set up in plan 01-03.

### Checked now, installed later

Later phases install these majors, in the plan that first imports each one.

| Package | Version | Note |
|---------|---------|------|
| eslint-plugin-security | 4 (4.2.1) | |
| stylelint | 18 (18.0.0) | Needs Node `^22.22.2 \|\| ^24.15.0 \|\| >=26` |
| stylelint-config-standard | 41 (41.0.0) | Pinned. The unpinned install resolved 40, which peers on stylelint 17, and failed to install |
| prettier | 3 (3.9.10) | |
| knip | 6 (6.44.2) | |
| pino | 10 (10.4.0) | |
| pino-pretty | 13 (13.2.0) | Development only |
| bcryptjs | 3 (3.0.3) | |
| jose | 6 (6.2.15) | |
| @lhci/cli | 0.16 (0.16.0) | Brings Lighthouse 13.6.0 |

The remaining §2 packages (stripe, bullmq, ioredis, nodemailer, react-email, sharp, rate-limiter-flexible, leaflet, Playwright, axe and Testing Library) are checked at their first install, in their own phases. For ARC-23, those phases use the current APIs: components from `react-email`, ioredis installed explicitly for BullMQ 6, Mongoose 9 hooks without `next()`, and `returnDocument: 'after'` instead of `new: true`.

### Runtime and language

- Node 24 LTS, as `plan.md` says. It has been Maintenance LTS since 20 Oct 2026 and is supported to 30 Apr 2028, well past the demo. The project pins it with `engines.node` (`>=24.15 <25`), `.nvmrc`, `engine-strict=true` in `.npmrc`, and `@types/node` `^24`. Node 26, Active LTS since 28 Oct 2026, was considered and not chosen: `plan.md` specifies Node 24, it is supported well past the demo, and the project needs no feature that only Node 26 has.
- TypeScript is held at 5.9, because `typescript-eslint` supports TypeScript below 6.1 only, and npm's `latest` is 7.
- ESLint is held at 9, because `eslint-plugin-react`, a dependency of `eslint-config-next`, peers on ESLint 9 although ESLint 10 is current.

### Scaffold

`create-next-app` refuses to run in a non-empty repository (DEL-24), so it was run in a temporary folder outside the repository, with `--ts --app --src-dir --eslint --no-tailwind --no-agents-md --no-react-compiler --no-cache-components --use-npm --import-alias "@/*" --disable-git --yes`.

- `--no-cache-components` matters. Without it the scaffold turns on Cache Components and partial prerendering, which cannot carry the per-request CSP nonce (S11). Public data is cached with `unstable_cache` instead.
- Two flags were added to the plan's list when the scaffold was run: `--skip-install`, because the install happens in the repository, and `--no-agent-feedback`, which skips an agent-feedback prompt.
- `typescript` and `eslint-config-next` were installed with `--save-exact`, because a plain install records a caret range and the plan requires 5.9 and 16.4.5 exactly.

### Database

MongoDB 8.0 in Docker (`mongo:8.0`), the major that Atlas M0 runs, so the deployment phase has no surprises (D-12). Tests still use `mongodb-memory-server` (Q7).

## Consequences

- Later phases install the majors above without re-checking them, and only look up the packages listed as checked at first install.
- Everyone who works on the project needs Node 24. `engine-strict=true` makes `npm ci` fail on any other major, and the README tells macOS users to run `brew install node@24`.
- Upgrading to TypeScript 7 or ESLint 10 is a separate decision, taken once `typescript-eslint` and `eslint-plugin-react` support them.
- The 8.0.34 test binary has to be confirmed on Linux CI. If it is unavailable there, the pin changes and this ADR is superseded.
