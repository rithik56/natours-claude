# 0037. Lead guides and admins manage any tour

Status: Accepted
Date: 16 Nov 2026
Requirements: F6
Plan review: SEC-24

## Context

F6 as written lets admins and lead guides create, update (including the price) and delete tours through the API. It sets no ownership rule: a lead guide may change any tour, not only the ones that name them as a guide. Review finding SEC-24 asked for this access rule to be recorded, so that a stricter rule can be adopted later without first finding out what was meant.

The user settled the rule on 16 Nov 2026 (decision D-16): lead guides and admins may manage any tour, including its price and its deletion. The rule is reversible, because it is one access declaration per route.

## Decision

1. `POST /api/v1/tours`, `PATCH /api/v1/tours/[id]` and `DELETE /api/v1/tours/[id]` each declare `access: { roles: ['lead-guide', 'admin'] }`. The match is exact: an admin is not waved through a list that leaves `admin` out, and a guide or a user gets 403.
2. An anonymous caller gets 401. A write without a foreign Origin is accepted, and a write from another site's Origin is 403 (S9).
3. The services check no ownership. Any lead guide may change any tour, its price and its guides, and may delete a tour that has no booking.

## Stricter rules not adopted

Each is a later change, recorded so it can be chosen on purpose:

- **Own tours only.** A lead guide may write only a tour whose `guides` list names them. This needs an ownership check in `updateTour` and `deleteTour`, against the signed-in user's id.
- **No price change by a lead guide.** Only an admin may change `price`. This needs the update to refuse `price` for a lead guide, in the service or in the schema the route chooses.
- **Admin only for create and delete.** Lead guides keep PATCH, and POST and DELETE move to `roles: ['admin']`.

To switch, change the route's `access` declaration, and where the rule depends on the record, add the ownership check to the service. The route tests in `test/app/api/tours-write.test.ts` already cover every role on every write, so a change to the access table shows as a failing test.

## Consequences

- Any lead guide can change or delete any tour. The 409 rule on bookings is the only guard on deletion.
- A price change is not audited in Phase 4. The update changes the stored document and nothing else records who changed it.
- Phase 6 must keep these three routes in the same declared roles when it builds the access matrix, unless a new ADR changes the rule.
