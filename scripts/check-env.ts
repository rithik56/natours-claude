import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { configKeys } from '../src/server/config-schema.ts';

// D4: .env.example lists exactly the keys the config schema knows.
// S18: a NEXT_PUBLIC_ name never says SECRET, KEY or PASSWORD, and a secret-named key has no value.

const ENV_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const PUBLIC_NAME = /NEXT_PUBLIC_[A-Za-z0-9_]+/g;
const PUBLIC_FORBIDDEN = /SECRET|KEY|PASSWORD/i;
const VALUE_FORBIDDEN = /SECRET|KEY|PASSWORD|TOKEN/i;

type SourceFile = { path: string; source: string };

type CheckEnvInput = {
  schemaKeys: readonly string[];
  envExample: string;
  sources: SourceFile[];
};

function parseExample(text: string): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const match = ENV_LINE.exec(line.trim());
    if (match) entries.push({ key: match[1] ?? '', value: match[2] ?? '' });
  }
  return entries;
}

function publicNames(text: string): string[] {
  return [...text.matchAll(PUBLIC_NAME)].map((match) => match[0]);
}

function isEmptyValue(value: string): boolean {
  const bare = value.trim();
  return bare === '' || bare === '""' || bare === "''";
}

/** Returns one message per violation. Messages name keys and never values. */
export function checkEnv({
  schemaKeys,
  envExample,
  sources,
}: CheckEnvInput): string[] {
  const violations: string[] = [];
  const entries = parseExample(envExample);
  const listed = new Set(entries.map((entry) => entry.key));

  for (const key of schemaKeys) {
    if (!listed.has(key)) {
      violations.push(
        `.env.example: ${key} is in the config schema but missing (D4)`,
      );
    }
  }
  for (const { key, value } of entries) {
    if (!schemaKeys.includes(key) && !key.startsWith('NEXT_PUBLIC_')) {
      violations.push(`.env.example: ${key} is not in the config schema (D4)`);
    }
    if (VALUE_FORBIDDEN.test(key) && !isEmptyValue(value)) {
      violations.push(`.env.example: ${key} must have an empty value (S18)`);
    }
  }

  const scanned: SourceFile[] = [
    { path: '.env.example', source: envExample },
    ...sources,
  ];
  for (const { path, source } of scanned) {
    for (const name of new Set(publicNames(source))) {
      if (PUBLIC_FORBIDDEN.test(name)) {
        violations.push(
          `${path}: ${name} would be sent to browsers, so its name must not contain SECRET, KEY or PASSWORD (S18)`,
        );
      }
    }
  }
  return violations;
}

function readSources(root: string): SourceFile[] {
  const files = readdirSync(join(root, 'src'), {
    recursive: true,
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
  files.push(join(root, 'next.config.ts'));
  return files.map((file) => ({
    path: file.slice(root.length + 1).replaceAll('\\', '/'),
    source: readFileSync(file, 'utf8'),
  }));
}

/** Runs checkEnv on this repository's .env.example and source files. */
export function checkRepository(
  root = join(import.meta.dirname, '..'),
): string[] {
  return checkEnv({
    schemaKeys: configKeys,
    envExample: readFileSync(join(root, '.env.example'), 'utf8'),
    sources: readSources(root),
  });
}

function main(): void {
  const violations = checkRepository();
  for (const violation of violations) process.stderr.write(`${violation}\n`);
  process.stdout.write(
    violations.length === 0
      ? 'check-env: ok\n'
      : `check-env: ${violations.length} violation(s)\n`,
  );
  if (violations.length > 0) process.exit(1);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
