# Seed data

Copied from v1 (`rithik56/natours`): `dev-data/data/{tours,users,reviews}.json` and the
tour and user photos those files reference (from `public/img/`).

`scripts/seed.ts` (task P1-CA5) reads these files. Notes for that task:

- The `password` values in `users.json` are already bcrypt hashes. Insert them without
  hashing them again, or replace them with a known development password and hash that once.
- The tour `startDates` are in the past. The seed script moves them into the future (D10).
- Photos are uploaded to storage by the seed script, not served from this folder.
