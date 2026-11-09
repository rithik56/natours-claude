# 0019. Deploy on AWS instead of Render

Status: Accepted
Date: 9 Nov 2026
Requirements: D1, D12
Plan review: DEL-17; PROJECT.md Key Decision 3

## Context

`plan.md` D12 deploys the demo to Render and describes it in `render.yaml` (tasks P3-PL1 and P3-PL2). D1 requires the web server and the email worker to be separate long-running processes from the same image. The plan review found that Render charges for background workers, which have no free tier (DEL-17), and the project has a zero budget.

The project already has an AWS account on the Free plan. PROJECT.md records that it was created after July 2025 and that on 8 Nov 2026 it had more than 4 months of credits left. The plan closes after six months from sign-up, or when the credits run out, whichever comes first.

## Decision

The demo deploys to AWS, replacing Render and `render.yaml` (D12 as amended):

- **One EC2 instance in Mumbai (`ap-south-1`)** runs `docker compose` with four services: web, worker, Redis and Caddy.
- **MongoDB Atlas M0** holds the data.
- **S3** holds the images.
- **SES** sends the email.
- **Images are built in GitHub Actions.** An instance role gives the app access to S3 and SES.
- **AWS is used only in Phase 8,** the final deployment phase. Every earlier phase runs locally on `docker compose`, with fakes for Stripe, storage and mail (ADR 0016).

PROJECT.md gives the reason for the choice: Render has no free background worker, which D1 requires, and the AWS Free plan credits cover a 1 GB instance for the demo window.

## Consequences

- Until Phase 8 nothing in the repository talks to AWS. In staging and production the mailer, queue, rate limiter, Stripe client and storage throw until their real adapters exist (ADR 0016), so a deployment that skips a step fails loudly.
- Phase 8 needs four accounts: AWS (the project has one), MongoDB Atlas, Stripe in test mode, and a DuckDNS subdomain (ADR 0021).
- Whether SES can be reached through SMTP on the Free plan has not been confirmed. PROJECT.md's fallback is any SMTP provider's free tier, because nodemailer only needs SMTP credentials. Phase 8 checks this before the mailer is built against it.
- The instance size, the credit balance and the Free plan's limits are taken from PROJECT.md and have not been checked against AWS. Phase 8 checks them first.
- The README's deployment section (D12: deploying, rotating secrets and rolling back) is written in Phase 8. Until then the README says only that deployment arrives in that phase.
- Anything in `plan.md` that names Render, `render.yaml` or Render's Key Value store is read as the AWS equivalent in this ADR.
