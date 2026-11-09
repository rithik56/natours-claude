// Stub so the RED tests fail on their assertions; the real check follows in the next commit.
export function checkConventions(
  files: Array<{ path: string; source: string }>,
): string[] {
  return files.length ? [] : [];
}
