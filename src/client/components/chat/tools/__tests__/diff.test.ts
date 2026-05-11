import { describe, it, expect } from "bun:test";
import { diffLines, countDiff } from "../diff";

describe("diffLines", () => {
  it("returns equal ops when both inputs match", () => {
    const ops = diffLines("a\nb\nc", "a\nb\nc");
    expect(ops.every((o) => o.type === "equal")).toBe(true);
    expect(ops.map((o) => o.line)).toEqual(["a", "b", "c"]);
  });

  it("flags pure additions", () => {
    const ops = diffLines("", "x\ny");
    expect(ops.map((o) => `${o.type}:${o.line}`)).toEqual(["add:x", "add:y"]);
  });

  it("flags pure removals", () => {
    const ops = diffLines("x\ny", "");
    expect(ops.map((o) => `${o.type}:${o.line}`)).toEqual(["remove:x", "remove:y"]);
  });

  it("captures middle modifications", () => {
    const ops = diffLines("a\nb\nc", "a\nB\nc");
    expect(ops.map((o) => `${o.type}:${o.line}`)).toEqual([
      "equal:a",
      "remove:b",
      "add:B",
      "equal:c",
    ]);
  });

  it("handles a more complex hunk", () => {
    const ops = diffLines("foo\nbar\nbaz", "foo\nqux\nbar");
    // LCS keeps foo+bar, drops baz, inserts qux between.
    const seq = ops.map((o) => `${o.type}:${o.line}`);
    expect(seq).toContain("equal:foo");
    expect(seq).toContain("equal:bar");
    expect(seq).toContain("add:qux");
    expect(seq).toContain("remove:baz");
  });

  it("countDiff sums add/remove counts", () => {
    const ops = diffLines("a\nb\nc", "a\nB\nC\nD");
    const { added, removed } = countDiff(ops);
    expect(added).toBe(3);
    expect(removed).toBe(2);
  });

  it("treats empty string as zero lines (not a single empty line)", () => {
    const ops = diffLines("", "");
    expect(ops).toEqual([]);
  });
});
