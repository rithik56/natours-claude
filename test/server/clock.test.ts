import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadNow() {
  vi.resetModules();
  return (await import('@/server/clock')).now;
}

describe('now', () => {
  it('[B19] returns the APP_NOW instant when it carries an offset', async () => {
    vi.stubEnv('APP_NOW', '2026-11-20T23:59:59+05:30');
    const now = await loadNow();
    expect(now().toISOString()).toBe('2026-11-20T18:29:59.000Z');
  });

  it('[B19] reads a date-only APP_NOW as 00:00 IST that day', async () => {
    vi.stubEnv('APP_NOW', '2026-11-21');
    const now = await loadNow();
    expect(now().toISOString()).toBe('2026-11-20T18:30:00.000Z');
  });

  it('[B19] reads an APP_NOW with no offset as IST', async () => {
    vi.stubEnv('APP_NOW', '2026-11-21T09:30:00');
    const now = await loadNow();
    expect(now().toISOString()).toBe('2026-11-21T04:00:00.000Z');
  });

  it('returns the real time when APP_NOW is not set', async () => {
    vi.stubEnv('APP_NOW', '');
    const now = await loadNow();
    const drift = Math.abs(now().getTime() - Date.now());
    expect(drift < 1000).toBe(true);
  });
});
