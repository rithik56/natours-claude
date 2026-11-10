import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import security from 'eslint-plugin-security';

const zodPath = {
  name: 'zod',
  message: 'Import z from @/server/validation',
};

const nextCachePath = {
  name: 'next/cache',
  message: 'Use the cache adapter in src/server/adapters',
};

// plan.md 3.2 rule 1: only a module's own service and dto import its model.
const modelPattern = {
  group: ['@/server/modules/*/model', '**/modules/*/model', '../*/model'],
  message:
    "Only a module's own service and dto import its model (plan.md §3.2)",
  allowTypeImports: true,
};

function restrictImports(paths) {
  return ['error', { paths, patterns: [modelPattern] }];
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  {
    rules: {
      // ADR 0009: the rule warns on every variable-key access, which
      // noUncheckedIndexedAccess code is full of, and that breaks --max-warnings=0.
      'security/detect-object-injection': 'off',
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Not *.cjs: the react plugin is only registered for these files.
    files: ['**/*.{js,jsx,mjs,ts,mts,tsx}'],
    rules: {
      // S21: user content is JSX text, never HTML.
      'react/no-danger': 'error',
    },
  },
  {
    // lighthouserc.cjs is CommonJS because Lighthouse CI loads it with require().
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // The config reads one repository file it chose itself (ADR 0009).
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictImports([zodPath, nextCachePath]),
    },
  },
  {
    files: ['src/server/config-schema.ts', 'src/server/validation.ts'],
    rules: {
      'no-restricted-imports': restrictImports([nextCachePath]),
    },
  },
  {
    files: ['src/server/adapters/real-cache.ts'],
    rules: {
      'no-restricted-imports': restrictImports([zodPath]),
    },
  },
  {
    // Factories and the Phase 4 seed build documents directly (DEL-26, QA-17).
    files: ['test/**', 'scripts/**'],
    rules: {
      'no-restricted-imports': 'off',
      // Build-time tools and tests read repository files they chose themselves (ADR 0009).
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'dist/**',
    '.lighthouseci/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
