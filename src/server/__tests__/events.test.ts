import { describe, it } from "bun:test";
import { expectServerTestPasses } from "./server-test-helpers";

describe("proxyEvents", () => {
  it("passes text/event-stream chunks through from upstream", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = {
        OPENCODE_URL: "http://127.0.0.1:1",
        basicAuthHeader: undefined,
      };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { proxyEvents } = await import("./src/server/events.ts");
      let requestedPath = "";
      const upstream = Bun.serve({
        port: 0,
        fetch(req) {
          requestedPath = new URL(req.url).pathname;
          const body = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode("data: one\n\n"));
              controller.enqueue(encoder.encode("data: two\n\n"));
              controller.close();
            },
          });
          return new Response(body, { headers: { "content-type": "text/event-stream" } });
        },
      });
      envState.OPENCODE_URL = upstream.url.origin;

      const response = await proxyEvents(new Request("http://bff.local/api/events"));
      const text = await Bun.readableStreamToText(response.body);

      if (response.status !== 200) throw new Error("unexpected status " + response.status);
      if (response.headers.get("content-type") !== "text/event-stream; charset=utf-8") {
        throw new Error("unexpected content-type " + response.headers.get("content-type"));
      }
      if (requestedPath !== "/global/event") throw new Error("unexpected path " + requestedPath);
      if (text !== "data: one\n\ndata: two\n\n") throw new Error("unexpected stream " + JSON.stringify(text));
      upstream.stop(true);
    `);
  });

  it("forwards the request abort signal to upstream cancellation", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = {
        OPENCODE_URL: "http://127.0.0.1:1",
        basicAuthHeader: undefined,
      };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { proxyEvents } = await import("./src/server/events.ts");
      let upstreamCancelled = false;
      let controllerRef;
      const upstream = Bun.serve({
        port: 0,
        fetch(req) {
          req.signal.addEventListener("abort", () => {
            upstreamCancelled = true;
            try { controllerRef?.close(); } catch {}
          });
          const body = new ReadableStream({
            start(controller) {
              controllerRef = controller;
              controller.enqueue(new TextEncoder().encode("data: open\n\n"));
            },
            cancel() {
              upstreamCancelled = true;
            },
          });
          return new Response(body, { headers: { "content-type": "text/event-stream" } });
        },
      });
      envState.OPENCODE_URL = upstream.url.origin;
      const clientController = new AbortController();

      const response = await proxyEvents(
        new Request("http://bff.local/api/events", { signal: clientController.signal }),
      );
      const reader = response.body.getReader();
      const first = await reader.read();
      if (new TextDecoder().decode(first.value) !== "data: open\n\n") throw new Error("missing first chunk");

      clientController.abort();
      await reader.cancel();
      await Bun.sleep(0);

      if (!upstreamCancelled) throw new Error("upstream was not cancelled");
      upstream.stop(true);
    `);
  });
});