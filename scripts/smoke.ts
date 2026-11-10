import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// D4: the built app refuses to start on bad configuration and serves on good configuration.
// S11, D7: the built app also gives every script tag the nonce from its own CSP.
// Run `npm run build` first and keep MongoDB reachable at MONGODB_URI.

const ROOT = join(import.meta.dirname, '..');
const PORT = '3210';
const ORIGIN = `http://localhost:${PORT}`;
const LIMIT_MS = 30_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SECURITY_HEADERS = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'strict-transport-security',
  'permissions-policy',
];

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

function requireSecurityHeaders(response: Response, label: string): void {
  for (const name of SECURITY_HEADERS) {
    if (!response.headers.has(name)) {
      throw new Error(`${label} is missing the ${name} header`);
    }
  }
  if (response.headers.has('x-powered-by')) {
    throw new Error(`${label} still sends the x-powered-by header`);
  }
}

function nonceFrom(policy: string): string {
  const match = /'nonce-([^']+)'/.exec(policy);
  if (!match?.[1]) throw new Error('the CSP carries no nonce');
  return match[1];
}

/** GET / must carry a nonce CSP, and every script tag must carry that nonce. */
async function checkPage(): Promise<string> {
  const response = await fetch(`${ORIGIN}/`);
  const html = await response.text();
  const policy = response.headers.get('content-security-policy');
  if (policy === null) throw new Error('GET / has no content-security-policy');
  if (!policy.includes("'strict-dynamic'")) {
    throw new Error("the CSP lacks 'strict-dynamic'");
  }
  const scriptSrc = policy
    .split('; ')
    .find((part) => part.startsWith('script-src '));
  if (scriptSrc === undefined || scriptSrc.includes("'unsafe-inline'")) {
    throw new Error("the CSP script-src is missing or allows 'unsafe-inline'");
  }
  const nonce = nonceFrom(policy);
  const tags = html.match(/<script\b[^>]*>/g) ?? [];
  if (tags.length === 0) throw new Error('GET / has no script tags to check');
  const bare = tags.filter((tag) => !tag.includes(`nonce="${nonce}"`));
  if (bare.length > 0) {
    throw new Error(
      `${String(bare.length)} of ${String(tags.length)} script tags lack the CSP nonce`,
    );
  }
  const requestId = response.headers.get('x-request-id') ?? '';
  if (!UUID.test(requestId))
    throw new Error('x-request-id on GET / is not a UUID');
  requireSecurityHeaders(response, 'GET /');
  return nonce;
}

/** The probe routes sit outside the proxy, so they get the static headers and no CSP. */
async function checkProbeHeaders(): Promise<void> {
  const response = await fetch(`${ORIGIN}/readyz`);
  requireSecurityHeaders(response, 'GET /readyz');
  if (response.headers.has('content-security-policy')) {
    throw new Error('GET /readyz carries a CSP although the proxy skips it');
  }
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
    const first = await checkPage();
    const second = await checkPage();
    if (first === second) throw new Error('two requests to / shared one nonce');
    await checkProbeHeaders();
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
