import { describe, it } from "bun:test";
import { expectServerTestPasses } from "./server-test-helpers";

describe("proxyApi", () => {
  it("rewrites /api URLs, injects Basic Auth, and passes JSON through", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = {
        OPENCODE_URL: "http://127.0.0.1:1",
        basicAuthHeader: undefined,
      };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { proxyApi } = await import("./src/server/proxy.ts");
      const seen = [];
      const upstream = Bun.serve({
        port: 0,
        async fetch(req) {
          const url = new URL(req.url);
          seen.push({
            pathname: url.pathname,
            search: url.search,
            authorization: req.headers.get("authorization"),
            method: req.method,
            body: await req.json(),
          });
          return Response.json({ ok: true, nested: { value: 1 } }, { status: 201 });
        },
      });
      envState.OPENCODE_URL = upstream.url.origin;
      envState.basicAuthHeader = "Basic " + Buffer.from("alice:secret").toString("base64");

      const response = await proxyApi(
        new Request("http://bff.local/api/foo?x=1", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer client" },
          body: JSON.stringify({ hello: "world" }),
        }),
      );

      if (response.status !== 201) throw new Error("unexpected status " + response.status);
      const body = await response.json();
      if (JSON.stringify(body) !== JSON.stringify({ ok: true, nested: { value: 1 } })) {
        throw new Error("unexpected body " + JSON.stringify(body));
      }
      const expected = [{
        pathname: "/foo",
        search: "?x=1",
        authorization: "Basic " + Buffer.from("alice:secret").toString("base64"),
        method: "POST",
        body: { hello: "world" },
      }];
      if (JSON.stringify(seen) !== JSON.stringify(expected)) {
        throw new Error("unexpected upstream request " + JSON.stringify(seen));
      }
      upstream.stop(true);
    `);
  });

  it("returns a 502 JSON response when fetch cannot reach upstream", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const closed = Bun.serve({ port: 0, fetch() { return new Response("unreachable"); } });
      const envState = {
        OPENCODE_URL: closed.url.origin,
        basicAuthHeader: undefined,
      };
      closed.stop(true);
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { proxyApi } = await import("./src/server/proxy.ts");
      const response = await proxyApi(new Request("http://bff.local/api/fail?x=1"));
      const body = await response.json();

      if (response.status !== 502) throw new Error("unexpected status " + response.status);
      if (!String(response.headers.get("content-type")).includes("application/json")) {
        throw new Error("unexpected content-type " + response.headers.get("content-type"));
      }
      if (body.error !== "upstream_unreachable") throw new Error("unexpected error " + JSON.stringify(body));
      if (body.upstream !== envState.OPENCODE_URL + "/fail?x=1") {
        throw new Error("unexpected upstream " + body.upstream);
      }
      if (typeof body.message !== "string") throw new Error("missing message");
    `);
  });
});