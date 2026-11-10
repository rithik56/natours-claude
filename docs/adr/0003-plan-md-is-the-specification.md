# 0003. plan.md is the specification

Status: Accepted
Date: 9 Nov 2026
Requirements: Q8, Q10
Plan review: DEL-23

## Context

`plan.md` is 1,091 lines. It defines the scope, data model, REST API, stack, architecture, contracts and a numbered requirement for every v1 mistake it designs out (S, B, R, D, U and Q families). The plan review also found places where the plan is wrong or out of date. The project needs one ID scheme so that commits, tests and requirements stay traceable, and it needs a way to correct the plan without losing the original.

## Decision

- `plan.md` is the specification and is never edited.
- GSD requirements reuse the IDs from `plan.md` unchanged (S1 to S23, B1 to B20, R1 to R11, D1 to D14, U1 to U27, Q1 to Q11). They are listed in `.planning/REQUIREMENTS.md`.
- When something in `plan.md` doesn't fit, the deviation is recorded as an ADR in `docs/adr/`, not as an edit. The ADR names the requirement IDs and the plan-review findings it covers.

## Consequences

- A reader sees the original plan and, next to it, every departure from it with its reason.
- Anyone who reads `plan.md` has to check `docs/adr/` for amendments. ADRs 0001 to 0008 are the first ones, and later phases add more.
- A requirement ID means the same thing in `plan.md`, in `REQUIREMENTS.md`, in a commit message and in a test name.
