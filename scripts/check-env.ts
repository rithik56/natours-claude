// Skeleton so the RED tests fail on their assertions. The rules arrive in the next commit.
type CheckEnvInput = {
  schemaKeys: readonly string[];
  envExample: string;
  sources: Array<{ path: string; source: string }>;
};

export function checkEnv(input: CheckEnvInput): string[] {
  return input.sources.length < 0 ? ['unreachable'] : [];
}

export function checkRepository(): string[] {
  return [];
}
