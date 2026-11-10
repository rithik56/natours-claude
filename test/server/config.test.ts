import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, parseConfig } from '@/server/config-schema';

const validEnv = {
  APP_ENV: 'development',
  APP_URL: 'http://localhost:3000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/natours',
  SESSION_SECRET: 'k'.repeat(32),
};

// Joined into one line so a failing assertion prints on a single line.
function issueKeys(env: Record<string, string | undefined>): string {
  try {
    parseConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) {
      return error.issues.map((i) => i.key).join(',');
    }
    throw error;
  }
  return '';
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('parseConfig', () => {
  it('[D4] accepts the complete development env and applies defaults', () => {
    const config = parseConfig(validEnv);
    expect(config.APP_ENV).toBe('development');
    expect(config.DB_SERVER_SELECTION_TIMEOUT_MS).toBe(5000);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.CORS_ORIGINS).toEqual([]);
    expect(config.APP_NOW).toBeUndefined();
  });

  it('[S14] accepts a SESSION_SECRET of exactly 32 characters', () => {
    expect(issueKeys({ ...validEnv, SESSION_SECRET: 'k'.repeat(32) })).toBe('');
  });

  it('[S14] rejects a SESSION_SECRET of 31 characters', () => {
    expect(issueKeys({ ...validEnv, SESSION_SECRET: 'k'.repeat(31) })).toBe(
      'SESSION_SECRET',
    );
  });

  it('[D4] accepts DB_SERVER_SELECTION_TIMEOUT_MS at 100 and 30000', () => {
    const low = { ...validEnv, DB_SERVER_SELECTION_TIMEOUT_MS: '100' };
    const high = { ...validEnv, DB_SERVER_SELECTION_TIMEOUT_MS: '30000' };
    expect(parseConfig(low).DB_SERVER_SELECTION_TIMEOUT_MS).toBe(100);
    expect(parseConfig(high).DB_SERVER_SELECTION_TIMEOUT_MS).toBe(30000);
  });

  it('[D4] rejects DB_SERVER_SELECTION_TIMEOUT_MS at 99 and 30001', () => {
    for (const value of ['99', '30001']) {
      const env = { ...validEnv, DB_SERVER_SELECTION_TIMEOUT_MS: value };
      expect(issueKeys(env)).toBe('DB_SERVER_SELECTION_TIMEOUT_MS');
    }
  });

  it('[D4] treats an empty MONGODB_URI as missing and names it', () => {
    expect(issueKeys({ ...validEnv, MONGODB_URI: '' })).toBe('MONGODB_URI');
  });

  it('[D4] reports a missing APP_ENV', () => {
    expect(issueKeys({ ...validEnv, APP_ENV: undefined })).toBe('APP_ENV');
  });

  it('[D4] rejects an APP_URL that carries a path', () => {
    expect(
      issueKeys({ ...validEnv, APP_URL: 'http://localhost:3000/path' }),
    ).toBe('APP_URL');
  });

  it('[D4] rejects an APP_URL that is not http or https', () => {
    expect(issueKeys({ ...validEnv, APP_URL: 'ftp://localhost:3000' })).toBe(
      'APP_URL',
    );
  });

  it('[D4] requires https for APP_URL in production and in staging', () => {
    for (const appEnv of ['production', 'staging']) {
      const env = { ...validEnv, APP_ENV: appEnv };
      expect(issueKeys(env)).toBe('APP_URL');
      expect(
        issueKeys({ ...env, APP_URL: 'https://natours.example.com' }),
      ).toBe('');
    }
  });

  it('[D4] rejects APP_NOW in production but accepts it in development, test and ci', () => {
    const now = { APP_NOW: '2026-11-09T09:30:00+05:30' };
    const production = {
      ...validEnv,
      ...now,
      APP_ENV: 'production',
      APP_URL: 'https://natours.example.com',
    };
    expect(issueKeys(production)).toBe('APP_NOW');
    for (const appEnv of ['development', 'test', 'ci']) {
      expect(issueKeys({ ...validEnv, ...now, APP_ENV: appEnv })).toBe('');
    }
  });

  it('[D4] accepts APP_NOW as a calendar date and rejects other text', () => {
    expect(issueKeys({ ...validEnv, APP_NOW: '2026-11-09' })).toBe('');
    expect(issueKeys({ ...validEnv, APP_NOW: 'next tuesday' })).toBe('APP_NOW');
  });

  it('[D4] splits CORS_ORIGINS on commas and trims each origin', () => {
    const config = parseConfig({
      ...validEnv,
      CORS_ORIGINS: 'https://a.example.com, https://b.example.com',
    });
    expect(config.CORS_ORIGINS.join(' ')).toBe(
      'https://a.example.com https://b.example.com',
    );
  });

  it('[D4] rejects a CORS_ORIGINS entry that carries a path', () => {
    expect(
      issueKeys({ ...validEnv, CORS_ORIGINS: 'https://a.example.com/x' }),
    ).toBe('CORS_ORIGINS');
  });

  it('[D4] gives an empty allowlist for an empty CORS_ORIGINS', () => {
    expect(parseConfig({ ...validEnv, CORS_ORIGINS: '' }).CORS_ORIGINS).toEqual(
      [],
    );
  });

  it('[D4] names every invalid key in schema order', () => {
    const env = {
      APP_ENV: 'nowhere',
      APP_URL: 'not a url',
      SESSION_SECRET: 'short',
      LOG_LEVEL: 'loud',
    };
    expect(issueKeys(env)).toBe(
      'APP_ENV,APP_URL,MONGODB_URI,SESSION_SECRET,LOG_LEVEL',
    );
  });

  it('[D4] never puts the received value in an issue message', () => {
    try {
      parseConfig({ ...validEnv, SESSION_SECRET: 'short-secret-value' });
      expect.unreachable('parseConfig should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const text = JSON.stringify((error as ConfigError).issues);
      expect(text).not.toContain('short-secret-value');
    }
  });
});

describe('getConfig', () => {
  it('[D4] derives appOrigin, corsOrigins and isProductionLike', async () => {
    vi.resetModules();
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('APP_URL', 'https://natours.example.com');
    vi.stubEnv('CORS_ORIGINS', 'https://a.example.com');
    const { getConfig } = await import('@/server/config');
    const config = getConfig();
    expect(config.appOrigin).toBe('https://natours.example.com');
    expect(config.corsOrigins).toEqual(['https://a.example.com']);
    expect(config.isProductionLike).toBe(true);
  });

  it('[D4] reports isProductionLike false outside staging and production', async () => {
    vi.resetModules();
    const { getConfig } = await import('@/server/config');
    expect(getConfig().isProductionLike).toBe(false);
  });
});
