# 0006. Only the home page before the design gate

Status: Accepted
Date: 9 Nov 2026
Requirements: R1
Plan review: DEL-23

## Context

`plan.md` P0-7 asks for "a placeholder page for every route in §1.5". `CLAUDE.md` bans placeholder text, names and images anywhere a person can see them, which includes pages in the product. The two conflict (DEL-23). The design direction is also not approved until the Phase 2 gate, so any styled page written earlier would be thrown away.

## Decision

At the end of Phase 1 (D-09) the only page is `/`. It is unstyled semantic HTML inside `<html lang="en-IN">`, with the name "Natours" and one true sentence about the product. It has no Next.js starter content, no styling and no header or footer, because those belong to Phase 3.

The only Route Handlers are `/healthz` and `/readyz`.

Every other route in §1.5 is created by the phase that builds it.

This deviates from P0-7's "a placeholder page for every route".

## Consequences

- No page in the repository contains placeholder text, so the `CLAUDE.md` content rule holds from the first commit.
- A route that does not exist returns the framework's 404 until its phase builds it.
- The route list in §1.5 is a checklist for later phases, not a set of files that already exist.
