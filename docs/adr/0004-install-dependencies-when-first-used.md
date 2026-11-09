# 0004. Install dependencies when first used

Status: Accepted
Date: 9 Nov 2026
Requirements: Q11
Plan review: ARC-22

## Context

`plan.md` P0-1 installs the whole §2 stack at once, before any code uses it. The project also requires knip (Q11) to report unused dependencies and exports, and a package that nothing imports yet is exactly what knip reports. Installing everything up front would either fail knip or need an ignore list.

## Decision

- Dependencies are installed in the phase, and the plan, that first imports them. The user approved the full Phase 1 package list at plan 01-01, and each plan installs only the names on it.
- The commit that adds a dependency gives a one-line reason for each new package in its body (Q11).
- knip stays strict from the first commit. It has no ignore list for packages that aren't used yet.
- ADR 0001 records the versions checked now for the whole §2 stack, so later phases install the same majors.

This deviates from P0-1.

## Consequences

- `package.json` only ever holds packages that the code uses, so knip stays meaningful and the install stays small.
- A phase that needs a new package has to install it and give its reason in the same commit.
- Version drift between phases is limited by ADR 0001. A package whose major has changed since then needs a new ADR.
