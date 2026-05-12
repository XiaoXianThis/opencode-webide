// `register-dom.ts` (preloaded before this file) has already attached
// happy-dom to globalThis, so it is now safe to import @testing-library.
import { afterEach, beforeEach, expect } from "bun:test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { restoreNativeWebGlobals } from "./register-dom";

function ensureBody(): void {
  if (!globalThis.document.body) {
    globalThis.document.appendChild(globalThis.document.createElement("body"));
  }
}

// Tell React 19 we're in an act() environment; combined with user-event v14
// (which auto-wraps interactions) this silences the spurious act warnings
// that appear when React re-renders after async state updates.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Extend bun:test's `expect` with @testing-library/jest-dom matchers.
expect.extend(matchers as never);

beforeEach(() => {
  ensureBody();
  restoreNativeWebGlobals();
});

afterEach(() => {
  cleanup();
  ensureBody();
  restoreNativeWebGlobals();
});