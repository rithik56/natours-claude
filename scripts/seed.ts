import { pathToFileURL } from 'node:url';
import { fromIstDay, type IstDay, toIstDay } from '@/lib/ist';
import { now } from '@/server/clock';
import { getConfig } from '@/server/config';
import { disconnectDb } from '@/server/db';
import { assertSeedAllowed, readSeedPasswords, runSeed } from './seed/run';

export type SeedArgs = { reset: boolean; today: IstDay | undefined };

/**
 * Reads the seed flags. `--reset` wipes the seed data first. `--today=YYYY-MM-DD` pins the day the
 * date roll measures against (ADR 0023); it must be a real calendar day. Any other argument is an error.
 */
export function parseSeedArgs(argv: readonly string[]): SeedArgs {
  let reset = false;
  let today: IstDay | undefined;
  for (const arg of argv) {
    if (arg === '--reset') {
      reset = true;
    } else if (arg.startsWith('--today=')) {
      const value = arg.slice('--today='.length);
      try {
        fromIstDay(value);
      } catch {
        throw new Error(`--today must be a real YYYY-MM-DD day, not "${value}"`);
      }
      today = value;
    } else {
      throw new Error(`unknown argument ${arg}`);
    }
  }
  return { reset, today };
}

/** Loads .env.local for the seed. A missing file is fine, and values already in the environment win. */
function loadLocalEnv(): void {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // No .env.local: the environment alone is used.
  }
}

async function main(): Promise<void> {
  loadLocalEnv();
  const args = parseSeedArgs(process.argv.slice(2));
  const config = getConfig();
  // SEC-16 and SEC-27: both checks run before any connection is opened.
  assertSeedAllowed({ appEnv: config.APP_ENV, reset: args.reset });
  const passwords = readSeedPasswords(config);
  // Without --today the roll measures against the one clock, so APP_NOW pins it too (ADR 0023).
  const today = args.today ?? toIstDay(now());
  try {
    const counts = await runSeed({ reset: args.reset, passwords, today });
    process.stdout.write(
      `seed: ${counts.tours} tours, ${counts.users} users, ${counts.reviews} reviews, ${counts.bookings} bookings, ${counts.photos} photos\n`,
    );
  } finally {
    await disconnectDb();
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `seed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
