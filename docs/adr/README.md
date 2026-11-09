# Architecture decision records

Every decision that departs from `plan.md`, and every project-level decision, is recorded here (ADR 0003). `plan.md` itself is never edited. The shared contracts these decisions shaped are in [`docs/contracts.md`](../contracts.md).

| Number | Title | Status |
| --- | --- | --- |
| 0001 | [Versions checked at the start](0001-versions.md) | Accepted |
| 0002 | [GSD replaces the agent team](0002-gsd-replaces-the-agent-team.md) | Accepted |
| 0003 | [plan.md is the specification](0003-plan-md-is-the-specification.md) | Accepted |
| 0004 | [Install dependencies when first used](0004-install-dependencies-when-first-used.md) | Accepted |
| 0005 | [Contracts are written per phase](0005-contracts-written-per-phase.md) | Accepted |
| 0006 | [Only the home page before the design gate](0006-only-the-home-page-before-the-design-gate.md) | Accepted |
| 0007 | [Regression tests are written with each feature](0007-regression-tests-written-with-each-feature.md) | Accepted |
| 0008 | [Plan-review findings are handled per phase](0008-plan-review-findings-handled-per-phase.md) | Accepted |
| 0009 | [Lint and format rule adjustments](0009-lint-and-format-rule-adjustments.md) | Accepted |
| 0010 | [APP_ENV, APP_URL and startup validation](0010-app-env-app-url-and-startup-validation.md) | Accepted |
| 0011 | [Inline style attributes in the Content-Security-Policy, for next/image](0011-csp-style-attributes-for-next-image.md) | Accepted |
| 0012 | [Tagged data cache and dynamic rendering](0012-tagged-data-cache-and-dynamic-rendering.md) | Accepted |
| 0013 | [User DTO split and the DTO rule](0013-user-dto-split-and-dto-rule.md) | Accepted |
| 0014 | [One price per tour](0014-one-price-per-tour.md) | Accepted |
| 0015 | [Sessions read the user on every request](0015-sessions-read-the-user-every-request.md) | Accepted |
| 0016 | [Adapters are selected by APP_ENV](0016-adapters-selected-by-app-env.md) | Accepted |
| 0017 | [Required access and one error mapping for every route](0017-required-access-and-error-mapping.md) | Accepted |
| 0018 | [The JavaScript budget is measured with Lighthouse CI](0018-javascript-budget-measured-with-lighthouse-ci.md) | Accepted |
| 0019 | [Deploy on AWS instead of Render](0019-deploy-on-aws-instead-of-render.md) | Accepted |
| 0020 | [Redis on the private network, without TLS](0020-redis-on-the-private-network-without-tls.md) | Accepted |
| 0021 | [A DuckDNS subdomain with HTTPS from Caddy](0021-duckdns-subdomain-with-caddy-https.md) | Accepted |
| 0022 | [Demo only: test mode, SES sandbox and a planned shutdown](0022-demo-only-test-mode-and-shutdown.md) | Accepted |
| 0023 | [The seed rolls forward only start dates that have passed](0023-seed-rolls-forward-only-passed-start-dates.md) | Accepted |
| 0024 | [Folder and test layout](0024-folder-and-test-layout.md) | Accepted |
| 0025 | [ActionState carries the wait time for a rate-limited call](0025-action-state-carries-retry-after.md) | Accepted |

## Format

One file per decision, named `NNNN-kebab-title.md`, numbered from 0001 with no gaps. Each file starts with its title as `# NNNN. Title`, then these header lines: `Status:`, `Date:` (in India Standard Time, for example 9 Nov 2026), `Requirements:` and `Plan review:`. Then come the sections `## Context`, `## Decision` and `## Consequences`, all of them filled in.

## Adding an ADR

1. Take the next free number and write the file in the format above. Name the requirement IDs and the plan-review findings it covers.
2. Add a row to the table above, in numeric order.
3. If it changes a contract, update `docs/contracts.md` in the same change.
4. Cite it in the commit message body when it explains the change.

A decision is changed by a new ADR that supersedes it. The old ADR's Status line then names the new one.
