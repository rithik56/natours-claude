# 0022. Demo only: test mode, SES sandbox and a planned shutdown

Status: Accepted
Date: 9 Nov 2026
Requirements: D12
Plan review: PROJECT.md Key Decision 6

## Context

Natours v2 is a learning project. The deployed demo is a by-product, and it has no real customers (PROJECT.md). The budget is zero. The AWS Free plan closes after six months from sign-up, or when its credits run out (ADR 0019).

## Decision

- **Stripe stays in test mode.** No live payments are taken.
- **SES stays in its sandbox.** It sends only to verified demo addresses. Seed accounts use `example.com` addresses anyway (`seed/README.md`), which can never receive real mail.
- **The demo is shut down when the Free plan credits end.** There is no paid upgrade, so hosting beyond the Free plan is out of scope.

## Consequences

- No real person's payment details or mail address enter the system.
- Mail to an address that has not been verified in the SES sandbox is not delivered. In development and CI, mail goes to a fake (ADR 0016) and, from Phase 5, to Mailpit in the local container stack.
- Nothing is built to outlive the Free plan. Once the demo is shut down, the repository and its local `docker compose` setup are what remain.
- The date of the shutdown depends on the sign-up date and on how fast the credits are used. It is checked when Phase 8 starts. PROJECT.md records only that more than 4 months of credits were left on 8 Nov 2026.
- The README's deployment section, written in Phase 8, should say plainly that the deployment is a demo.
