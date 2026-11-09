import { describe, expect, it } from 'vitest';
import { checkConventions } from '../../scripts/check-conventions.ts';

// Probe sources are arrays of single-line strings, so no line of this file looks like code in a comment.
function source(...parts: string[]): string {
  return parts.join('\n') + '\n';
}

function check(path: string, text = 'export const a = 1;\n') {
  return checkConventions([{ path, source: text }]);
}

describe('check-conventions', () => {
  it('[Q3] rejects a PascalCase file name', () => {
    expect(check('src/lib/TourService.ts')).toHaveLength(1);
  });

  it('[Q3] rejects a snake_case file name', () => {
    expect(check('src/lib/format_utils.ts')).toHaveLength(1);
  });

  it('[Q3] accepts kebab-case, dynamic route folders and test names', () => {
    expect(check('src/app/tour/[slug]/page.tsx')).toEqual([]);
    expect(check('src/app/[...rest]/page.tsx')).toEqual([]);
    expect(check('src/app/(site)/page.tsx')).toEqual([]);
    expect(check('test/lib/format.test.ts')).toEqual([]);
    expect(check('src/app/header.module.css', '')).toEqual([]);
    expect(check('src/types/env.d.ts')).toEqual([]);
  });

  it('[Q5] rejects a TODO without an issue link', () => {
    const text = source('// TODO tidy this', 'export const a = 1;');
    expect(check('src/lib/a.ts', text)).toHaveLength(1);
  });

  it('[Q5] accepts a TODO with an issue number or a GitHub issues URL', () => {
    const text = source(
      '// TODO(#12) tidy this',
      '// FIXME https://github.com/example/natours/issues/7 wrong zone',
      'export const a = 1;',
    );
    expect(check('src/lib/a.ts', text)).toEqual([]);
  });

  it('[Q5] rejects a FIXME without an issue link', () => {
    const text = source('// FIXME later', 'export const a = 1;');
    expect(check('src/lib/a.ts', text)).toHaveLength(1);
  });

  it('[Q5] rejects a line comment that looks like commented-out code', () => {
    for (const comment of [
      '// const total = 1;',
      "// import { a } from './a';",
      '// return value',
      '// call(thing);',
    ]) {
      const text = source(comment, 'export const a = 1;');
      expect(check('src/lib/a.ts', text), comment).toHaveLength(1);
    }
  });

  it('[Q5] accepts explanatory, client, eslint and ts comments', () => {
    const text = source(
      '// Dates are calendar days in India Standard Time.',
      '// client: event handlers for the menu',
      '// eslint-disable-next-line no-console',
      '// @ts-expect-error probe',
      'export const a = 1;',
    );
    expect(check('src/lib/a.ts', text)).toEqual([]);
  });

  it('[Q5] ignores TODO text inside a string literal', () => {
    const text = source("export const a = '// TODO tidy this';");
    expect(check('src/lib/a.ts', text)).toEqual([]);
  });

  it('[Q3] rejects an action export that does not end in Action', () => {
    const text = source('export async function signup() {}');
    expect(check('src/app/actions.ts', text)).toHaveLength(1);
    const arrow = source('export const login = async () => {};');
    expect(check('src/app/actions.ts', arrow)).toHaveLength(1);
  });

  it('[Q3] accepts action exports that end in Action', () => {
    const text = source(
      'export async function signupAction() {}',
      'export const loginAction = async () => {};',
    );
    expect(check('src/app/actions.ts', text)).toEqual([]);
  });

  it('[Q3] only checks export names in files called actions.ts', () => {
    const text = source('export async function signup() {}');
    expect(check('src/lib/signup.ts', text)).toEqual([]);
  });

  it('[R6] rejects a server file whose first import is not server-only', () => {
    const text = source(
      "import mongoose from 'mongoose';",
      "import 'server-only';",
    );
    expect(check('src/server/db.ts', text)).toHaveLength(1);
  });

  it('[R6] rejects a server file with no server-only import', () => {
    expect(check('src/server/db.ts', 'export const a = 1;\n')).toHaveLength(1);
  });

  it('[R6] accepts a server file that starts with server-only', () => {
    const text = source(
      "import 'server-only';",
      "import mongoose from 'mongoose';",
    );
    expect(check('src/server/db.ts', text)).toEqual([]);
    expect(check('src/server/modules/users/model.ts', text)).toEqual([]);
  });

  it('[R6] exempts config-schema.ts and files outside src/server', () => {
    const text = source("import { z } from 'zod';");
    expect(check('src/server/config-schema.ts', text)).toEqual([]);
    expect(check('src/lib/format.ts', text)).toEqual([]);
  });
});
