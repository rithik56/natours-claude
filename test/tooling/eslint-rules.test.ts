import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Probe sources are single-line strings joined with newlines, so the conventions check
// never reads them as commented-out code.
function lines(...parts: string[]): string {
  return parts.join('\n') + '\n';
}

const eslint = new ESLint({ cwd: process.cwd() });

async function messagesFor(source: string, filePath: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result?.messages ?? [];
}

function forRule(
  messages: Awaited<ReturnType<typeof messagesFor>>,
  ruleId: string,
) {
  return messages.filter((message) => message.ruleId === ruleId);
}

describe('ESLint rules', () => {
  it('[S21] react/no-danger is an error, even with an empty string', async () => {
    const source = lines(
      'export function Probe() {',
      "  return <div dangerouslySetInnerHTML={{ __html: '' }} />;",
      '}',
    );
    const found = forRule(
      await messagesFor(source, 'src/app/probe.tsx'),
      'react/no-danger',
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe(2);
  });

  it('[Q5] no-console is an error in server code', async () => {
    const source = lines("console.log('hello');", 'export const probe = 1;');
    const found = forRule(
      await messagesFor(source, 'src/server/probe.ts'),
      'no-console',
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe(2);
  });

  it('[Q4] importing another module model from src is restricted', async () => {
    const source = lines(
      "import { UserModel } from '@/server/modules/users/model';",
      'export const probe = UserModel;',
    );
    const found = forRule(
      await messagesFor(source, 'src/server/modules/tours/service.ts'),
      'no-restricted-imports',
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe(2);
  });

  it('[Q4] a test helper may import a model', async () => {
    const source = lines(
      "import { UserModel } from '@/server/modules/users/model';",
      'export const probe = UserModel;',
    );
    const found = forRule(
      await messagesFor(source, 'test/helpers/factory.ts'),
      'no-restricted-imports',
    );
    expect(found).toHaveLength(0);
  });

  it('[Q4] a type-only import of a model is allowed', async () => {
    const source = lines(
      "import type { UserDoc } from '@/server/modules/users/model';",
      'export type Probe = UserDoc;',
    );
    const found = forRule(
      await messagesFor(source, 'src/server/modules/tours/service.ts'),
      'no-restricted-imports',
    );
    expect(found).toHaveLength(0);
  });

  it('[Q4] a module service may import its own model', async () => {
    const source = lines(
      "import { UserModel } from './model';",
      'export const probe = UserModel;',
    );
    const found = forRule(
      await messagesFor(source, 'src/server/modules/users/service.ts'),
      'no-restricted-imports',
    );
    expect(found).toHaveLength(0);
  });

  it('[Q2] zod is restricted outside the validation files', async () => {
    const source = lines(
      "import { z } from 'zod';",
      'export const probe = z.string();',
    );
    const found = forRule(
      await messagesFor(source, 'src/server/probe.ts'),
      'no-restricted-imports',
    );
    expect(found).toHaveLength(1);
  });

  it('[Q2] config-schema may import zod', async () => {
    const source = lines(
      "import { z } from 'zod';",
      'export const probe = z.string();',
    );
    const found = forRule(
      await messagesFor(source, 'src/server/config-schema.ts'),
      'no-restricted-imports',
    );
    expect(found).toHaveLength(0);
  });

  it('[Q2] next/cache is restricted outside the real cache adapter', async () => {
    const source = lines(
      "import { revalidateTag } from 'next/cache';",
      'export const probe = revalidateTag;',
    );
    const restricted = forRule(
      await messagesFor(source, 'src/server/probe.ts'),
      'no-restricted-imports',
    );
    const allowed = forRule(
      await messagesFor(source, 'src/server/adapters/real-cache.ts'),
      'no-restricted-imports',
    );
    expect(restricted).toHaveLength(1);
    expect(allowed).toHaveLength(0);
  });

  it('[Q2] a variable-key access gives no security message', async () => {
    const source = lines(
      'export function probe(table: Record<string, number>, key: string) {',
      '  return table[key];',
      '}',
    );
    const found = (await messagesFor(source, 'src/server/probe.ts')).filter(
      (message) => message.ruleId?.startsWith('security/'),
    );
    expect(found).toHaveLength(0);
  });
});
