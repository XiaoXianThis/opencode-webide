// MUST run before any module that touches `document` (notably
// @testing-library/dom, which binds `screen` to document.body at import time).
// This file is preloaded ahead of setup.ts via bunfig.toml.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

export const nativeWebGlobals = {
  Request: globalThis.Request,
  Response: globalThis.Response,
  Headers: globalThis.Headers,
  AbortController: globalThis.AbortController,
  AbortSignal: globalThis.AbortSignal,
  ReadableStream: globalThis.ReadableStream,
  TransformStream: globalThis.TransformStream,
  WritableStream: globalThis.WritableStream,
  fetch: globalThis.fetch,
};

export function restoreNativeWebGlobals(): void {
  Object.assign(globalThis, nativeWebGlobals);
}

if (typeof globalThis.document === "undefined") {
  GlobalRegistrator.register({ url: "http://localhost/" });
}

restoreNativeWebGlobals();