import { describe, it, expect } from "bun:test";
import { cn, formatNewSessionTitle, formatRelativeTime, formatSessionTitle } from "../utils";

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
  const ms = (s: number) => NOW - s * 1000;

  it("returns empty for undefined", () => {
    expect(formatRelativeTime(undefined)).toBe("");
  });

  it.each([
    [sec(5), /^\d+s$/],
    [ms(5), /^\d+s$/],
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

describe("formatNewSessionTitle", () => {
  it("uses local date and minute precision", () => {
    expect(formatNewSessionTitle(new Date(2026, 4, 12, 10, 3, 59))).toBe(
      "新会话-2026-05-12-10:03",
    );
  });
});

describe("formatSessionTitle", () => {
  it("localizes legacy New session ISO titles", () => {
    const date = new Date(2026, 3, 15, 1, 15, 31, 501);
    expect(formatSessionTitle(`New session - ${date.toISOString()}`)).toBe(
      formatNewSessionTitle(date),
    );
  });

  it("keeps custom titles unchanged", () => {
    expect(formatSessionTitle("自定义标题")).toBe("自定义标题");
  });
});
