import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

function captureExit() {
  const written: string[] = [];
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    written.push(String(chunk));
    return true;
  });
  const exit = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => undefined) as never);
  return { written, exit };
}

async function load() {
  vi.resetModules();
  const { loadConfigOrExit } = await import('@/server/config-startup');
  return loadConfigOrExit;
}

describe('loadConfigOrExit', () => {
  it('[D4] returns quietly when the environment is valid', async () => {
    const { written, exit } = captureExit();
    const loadConfigOrExit = await load();
    loadConfigOrExit();
    expect(exit).not.toHaveBeenCalled();
    expect(written).toEqual([]);
  });

  it('[D4] names every invalid key, one per line in schema order, and exits 1', async () => {
    vi.stubEnv('APP_URL', 'http://localhost:3000/secret-path-value');
    vi.stubEnv('SESSION_SECRET', 'short-secret-value');
    vi.stubEnv('LOG_LEVEL', 'loud-level-value');
    const { written, exit } = captureExit();
    const loadConfigOrExit = await load();
    loadConfigOrExit();

    expect(exit).toHaveBeenCalledWith(1);
    const text = written.join('');
    expect(text.startsWith('Invalid configuration:\n')).toBe(true);
    const lines = text.trimEnd().split('\n').slice(1);
    expect(lines.map((line) => line.split(':')[0])).toEqual([
      '  - APP_URL',
      '  - SESSION_SECRET',
      '  - LOG_LEVEL',
    ]);
  });

  it('[D4] writes none of the environment values to stderr', async () => {
    vi.stubEnv('APP_URL', 'http://localhost:3000/secret-path-value');
    vi.stubEnv('SESSION_SECRET', 'short-secret-value');
    const { written } = captureExit();
    const loadConfigOrExit = await load();
    loadConfigOrExit();
    const text = written.join('');
    expect(text).not.toContain('secret-path-value');
    expect(text).not.toContain('short-secret-value');
    expect(text).not.toContain(process.env.MONGODB_URI ?? 'no-uri');
  });

  it('[D4] treats an empty SESSION_SECRET as missing', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    const { written, exit } = captureExit();
    const loadConfigOrExit = await load();
    loadConfigOrExit();
    expect(exit).toHaveBeenCalledWith(1);
    expect(written.join('')).toContain('SESSION_SECRET: is required');
  });
});

describe('register', () => {
  it('[D4] validates configuration when the Node.js runtime starts', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('SESSION_SECRET', '');
    const { exit } = captureExit();
    vi.resetModules();
    const { register } = await import('@/instrumentation');
    await register();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('[D4] does nothing in the edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('SESSION_SECRET', '');
    const { exit } = captureExit();
    vi.resetModules();
    const { register } = await import('@/instrumentation');
    await register();
    expect(exit).not.toHaveBeenCalled();
  });
});
