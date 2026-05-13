import { describe, it, expect, beforeEach, mock } from "bun:test";
import { authFetch, getCsrfToken, loginUrl, redirectAfterLogin, redirectToLogin, setCsrfToken } from "../auth";

beforeEach(() => {
  setCsrfToken(null);
  document.cookie = "webide_csrf=; Max-Age=0; Path=/";
  window.history.replaceState(null, "", "/chat?x=1");
});

describe("auth helpers", () => {
  it("builds a login URL with the return path", () => {
    expect(loginUrl()).toBe("/login?returnTo=%2Fchat%3Fx%3D1");
  });

  it("redirects to login and back after login", () => {
    redirectToLogin();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toBe("?returnTo=%2Fchat%3Fx%3D1");

    redirectAfterLogin();
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?x=1");
  });

  it("reads csrf from memory or cookie", () => {
    document.cookie = "webide_csrf=cookie-token; Path=/";
    expect(getCsrfToken()).toBe("cookie-token");
    setCsrfToken("memory-token");
    expect(getCsrfToken()).toBe("memory-token");
  });

  it("adds csrf to mutating requests and redirects on 401", async () => {
    setCsrfToken("csrf-1");
    const fetchMock = mock(async (req: Request) => {
      expect(req.headers.get("x-csrf-token")).toBe("csrf-1");
      return Response.json({ error: "unauthorized" }, { status: 401 });
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const response = await authFetch(new Request("http://localhost/api/session/1", { method: "DELETE" }));
      expect(response.status).toBe(401);
      expect(window.location.pathname).toBe("/login");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
