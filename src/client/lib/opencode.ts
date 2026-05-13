import { createOpencodeClient } from "@opencode-ai/sdk/client";
import { authFetch } from "./auth";

/**
 * Browser-side opencode client. All requests are routed through the Bun BFF
 * at /api, which injects Basic Auth and forwards to opencode serve.
 *
 * The SDK's generated `RequestResult` type is hard-coded to the "fields"
 * response style, so we keep that default and unwrap `.data` at call sites.
 * `throwOnError: true` guarantees the success branch always has `data`.
 */
export const oc = createOpencodeClient({
  baseUrl: typeof window === "undefined" ? "/api" : `${window.location.origin}/api`,
  fetch: authFetch,
  throwOnError: true,
});

export type OpencodeClient = typeof oc;
