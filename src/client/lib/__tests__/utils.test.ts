import { describe, it, expect } from "bun:test";
import { cn, formatRelativeTime } from "../utils";

describe("cn", () => {
  it("merges plain class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false && "x", undefined, null, "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes via tailwind-merge", () => {
    // `px-2` should win because it appears later
    expect(cn("px-1 py-1", "px-2")).toBe("py-1 px-2");
  });
});

describe("formatRelativeTime", () => {
  const NOW = 1_730_000_000_000;
  const sec = (s: number) => (NOW - s * 1000) / 1000;

  it("returns empty for undefined", () => {
    expect(formatRelativeTime(undefined)).toBe("");
  });

  it.each([
    [sec(5), /^\d+s$/],
    [sec(120), /^\d+m$/],
    [sec(3 * 3600), /^\d+h$/],
    [sec(2 * 86400), /^\d+d$/],
  ])("formats %p as %p", (input, pattern) => {
    const orig = Date.now;
    Date.now = () => NOW;
    try {
      expect(formatRelativeTime(input)).toMatch(pattern);
    } finally {
      Date.now = orig;
    }
  });
});
