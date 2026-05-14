import { describe, expect, it, mock } from "bun:test";

const { registerServiceWorker } = await import("../register");

describe("registerServiceWorker", () => {
  it("does not register outside production", () => {
    const addEventListener = mock(() => {});
    const original = window.addEventListener;
    window.addEventListener = addEventListener as typeof window.addEventListener;

    registerServiceWorker();

    expect(addEventListener).not.toHaveBeenCalled();
    window.addEventListener = original;
  });
});
