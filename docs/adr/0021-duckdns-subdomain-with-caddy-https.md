# 0021. A DuckDNS subdomain with HTTPS from Caddy

Status: Accepted
Date: 9 Nov 2026
Requirements: S9, D12
Plan review: PROJECT.md Key Decision 5

## Context

The demo has no domain of its own, and buying one is outside the zero budget. Two things still need HTTPS:

- The session cookie is `secure` in staging and production (S9, ADR 0015), so a browser sends it only over HTTPS.
- Stripe sends webhooks to a public HTTPS URL (`/webhooks/stripe`, D12).

PROJECT.md lists a custom domain as out of scope: a free DuckDNS subdomain is enough for a demo.

## Decision

- **The demo uses a free DuckDNS subdomain.** The name is chosen in Phase 8.
- **Caddy, one of the four services on the instance (ADR 0019), serves HTTPS** with certificates from Let's Encrypt.
- **The instance has an Elastic IP,** so the DuckDNS record keeps pointing at it.

## Consequences

- `APP_URL` is `https://` plus the subdomain in staging and production. Startup refuses a staging or production `APP_URL` that is not `https` (ADR 0010), and the Content-Security-Policy adds `upgrade-insecure-requests` in those two environments (ADR 0011).
- The Stripe webhook endpoint in test mode is that same subdomain with `/webhooks/stripe`.
- Nothing in this ADR has been tried yet. Whether Let's Encrypt will issue a certificate for the chosen subdomain, and what an Elastic IP costs while the instance runs, are checked in Phase 8.
- If DuckDNS or the certificate step fails, the demo has no HTTPS and the secure cookie never reaches the server. There is no plain-HTTP fallback for staging or production.
- When the Free plan ends the demo is shut down (ADR 0022), and the subdomain is no longer needed.
