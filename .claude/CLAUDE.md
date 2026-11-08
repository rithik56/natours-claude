<!-- GSD:project-start source:PROJECT.md -->

## Project

**Natours v2**

A from-scratch rebuild of Natours, a tour-booking web app, as a full-stack Next.js 16 application. It offers 13 small-group tours across India, priced in rupees. Pages render on the server first. It has a full visual redesign, Stripe Checkout in INR and a public REST API. It is a learning project for building a production-grade Next.js app with AI-assisted development, deployed as a demo. `plan.md` is the full specification.

**Core Value:** A traveller planning on their phone can choose a tour that fits their fitness, dates and budget, then book a start date with confidence.

### Constraints

- **Tech stack:**
  - `plan.md` §2 as written: Next.js 16 (App Router), React 19, Node.js 24 LTS, TypeScript `strict`, MongoDB with Mongoose, Zod, a `jose` JWT session with `bcryptjs`, plain CSS Modules with no framework, `next/font` (Anek Latin and Anek Devanagari), `next/image` with sharp, and Leaflet.
  - Also: Stripe Checkout, a BullMQ worker on Redis, React Email with nodemailer, pino, Vitest, Testing Library, Playwright, axe, Lighthouse CI, ESLint, stylelint, Prettier and GitHub Actions.
  - ADR 0001 records the versions checked at the start.
- **Hosting:**
  - The demo runs on an AWS Free plan account, created after July 2025, with more than 4 months of credits left on 8 Nov 2026.
  - The plan closes after six months from sign-up, or when the credits run out.
  - Only the final deployment phase uses AWS. Every earlier phase runs locally on `docker compose`, with fakes for Stripe, storage and mail.
- **Budget:** zero spend. When the Free plan ends, the demo is shut down.
- **Email:** SES through SMTP if the Free plan allows it, which hasn't been confirmed. If not, any SMTP provider's free tier, since nodemailer only needs SMTP credentials.
- **Content:**
  - Only real seed content: no placeholder text, names or images anywhere a person can see, including the product, styleguide, mockups, emails and test fixtures (`CLAUDE.md`, §9.1).
  - Every photo needs its credit (U27).
- **Locale:**
  - Prices in ₹ with Indian digit grouping (₹1,24,999), formatted only through `formatPrice`.
  - Dates are calendar days in India Standard Time, formatted through `formatDate`.
  - Distances in kilometres, and copy in Indian English with British spelling.
- **Process:**
  - `plan.md` is the spec and stays unedited. Every deviation is an ADR in `docs/adr/`.
  - Commits follow Conventional Commits and cite the requirement IDs they cover (Q8, as amended).
- **Design gate:** the user approves the design direction (`docs/design/direction.md` plus mockup screenshots) before any component or page styling starts (§9.7).
- **Accounts needed** by the deployment phase: AWS (have one), MongoDB Atlas, Stripe test-mode keys, and the DuckDNS subdomain.
- **Network for local development and CI:** `mongodb-memory-server` downloads a MongoDB binary, `next/font/google` downloads fonts at build time, and Playwright needs Chromium.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
