import { pathToFileURL } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Q2, S18 (ADR 0026): the CI build job starts MongoDB from the same downloaded binary the tests use.
// The version comes from package.json under config.mongodbMemoryServer, which mongodb-memory-server reads itself.
// The server listens on the loopback address only, on CI_MONGO_PORT (default 27017), until SIGINT or SIGTERM.

const LOOPBACK = '127.0.0.1';
const DEFAULT_PORT = 27017;

type MongoOptions = { ip: string; port: number };

/** Reads the port from CI_MONGO_PORT. The address is always the loopback address. */
export function parseMongoOptions(
  env: Record<string, string | undefined>,
): MongoOptions {
  const raw = env.CI_MONGO_PORT;
  if (raw === undefined || raw === '') {
    return { ip: LOOPBACK, port: DEFAULT_PORT };
  }
  const port = Number(raw);
  if (!/^\d+$/.test(raw) || port < 1 || port > 65535) {
    throw new Error(`CI_MONGO_PORT must be a whole number from 1 to 65535`);
  }
  return { ip: LOOPBACK, port };
}

async function main(): Promise<void> {
  const { ip, port } = parseMongoOptions(process.env);
  const server = await MongoMemoryServer.create({
    instance: { ip, port, portGeneration: false },
  });
  let stopping = false;
  const stop = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
  process.stdout.write(`ci-mongo: ready on mongodb://${ip}:${port}\n`);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `ci-mongo: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
