import { env } from "./src/server/env";
import { proxyApi } from "./src/server/proxy";
import { proxyEvents } from "./src/server/events";
import { authStatus, isAuthEnabled, login, logout, validateAuth } from "./src/server/auth";

const productionIndex = process.env.NODE_ENV === "production" ? Bun.file("dist/public/index.html") : null;
const developmentIndex = process.env.NODE_ENV === "production" ? null : (await import("./src/client/index.html")).default;

if (process.env.NODE_ENV === "production" && !isAuthEnabled()) {
  throw new Error("WEBIDE_TOKEN must be set in production");
}

async function staticResponse(pathname: string): Promise<Response> {
  if (!productionIndex) return developmentIndex;
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(`dist/public${relativePath}`);
  if (await file.exists()) return new Response(file);
  return new Response(productionIndex);
}

function protect(req: Request): Response | undefined {
  return validateAuth(req);
}

const server = Bun.serve({
  port: env.PORT,
  hostname: env.HOST,
  development: process.env.NODE_ENV !== "production",
  // SSE streams must outlive Bun's default 10s idle timeout. 0 disables it.
  idleTimeout: 0,
  routes: {
    // SSE must be matched before the generic /api/* wildcard.
    "/api/auth/status": (req) => authStatus(req),
    "/api/auth/login": (req) => login(req),
    "/api/auth/logout": (req) => protect(req) ?? logout(),
    "/api/events": (req) => protect(req) ?? proxyEvents(req),
    "/api/*": (req) => protect(req) ?? proxyApi(req),
    "/healthz": () => new Response("ok"),
    "/": () => staticResponse("/"),
    "/*": (req) => staticResponse(new URL(req.url).pathname),
  },
  error(err) {
    console.error("[server] error", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`opencode-webide listening on http://${server.hostname}:${server.port}`);
console.log(`proxying /api/* -> ${env.OPENCODE_URL}`);
if (!isAuthEnabled()) {
  console.log("[auth] WEBIDE_TOKEN not set; WebIDE token auth disabled");
}
if (!env.basicAuthHeader) {
  console.log("[auth] OPENCODE_PASSWORD not set; forwarding without Authorization header");
}
