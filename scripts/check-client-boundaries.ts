// Stub so the RED tests fail on their assertions; the real check follows in the next commit.
export function checkClientBoundary(path: string, source: string): string[] {
  return path && source ? [] : [];
}

export function checkClientFiles(
  files: Array<{ path: string; source: string }>,
): {
  violations: string[];
  clientFileCount: number;
} {
  return { violations: files.length ? [] : [], clientFileCount: 0 };
}
