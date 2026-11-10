import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLogger,
  getLogger,
  redactUrl,
  requestLogger,
} from '@/server/logger';

type Line = Record<string, unknown>;

// Collects what the logger writes; one entry per JSON line.
function sink() {
  const chunks: string[] = [];
  return {
    destination: {
      write(chunk: string) {
        chunks.push(chunk);
      },
    },
    lines(): Line[] {
      return chunks
        .join('')
        .split('\n')
        .filter((text) => text.trim() !== '')
        .map((text) => JSON.parse(text) as Line);
    },
    raw(): string {
      return chunks.join('');
    },
  };
}

const requestId = '5f0c2b0e-8c43-4f1c-9a53-6d2a7f6a2b11';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('requestLogger', () => {
  it('[D7] writes one JSON line with requestId, level, time and msg', () => {
    const out = sink();
    const log = requestLogger(
      requestId,
      createLogger({ destination: out.destination }),
    );
    log.info({ path: '/readyz' }, 'ready');
    const lines = out.lines();
    expect(lines.length).toBe(1);
    const line = lines[0] ?? {};
    expect(line.requestId).toBe(requestId);
    expect(line.msg).toBe('ready');
    expect(line.path).toBe('/readyz');
    expect(line.level).toBe(30);
    expect(String(line.time)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('[D7] keeps the request ID on every line and never shares it between requests', () => {
    const out = sink();
    const root = createLogger({ destination: out.destination });
    const first = requestLogger('request-one', root);
    const second = requestLogger('request-two', root);
    first.info('one');
    second.info('two');
    first.info('three');
    const ids = out.lines().map((line) => line.requestId);
    expect(ids.join(',')).toBe('request-one,request-two,request-one');
  });
});

describe('redaction', () => {
  const secrets = [
    'kT9-hollow-bridge-4471',
    'vR2-spiti-night-8806',
    'xQ7-ladakh-pass-1932',
    'tok-meghalaya-6620',
    'rst-kerala-3358',
    'ck-session-9914',
    'Bearer ey-valley-5507',
    'whsec-t-rishikesh-2271',
  ];

  it('[S3] writes password, token and cookie values as [redacted]', () => {
    const out = sink();
    const log = createLogger({ destination: out.destination });
    log.info(
      {
        password: secrets[0],
        passwordConfirm: secrets[1],
        currentPassword: secrets[2],
        token: secrets[3],
        passwordResetToken: secrets[4],
        headers: {
          cookie: secrets[5],
          authorization: secrets[6],
          'stripe-signature': secrets[7],
        },
      },
      'sign in',
    );
    const line = out.lines()[0] ?? {};
    const headers = (line.headers ?? {}) as Line;
    const shown = [
      line.password,
      line.passwordConfirm,
      line.currentPassword,
      line.token,
      line.passwordResetToken,
      headers.cookie,
      headers.authorization,
      headers['stripe-signature'],
    ].join(',');
    expect(shown).toBe(secrets.map(() => '[redacted]').join(','));
  });

  it('[S3] leaves no secret value anywhere in the output', () => {
    const out = sink();
    const log = createLogger({ destination: out.destination });
    log.info(
      { password: secrets[0], headers: { cookie: secrets[5] } },
      'login',
    );
    expect(out.lines().length).toBe(1);
    const leaked = secrets.filter((value) => out.raw().includes(value));
    expect(leaked.join(',')).toBe('');
  });

  it('[S3] redacts one level of nesting and request headers', () => {
    const out = sink();
    const log = createLogger({ destination: out.destination });
    log.info(
      {
        user: { password: secrets[0], token: secrets[3] },
        req: {
          headers: {
            cookie: secrets[5],
            authorization: secrets[6],
            'stripe-signature': secrets[7],
          },
        },
      },
      'request',
    );
    expect(out.lines().length).toBe(1);
    const leaked = secrets.filter((value) => out.raw().includes(value));
    expect(leaked.join(',')).toBe('');
  });

  it('[S3] keeps fields that are not secret', () => {
    const out = sink();
    const log = createLogger({ destination: out.destination });
    log.info({ tourSlug: 'ladakh-high-passes', seats: 2 }, 'booking started');
    const line = out.lines()[0] ?? {};
    expect(`${String(line.tourSlug)} ${String(line.seats)}`).toBe(
      'ladakh-high-passes 2',
    );
  });
});

describe('redactUrl', () => {
  it('[S3] hides the reset token in a page URL and keeps the query', () => {
    expect(redactUrl('/reset-password/abc123?x=1')).toBe(
      '/reset-password/[redacted]?x=1',
    );
  });

  it('[S3] hides the reset token in an API URL', () => {
    expect(redactUrl('/api/v1/auth/reset-password/abc123')).toBe(
      '/api/v1/auth/reset-password/[redacted]',
    );
  });

  it('[S3] leaves other URLs unchanged', () => {
    expect(redactUrl('/tours/ladakh-high-passes?sort=price')).toBe(
      '/tours/ladakh-high-passes?sort=price',
    );
    expect(redactUrl('/reset-password')).toBe('/reset-password');
  });
});

describe('level', () => {
  it('[D7] uses LOG_LEVEL from config for the root logger', async () => {
    vi.stubEnv('LOG_LEVEL', 'warn');
    vi.resetModules();
    const { getLogger: freshGetLogger } = await import('@/server/logger');
    expect(freshGetLogger().level).toBe('warn');
  });

  it('[D7] returns the same root logger on every call', () => {
    expect(getLogger()).toBe(getLogger());
  });

  it('[D7] lets createLogger override the level', () => {
    expect(createLogger({ level: 'error' }).level).toBe('error');
  });
});
