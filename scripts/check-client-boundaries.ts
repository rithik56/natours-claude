import { readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { pathToFileURL } from 'node:url';

// R2: every client file declares why it is a client file, on the very next line.
// Q4, R6: a client file never imports server-only code.

const DIRECTIVE = /^\s*(['"])use client\1\s*;?\s*$/;
const CLIENT_COMMENT = /^\/\/ client: +\S/;
// Three small patterns cover: from 'x', import 'x' / import('x'), and require('x').
const IMPORT_SPECIFIERS = [
  /\bfrom\s+(['"])([^'"]+)\1/g,
  /\bimport\s*\(?\s*(['"])([^'"]+)\1/g,
  /\brequire\s*\(\s*(['"])([^'"]+)\1/g,
];

function hasDirective(source: string): boolean {
  return source.split(/\r?\n/).some((line) => DIRECTIVE.test(line));
}

function reachesServerCode(path: string, specifier: string): boolean {
  if (specifier === 'server-only') return true;
  if (specifier === '@/server' || specifier.startsWith('@/server/')) {
    return true;
  }
  if (specifier.startsWith('.')) {
    const resolved = posix.normalize(
      posix.join(posix.dirname(path.replaceAll('\\', '/')), specifier),
    );
    return resolved === 'src/server' || resolved.startsWith('src/server/');
  }
  return false;
}

/** Returns the violations for one file. A file without the directive has none. */
export function checkClientBoundary(path: string, source: string): string[] {
  const lines = source.split(/\r?\n/);
  const directiveIndex = lines.findIndex((line) => DIRECTIVE.test(line));
  if (directiveIndex === -1) return [];

  const firstIndex = lines.findIndex((line) => line.trim() !== '');
  if (directiveIndex !== firstIndex) {
    return ["'use client' must be on the first non-empty line of the file"];
  }

  const violations: string[] = [];
  const reasonLine = lines[directiveIndex + 1] ?? '';
  if (!CLIENT_COMMENT.test(reasonLine)) {
    violations.push(
      "the line after 'use client' must be '// client: <reason>' with a non-empty reason",
    );
  }

  for (const pattern of IMPORT_SPECIFIERS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[2] ?? '';
      if (reachesServerCode(path, specifier)) {
        violations.push(
          `a client file must not import server code ('${specifier}')`,
        );
      }
    }
  }
  return violations;
}

/** Checks every file and counts the client files among them. */
export function checkClientFiles(
  files: Array<{ path: string; source: string }>,
): { violations: string[]; clientFileCount: number } {
  const violations: string[] = [];
  let clientFileCount = 0;
  for (const file of files) {
    if (hasDirective(file.source)) clientFileCount += 1;
    for (const message of checkClientBoundary(file.path, file.source)) {
      violations.push(`${file.path}: ${message}`);
    }
  }
  return { violations, clientFileCount };
}

function readSourceFiles(
  root: string,
): Array<{ path: string; source: string }> {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .map((entry) => `${root}/${entry.replaceAll('\\', '/')}`)
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => ({ path, source: readFileSync(path, 'utf8') }));
}

function main(): void {
  const { violations, clientFileCount } = checkClientFiles(
    readSourceFiles('src'),
  );
  for (const violation of violations) process.stderr.write(`${violation}\n`);
  process.stdout.write(`Checked ${clientFileCount} client files.\n`);
  if (violations.length > 0) process.exit(1);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
