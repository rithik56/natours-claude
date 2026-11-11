// U1 and U3 are enforced by stylelint, not by review, so the rules get tests of their own.
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

async function rulesBrokenBy(
  code: string,
  codeFilename: string,
): Promise<string[]> {
  const { results } = await stylelint.lint({
    code,
    codeFilename,
    configFile: 'stylelint.config.mjs',
  });
  const rules = (results[0]?.warnings ?? []).map((warning) => warning.rule);
  return [...new Set(rules)].sort();
}

const component = 'src/components/ui/example.module.css';

describe('stylelint: design token rules', () => {
  it('[U1] fails a raw hex colour outside tokens.css', async () => {
    const code = '@layer components {\n  .a {\n    color: #1f2b4d;\n  }\n}\n';
    expect(await rulesBrokenBy(code, component)).toEqual(['color-no-hex']);
  });

  it('[U1] fails a raw px value outside tokens.css', async () => {
    const code = '@layer components {\n  .a {\n    margin: 4px;\n  }\n}\n';
    expect(await rulesBrokenBy(code, component)).toEqual([
      'unit-disallowed-list',
    ]);
  });

  it('[U1] allows a hairline border written through its token', async () => {
    const code =
      '@layer components {\n  .a {\n    border: var(--border-width-hairline) solid var(--color-border);\n  }\n}\n';
    expect(await rulesBrokenBy(code, component)).toEqual([]);
  });

  it('[U1] lets tokens.css define raw hex and px values', async () => {
    const code =
      '@layer tokens {\n  :root {\n    --color-bg: #eef1f5;\n    --space-1: 4px;\n  }\n}\n';
    expect(await rulesBrokenBy(code, 'src/styles/tokens.css')).toEqual([]);
  });

  it('[U3] fails an id selector anywhere under src', async () => {
    const code = '@layer components {\n  #a {\n    color: inherit;\n  }\n}\n';
    expect(await rulesBrokenBy(code, 'src/app/example.module.css')).toEqual([
      'selector-max-id',
    ]);
  });

  it('[U3] fails !important anywhere under src', async () => {
    const code =
      '@layer components {\n  .a {\n    color: inherit !important;\n  }\n}\n';
    expect(await rulesBrokenBy(code, 'src/app/example.module.css')).toEqual([
      'declaration-no-important',
    ]);
  });

  it('[U3] fails a ui rule written outside a layer', async () => {
    const code = '.a {\n  color: inherit;\n}\n';
    expect(await rulesBrokenBy(code, component)).toEqual([
      'rule-nesting-at-rule-required-list',
    ]);
  });

  it('[U3] fails a ui rule written in a layer other than components', async () => {
    const code = '@layer base {\n  .a {\n    color: inherit;\n  }\n}\n';
    expect(await rulesBrokenBy(code, component)).toEqual([
      'layer-name-pattern',
    ]);
  });

  it('[U3] passes a ui rule inside @layer components', async () => {
    const code =
      '@layer components {\n  .a {\n    color: var(--color-text);\n  }\n}\n';
    expect(await rulesBrokenBy(code, component)).toEqual([]);
  });
});
