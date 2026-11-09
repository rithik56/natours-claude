import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Q3 file names and action names, Q5 comments, R6 server-only first import.

const KEBAB_WORD = /^[a-z0-9]+$/;
const GROUP_FOLDER = /^\(([a-z0-9-]+)\)$/;
const PARAM_FOLDER = /^\[(?:\.\.\.)?[A-Za-z][A-Za-z0-9]*\]$/;
const COMPOUND_EXTENSIONS = ['.d.ts', '.module.css', '.test.tsx', '.test.ts'];
const ISSUE_REFERENCE = /\(#\d+\)|github\.com\/\S+\/issues\/\d+/;
const CODE_START =
  /^(?:import |export |const |let |var |return |await |if \(|for \()/;
const COMMENT_EXEMPT = /^(?:client:|eslint-|@ts-)/;
const FIRST_IMPORT = /^[ \t]*import\b[^'"]*?(['"])([^'"]+)\1/m;
const EXPORTED_NAME =
  /\bexport\s+(?:async\s+function\s+|function\s+|const\s+|let\s+|var\s+)(\w+)/g;

function isKebab(name: string): boolean {
  return name.split('-').every((word) => KEBAB_WORD.test(word));
}

function isAllowedFolder(folder: string): boolean {
  if (isKebab(folder) || PARAM_FOLDER.test(folder)) return true;
  const group = GROUP_FOLDER.exec(folder)?.[1];
  return group !== undefined && isKebab(group);
}

function stripExtension(fileName: string): string {
  const compound = COMPOUND_EXTENSIONS.find((ext) => fileName.endsWith(ext));
  if (compound) return fileName.slice(0, -compound.length);
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? fileName : fileName.slice(0, dot);
}

function checkFileName(path: string): string[] {
  const parts = path.replaceAll('\\', '/').split('/');
  const fileName = parts.pop() ?? '';
  const violations: string[] = [];
  for (const folder of parts) {
    if (!isAllowedFolder(folder)) {
      violations.push(`folder '${folder}' is not kebab-case (Q3)`);
    }
  }
  const stem = stripExtension(fileName);
  if (!isKebab(stem)) {
    violations.push(`file name '${fileName}' is not kebab-case (Q3)`);
  }
  return violations;
}

function checkComments(source: string): string[] {
  const violations: string[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const isLineComment = line.startsWith('//');
    const isBlockComment = /^(?:\/\*|\*(?:\s|$|\/))/.test(line);
    if (!isLineComment && !isBlockComment) return;
    const where = `line ${index + 1}`;
    if (/\b(?:TODO|FIXME)\b/.test(line) && !ISSUE_REFERENCE.test(line)) {
      violations.push(`${where}: TODO or FIXME needs an issue link (Q5)`);
    }
    if (isLineComment) {
      const body = line.replace(/^\/\/\s?/, '');
      if (
        !COMMENT_EXEMPT.test(body) &&
        (CODE_START.test(body) || body.endsWith(';'))
      ) {
        violations.push(`${where}: commented-out code (Q5)`);
      }
    }
  });
  return violations;
}

function checkActionNames(path: string, source: string): string[] {
  if (path.split('/').pop() !== 'actions.ts') return [];
  const violations: string[] = [];
  for (const match of source.matchAll(EXPORTED_NAME)) {
    const name = match[1] ?? '';
    if (!name.endsWith('Action')) {
      violations.push(`export '${name}' must end in Action (Q3)`);
    }
  }
  return violations;
}

function checkServerOnly(path: string, source: string): string[] {
  if (!path.startsWith('src/server/') || !path.endsWith('.ts')) return [];
  if (path === 'src/server/config-schema.ts') return [];
  const specifier = FIRST_IMPORT.exec(source)?.[2];
  if (specifier === 'server-only') return [];
  return ["the first import must be import 'server-only' (R6)"];
}

/** Returns one message per violation, each starting with the file path. */
export function checkConventions(
  files: Array<{ path: string; source: string }>,
): string[] {
  const violations: string[] = [];
  for (const { path, source } of files) {
    const normalised = path.replaceAll('\\', '/');
    const found = [
      ...checkFileName(normalised),
      ...checkComments(source),
      ...checkActionNames(normalised, source),
      ...checkServerOnly(normalised, source),
    ];
    for (const message of found) violations.push(`${normalised}: ${message}`);
  }
  return violations;
}

function readSourceFiles(): Array<{ path: string; source: string }> {
  return ['src', 'scripts', 'test'].flatMap((root) =>
    readdirSync(root, { recursive: true, encoding: 'utf8' })
      .map((entry) => `${root}/${entry.replaceAll('\\', '/')}`)
      .filter((path) => /\.(?:tsx?|mts|css)$/.test(path))
      .map((path) => ({ path, source: readFileSync(path, 'utf8') })),
  );
}

function main(): void {
  const files = readSourceFiles();
  const violations = checkConventions(files);
  for (const violation of violations) process.stderr.write(`${violation}\n`);
  process.stdout.write(`Checked ${files.length} files.\n`);
  if (violations.length > 0) process.exit(1);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
