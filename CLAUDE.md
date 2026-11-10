# Natours v2

This project is built from `plan.md`. Read it before changing anything. `plan.md` is the specification and is not edited.

- Work is planned and executed through GSD: phases are in `.planning/ROADMAP.md`, plans are in `.planning/phases/`, and requirement IDs are in `.planning/REQUIREMENTS.md`.
- Every change traces to the requirement IDs it covers and the GSD plan it belongs to. Commits follow Conventional Commits, with the IDs in square brackets and the plan number in brackets, for example `feat(session): pin HS256 and reject stale tokens [S14, B14] (01-09)`. A commit that adds a dependency gives a one-line reason in its body.
- If something in `plan.md` doesn't fit, record the deviation as an ADR in `docs/adr/`.
- `.env.example` lists configuration keys with comments. It isn't visible content, so it may hold local development values, and secret values in it stay empty.
- Use the real content in `seed/` (see `seed/README.md`). No placeholder text, names or images anywhere: not in the product, the styleguide, mockups, emails or test fixtures that a person might see.
- Indian conventions throughout: prices in ₹ with Indian digit grouping, dates in India Standard Time, distances in kilometres, Indian English.
