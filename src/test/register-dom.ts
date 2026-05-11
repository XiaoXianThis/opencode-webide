// MUST run before any module that touches `document` (notably
// @testing-library/dom, which binds `screen` to document.body at import time).
// This file is preloaded ahead of setup.ts via bunfig.toml.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (typeof globalThis.document === "undefined") {
  GlobalRegistrator.register({ url: "http://localhost/" });
}
