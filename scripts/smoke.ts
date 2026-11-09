import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// D4: the built app refuses to start on bad configuration and serves on good configuration.
// Run `npm run build` first and keep MongoDB reachable at MONGODB_URI.

const ROOT = join(import.meta.dirname, '..');
const PORT = '3210';
const ORIGIN = `http://localhost:${PORT}`;
const LIMIT_MS = 30_000;

type Started = { child: ChildProcess; output: () => string };

function startApp(env: NodeJS.ProcessEnv): Started {
  const child = spawn(
    join(ROOT, 'node_modules/.bin/next'),
    ['start', '-p', PORT],
    { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let captured = '';
  child.stdout?.on('data', (chunk: Buffer) => (captured += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (captured += chunk.toString()));
  return { child, output: () => captured };
}

function exited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

async function stopApp({ child }: Started): Promise<void> {
  if (exited(child)) return;
  const done = new Promise<void>((resolve) =>
    child.once('exit', () => resolve()),
  );
  child.kill('SIGTERM');
  await Promise.race([done, sleep(5_000, undefined, { ref: false })]);
  if (!exited(child)) child.kill('SIGKILL');
}

async function waitForExit(child: ChildProcess): Promise<number | null> {
  if (exited(child)) return child.exitCode;
  const code = new Promise<number | null>((resolve) =>
    child.once('exit', (value) => resolve(value)),
  );
  const timeout = sleep(LIMIT_MS, undefined, { ref: false }).then(
    () => 'timeout' as const,
  );
  const result = await Promise.race([code, timeout]);
  if (result === 'timeout')
    throw new Error('bad-env start did not exit within 30 seconds');
  return result;
}

/** A start with an empty SESSION_SECRET must exit 1, name the key and print no values. */
async function checkRefusesBadEnv(): Promise<void> {
  const app = startApp({ ...process.env, SESSION_SECRET: '' });
  try {
    const code = await waitForExit(app.child);
    const output = app.output();
    if (code !== 1)
      throw new Error(`bad-env start exited with ${String(code)}, expected 1`);
    if (!output.includes('SESSION_SECRET')) {
      throw new Error('bad-env start did not name SESSION_SECRET');
    }
    const uri = process.env.MONGODB_URI;
    if (uri && output.includes(uri)) {
      throw new Error('bad-env start printed the MONGODB_URI value');
    }
  } finally {
    await stopApp(app);
  }
}

async function waitForOk(app: Started, path: string): Promise<Response> {
  const deadline = Date.now() + LIMIT_MS;
  while (Date.now() < deadline) {
    if (exited(app.child)) {
      throw new Error(`good-env start exited early:\n${app.output()}`);
    }
    try {
      const response = await fetch(`${ORIGIN}${path}`);
      if (response.status === 200) return response;
    } catch {
      // The server is not listening yet.
    }
    await sleep(500);
  }
  throw new Error(`${path} did not answer 200 within 30 seconds`);
}

/** A start with the inherited environment must serve the home page and /readyz. */
async function checkServesGoodEnv(): Promise<void> {
  const app = startApp({ ...process.env });
  try {
    const home = await waitForOk(app, '/');
    const html = await home.text();
    if (!html.includes('lang="en-IN"')) {
      throw new Error('the home page does not declare lang="en-IN"');
    }
    await waitForOk(app, '/readyz');
  } finally {
    await stopApp(app);
  }
}

async function main(): Promise<void> {
  try {
    await checkRefusesBadEnv();
    await checkServesGoodEnv();
    process.stdout.write('smoke: ok\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`smoke: failed: ${message}\n`);
    process.exitCode = 1;
  }
}

await main();
