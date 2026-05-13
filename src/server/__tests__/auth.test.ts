import { describe, it } from "bun:test";
import { expectServerTestPasses } from "./server-test-helpers";

describe("BFF auth", () => {
  it("allows requests when WEBIDE_TOKEN is not configured", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = { WEBIDE_TOKEN: "" };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("./src/server/env.ts", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { validateAuth } = await import("./src/server/auth.ts");
      const failure = validateAuth(new Request("http://bff.local/api/session"));
      if (failure !== undefined) throw new Error("auth should be disabled");
    `);
  });

  it("sets session and csrf cookies after login", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = { WEBIDE_TOKEN: "secret" };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("./src/server/env.ts", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { login } = await import("./src/server/auth.ts");
      const response = await login(new Request("http://bff.local/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "secret" }),
      }));
      const body = await response.json();
      const cookie = response.headers.get("set-cookie") || "";

      if (response.status !== 200) throw new Error("unexpected status " + response.status);
      if (body.csrfToken.length === 0) throw new Error("missing csrf token");
      if (!cookie.includes("webide_session=")) throw new Error("missing session cookie " + cookie);
      if (!cookie.includes("webide_csrf=")) throw new Error("missing csrf cookie " + cookie);
      if (!cookie.includes("HttpOnly")) throw new Error("session cookie must be httponly " + cookie);
      if (cookie.includes("secret")) throw new Error("raw token leaked into cookie");
    `);
  });

  it("rejects missing auth cookie and permits valid cookie", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = { WEBIDE_TOKEN: "secret" };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("./src/server/env.ts", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { login, validateAuth } = await import("./src/server/auth.ts");

      const unauthorized = validateAuth(new Request("http://bff.local/api/session"));
      if (!unauthorized || unauthorized.status !== 401) throw new Error("expected 401");

      const loginResponse = await login(new Request("http://bff.local/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "secret" }),
      }));
      const cookie = loginResponse.headers.get("set-cookie") || "";
      const sessionPair = cookie.match(/webide_session=[^;,]+/)?.[0];
      if (!sessionPair) throw new Error("missing session pair " + cookie);

      const valid = validateAuth(new Request("http://bff.local/api/session", {
        headers: { cookie: sessionPair },
      }));
      if (valid !== undefined) throw new Error("expected valid auth");
    `);
  });

  it("rejects mutating requests without matching csrf token", async () => {
    await expectServerTestPasses(String.raw`
      import { mock } from "bun:test";

      const envState = { WEBIDE_TOKEN: "secret" };
      mock.module("./src/server/env", () => ({ env: envState }));
      mock.module("./src/server/env.ts", () => ({ env: envState }));
      mock.module("../env", () => ({ env: envState }));
      mock.module("./env", () => ({ env: envState }));

      const { login, validateAuth } = await import("./src/server/auth.ts");
      const loginResponse = await login(new Request("http://bff.local/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "secret" }),
      }));
      const body = await loginResponse.json();
      const cookie = loginResponse.headers.get("set-cookie") || "";
      const sessionPair = cookie.match(/webide_session=[^;,]+/)?.[0];
      const csrfPair = cookie.match(/webide_csrf=[^;,]+/)?.[0];
      if (!sessionPair || !csrfPair) throw new Error("missing cookie pair " + cookie);

      const denied = validateAuth(new Request("http://bff.local/api/session/1", {
        method: "DELETE",
        headers: { cookie: sessionPair + "; " + csrfPair },
      }));
      if (!denied || denied.status !== 403) throw new Error("expected 403");

      const allowed = validateAuth(new Request("http://bff.local/api/session/1", {
        method: "DELETE",
        headers: {
          cookie: sessionPair + "; " + csrfPair,
          "x-csrf-token": body.csrfToken,
        },
      }));
      if (allowed !== undefined) throw new Error("expected csrf pass");
    `);
  });
});
