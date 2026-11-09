# Natours v2

Natours v2 is a from-scratch rebuild of Natours, a tour-booking web app, as a full-stack Next.js 16 application with 13 small-group tours across India, priced in rupees. `plan.md` is the specification, and `docs/adr/` records every decision that departs from it.

This is the quick start. The rest of the README is added when the project is deployed.

## Prerequisites

- Node.js 24. On macOS, run `brew install node@24` and put `/opt/homebrew/opt/node@24/bin` first on your `PATH`. Check it with `node --version`, which must print v24.15 or later in the 24 line. The project refuses to install under any other major version.
- Docker Desktop, for the local MongoDB.

## Setup

1. Install the dependencies: `npm ci`
2. Create your local environment file: `cp .env.example .env.local`. Then fill in every empty value, following the comment above each key.
3. Start MongoDB: `docker compose up -d mongo`
4. Start the app: `npm run dev`
5. Open http://localhost:3000 for the home page and http://localhost:3000/readyz for the readiness check. `/readyz` answers 200 when MongoDB is reachable and 503 when it is not.

## Tests

Run `npm test`. The first run downloads a MongoDB binary, because the tests use an in-memory database and don't need Docker.
