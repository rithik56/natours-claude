import { describe, expect, it } from 'vitest';
import {
  checkClientBoundary,
  checkClientFiles,
} from '../../scripts/check-client-boundaries.ts';

// Probe sources are arrays of single-line strings, so no line of this file looks like code in a comment.
function source(...parts: string[]): string {
  return parts.join('\n') + '\n';
}

const directive = "'use client';";
const reason = '// client: event handlers for the menu';

describe('check-client-boundaries', () => {
  it('[R2] passes when the client comment is the very next line', () => {
    const text = source(directive, reason, "import { useState } from 'react';");
    expect(checkClientBoundary('src/app/menu.tsx', text)).toEqual([]);
  });

  it('[R2] fails when a blank line separates the directive and the comment', () => {
    const text = source(directive, '', reason);
    const found = checkClientBoundary('src/app/menu.tsx', text);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('// client: ');
  });

  it('[R2] fails when the client comment has an empty reason', () => {
    const text = source(directive, '// client: ');
    expect(checkClientBoundary('src/app/menu.tsx', text)).toHaveLength(1);
  });

  it('[R2] fails when the comment is above the directive', () => {
    const text = source(reason, directive);
    const found = checkClientBoundary('src/app/menu.tsx', text);
    expect(found.length).toBeGreaterThan(0);
    expect(found.join(' ')).toContain('first');
  });

  it('[R2] reports a directive that is not on the first non-empty line as misplaced', () => {
    const text = source("import { a } from './a';", directive, reason);
    const found = checkClientBoundary('src/app/menu.tsx', text);
    expect(found.join(' ')).toContain('first');
  });

  it('[R2] accepts double quotes and no semicolon on the directive', () => {
    const text = source('"use client"', reason);
    expect(checkClientBoundary('src/app/menu.tsx', text)).toEqual([]);
  });

  it('[R2] a project with zero client files passes and counts 0', () => {
    const none = checkClientFiles([]);
    expect(none).toEqual({ violations: [], clientFileCount: 0 });
    const server = checkClientFiles([
      {
        path: 'src/server/db.ts',
        source: source("import 'server-only';", 'export const a = 1;'),
      },
    ]);
    expect(server).toEqual({ violations: [], clientFileCount: 0 });
  });

  it('[R2] counts client files and prefixes violations with the path', () => {
    const result = checkClientFiles([
      { path: 'src/app/ok.tsx', source: source(directive, reason) },
      { path: 'src/app/bad.tsx', source: source(directive, '', reason) },
    ]);
    expect(result.clientFileCount).toBe(2);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatch(/^src\/app\/bad\.tsx: /);
  });

  it('[Q4] a client file may not import server-only', () => {
    const text = source(directive, reason, "import 'server-only';");
    expect(checkClientBoundary('src/app/menu.tsx', text)).toHaveLength(1);
  });

  it('[Q4] a client file may not import from @/server/', () => {
    const text = source(
      directive,
      reason,
      "import { getSession } from '@/server/session';",
    );
    expect(checkClientBoundary('src/app/menu.tsx', text)).toHaveLength(1);
  });

  it('[R6] a client file may not reach src/server through a relative path', () => {
    const text = source(
      directive,
      reason,
      "import { connectDb } from '../../server/db';",
    );
    expect(checkClientBoundary('src/app/menu/menu.tsx', text)).toHaveLength(1);
  });

  it('[Q4] a relative import that stays outside src/server is allowed', () => {
    const text = source(directive, reason, "import { a } from '../lib/a';");
    expect(checkClientBoundary('src/app/menu.tsx', text)).toEqual([]);
  });

  it('[Q4] a server file may import server-only', () => {
    const text = source("import 'server-only';", 'export const a = 1;');
    expect(checkClientBoundary('src/server/db.ts', text)).toEqual([]);
  });
});
