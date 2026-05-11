// Line-level LCS diff. Small, dependency-free, suitable for the modest
// edit hunks emitted by the `edit` tool.

export type DiffOp =
  | { type: "equal"; line: string; oldNo: number; newNo: number }
  | { type: "remove"; line: string; oldNo: number }
  | { type: "add"; line: string; newNo: number };

function splitLines(s: string): string[] {
  if (s === "") return [];
  // Preserve trailing-newline awareness by NOT auto-trimming an empty last line.
  return s.split("\n");
}

/**
 * Diff two blocks of text line-by-line using LCS backtracking.
 * Returns a list of operations in original order. Lines numbers are 1-based.
 */
export function diffLines(oldText: string, newText: string): DiffOp[] {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const m = a.length;
  const n = b.length;

  // dp[i][j] = LCS length of a[i..] vs b[j..].
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i]![j] = (dp[i + 1]![j + 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", line: a[i]!, oldNo: i + 1, newNo: j + 1 });
      i++;
      j++;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      ops.push({ type: "remove", line: a[i]!, oldNo: i + 1 });
      i++;
    } else {
      ops.push({ type: "add", line: b[j]!, newNo: j + 1 });
      j++;
    }
  }
  while (i < m) {
    ops.push({ type: "remove", line: a[i]!, oldNo: i + 1 });
    i++;
  }
  while (j < n) {
    ops.push({ type: "add", line: b[j]!, newNo: j + 1 });
    j++;
  }
  return ops;
}

export function countDiff(ops: DiffOp[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const op of ops) {
    if (op.type === "add") added++;
    else if (op.type === "remove") removed++;
  }
  return { added, removed };
}
