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
      // S21: user content is JSX text, never HTML.
      'react/no-danger': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
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
