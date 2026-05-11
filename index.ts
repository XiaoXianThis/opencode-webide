import index from "./src/client/index.html";
import { env } from "./src/server/env";
import { proxyApi } from "./src/server/proxy";
import { proxyEvents } from "./src/server/events";

const server = Bun.serve({
  port: env.PORT,
  hostname: "127.0.0.1",
  development: process.env.NODE_ENV !== "production",
  // SSE streams must outlive Bun's default 10s idle timeout. 0 disables it.
  idleTimeout: 0,
  routes: {
    // SSE must be matched before the generic /api/* wildcard.
    "/api/events": (req) => proxyEvents(req),
    "/api/*": (req) => proxyApi(req),
    "/healthz": () => new Response("ok"),
    "/": index,
  },
  error(err) {
    console.error("[server] error", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`opencode-webide listening on http://${server.hostname}:${server.port}`);
console.log(`proxying /api/* -> ${env.OPENCODE_URL}`);
if (!env.basicAuthHeader) {
  console.log("[auth] OPENCODE_PASSWORD not set; forwarding without Authorization header");
}