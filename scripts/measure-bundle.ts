// RED stub for plan 01-13: every export answers wrongly so the tests fail on their assertions.
// The next commit replaces this file with the implementation.

export function scriptTransferSize(lhr: unknown): number {
  void lhr;
  return -1;
}

export function median(values: number[]): number {
  void values;
  return -1;
}

export function checkBudget(
  measured: number,
  baseline: { floorBytes: number; budgetDeltaBytes: number },
): { ok: boolean; limit: number; measured: number } {
  void baseline;
  return { ok: false, limit: -1, measured: measured - measured };
}
