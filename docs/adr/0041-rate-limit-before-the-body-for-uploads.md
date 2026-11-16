# 0041. A rate limit can run before the body is read

Status: Accepted; amends 0017 (pipeline order) and 0038 (the image upload's rate limit)
Date: 16 Nov 2026
Requirements: S16, SEC-05, SEC-17
Plan review: 04-REVIEW WR-04

## Context

ADR 0017 fixes the `withApi` pipeline order: request ID, Origin check, access, params, query, body, rate limit, handler. ADR 0038 kept that order for uploads.

The image route allows 20 uploads per signed-in user per hour (SEC-05). Its key depends only on the user. Under the fixed order, the server still read and parsed up to 22 MB of multipart body for a caller who was already over the limit. Access runs first, so only lead guides and admins can reach that cost, but the limit was placed after the work it exists to stop.

## Decision

1. **`withApi` takes a second rate-limit option, `rateLimitBeforeBody`.** It is checked after access, params and query, and before any body or upload is read. Its key receives the request and the user only, because no body has been read.
2. **`rateLimit` keeps its place.** It is checked after the body or upload is read and its key still receives the parsed body. Routes that need the body keep using it.
3. **The image route uses `rateLimitBeforeBody`,** since its key needs only the user.
4. Access still comes first, so an anonymous caller learns nothing about the limit or the body, as ADR 0017 requires.

**Rejected:** a `beforeBody` flag on the existing `rateLimit` option. A union of the two shapes stopped TypeScript from contextually typing the key of every existing route, so the option is a separate field.

## Consequences

- A caller over the limit gets a 429 with `Retry-After` before the server reads their upload. A test sends an upload above the route's byte limit and expects 429, not 413, and checks the request body was never read.
- The pipeline order in ADR 0017 holds for every route that does not set `rateLimitBeforeBody`. For those that do, the limit moves ahead of the body.
- `docs/contracts.md` lists both options and the new position of the first limit.

**Reversibility:** reversible. Removing the option moves the image route's limit back after the upload is read.
