import { afterEach, describe, expect, it } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useOnlineStatus } from "../useOnlineStatus";

const originalNavigator = window.navigator;

afterEach(() => {
  Object.defineProperty(window, "navigator", { value: originalNavigator, configurable: true });
});

describe("useOnlineStatus", () => {
  it("tracks browser online state", () => {
    Object.defineProperty(window, "navigator", { value: { ...originalNavigator, onLine: false }, configurable: true });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });
});
