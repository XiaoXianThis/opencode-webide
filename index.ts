import { env } from "./src/server/env";
import { proxyApi } from "./src/server/proxy";
import { proxyEvents } from "./src/server/events";
import { authStatus, isAuthEnabled, login, logout, validateAuth } from "./src/server/auth";

const isProduction = process.env.NODE_ENV === "production";
const productionIndex = isProduction ? Bun.file("dist/public/index.html") : null;

if (isProduction && !isAuthEnabled()) {
  throw new Error("WEBIDE_TOKEN must be set in production");
}

async function staticResponse(pathname: string): Promise<Response> {
  if (!productionIndex) throw new Error("Static responses are only available in production");
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(`dist/public${relativePath}`);
  if (await file.exists()) return new Response(file);
  return new Response(productionIndex);
}

function protect(req: Request): Response | undefined {
  return validateAuth(req);
}

const apiRoutes = {
  // SSE must be matched before the generic /api/* wildcard.
  "/api/auth/status": (req: Request) => authStatus(req),
  "/api/auth/login": (req: Request) => login(req),
  "/api/auth/logout": (req: Request) => protect(req) ?? logout(),
  "/api/events": (req: Request) => protect(req) ?? proxyEvents(req),
  "/api/*": (req: Request) => protect(req) ?? proxyApi(req),
  "/healthz": () => new Response("ok"),
};

const routes = isProduction
  ? {
      ...apiRoutes,
      "/": () => staticResponse("/"),
      "/*": (req: Request) => staticResponse(new URL(req.url).pathname),
    }
  : {
      ...apiRoutes,
      "/": (await import("./src/client/index.html")).default,
      "/*": (await import("./src/client/index.html")).default,
    };

const server = Bun.serve({
  port: env.PORT,
  hostname: env.HOST,
  development: !isProduction,
  // SSE streams must outlive Bun's default 10s idle timeout. 0 disables it.
  idleTimeout: 0,
  routes,
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
