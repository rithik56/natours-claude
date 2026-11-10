import { describe, expect, it } from 'vitest';
import { checkEnv, checkRepository } from '../../scripts/check-env.ts';

// Probe files are arrays of single-line strings, so no line of this file looks like code in a comment.
function lines(...parts: string[]): string {
  return parts.join('\n') + '\n';
}

const schemaKeys = ['APP_ENV', 'SESSION_SECRET'];
const goodExample = lines('APP_ENV=development', 'SESSION_SECRET=');

function check(
  envExample: string,
  sources: Array<{ path: string; source: string }> = [],
) {
  return checkEnv({ schemaKeys, envExample, sources });
}

describe('checkEnv', () => {
  it('[D4] accepts an example that lists every schema key', () => {
    expect(check(goodExample)).toEqual([]);
  });

  it('[D4] reports a schema key missing from .env.example', () => {
    const violations = check(lines('APP_ENV=development'));
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('SESSION_SECRET');
  });

  it('[D4] reports an .env.example key the schema does not know', () => {
    const violations = check(lines(goodExample, 'MYSTERY_FLAG=on'));
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('MYSTERY_FLAG');
  });

  it('[D4] allows a NEXT_PUBLIC_ key without a schema entry', () => {
    const example = lines(goodExample, 'NEXT_PUBLIC_MAP_STYLE=outdoors');
    expect(check(example)).toEqual([]);
  });

  it('[S18] reports NEXT_PUBLIC_STRIPE_SECRET in .env.example', () => {
    const violations = check(lines(goodExample, 'NEXT_PUBLIC_STRIPE_SECRET='));
    expect(violations.join('\n')).toContain('NEXT_PUBLIC_STRIPE_SECRET');
  });

  it('[S18] reports NEXT_PUBLIC_MAP_KEY in a source file', () => {
    const source = lines('const key = process.env.NEXT_PUBLIC_MAP_KEY;');
    const violations = check(goodExample, [{ path: 'src/map.ts', source }]);
    expect(violations.join('\n')).toContain('NEXT_PUBLIC_MAP_KEY');
    expect(violations.join('\n')).toContain('src/map.ts');
  });

  it('[S18] reports NEXT_PUBLIC_ADMIN_PASSWORD in next.config.ts', () => {
    const source = lines('env: { NEXT_PUBLIC_ADMIN_PASSWORD: 1 },');
    const violations = check(goodExample, [{ path: 'next.config.ts', source }]);
    expect(violations.join('\n')).toContain('NEXT_PUBLIC_ADMIN_PASSWORD');
  });

  it('[S18] matches the forbidden words without regard to case', () => {
    const source = lines('const a = process.env.NEXT_PUBLIC_api_Key;');
    const violations = check(goodExample, [{ path: 'src/a.ts', source }]);
    expect(violations.join('\n')).toContain('NEXT_PUBLIC_api_Key');
  });

  it('[S18] accepts a NEXT_PUBLIC_ name without a forbidden word', () => {
    const source = lines('const a = process.env.NEXT_PUBLIC_SITE_NAME;');
    expect(check(goodExample, [{ path: 'src/a.ts', source }])).toEqual([]);
  });

  it('[S18] reports a secret-named key that has a value', () => {
    const violations = check(
      lines('APP_ENV=development', 'SESSION_SECRET=abc'),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('SESSION_SECRET');
    expect(violations[0]).not.toContain('abc');
  });

  it('[S18] accepts a secret-named key with an empty value', () => {
    expect(check(lines('APP_ENV=development', 'SESSION_SECRET='))).toEqual([]);
  });

  it('[S18] checks TOKEN and PASSWORD names for values too', () => {
    const example = lines(goodExample, 'MAIL_PASSWORD=x');
    expect(check(example).join('\n')).toContain('MAIL_PASSWORD');
  });

  it('[S18] ignores comment lines that mention a key', () => {
    const example = lines('# SESSION_SECRET=abc', goodExample);
    expect(check(example)).toEqual([]);
  });
});

describe('checkRepository', () => {
  it("[S18] finds no violations in this repository's real files", () => {
    expect(checkRepository()).toEqual([]);
  });
});
