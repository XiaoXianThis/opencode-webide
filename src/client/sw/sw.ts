declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "opencode-webide-shell-v1";
const SHELL_URLS = ["/", "/m", "/offline.html", "/manifest.webmanifest"];
const API_BYPASS = [/^\/api\/events?/, /^\/api\/pty/, /^\/api\/permission/, /^\/api\/auth/, /^\/api\/file\/write/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.headers.get("accept")?.includes("text/event-stream")) return;
  if (API_BYPASS.some((pattern) => pattern.test(url.pathname))) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html").then((response) => response ?? Response.error())));
    return;
  }

  if (request.method === "GET") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((response) => {
          if (response.ok) void cache.put(request, response.clone());
          return response;
        });
        return cached ?? network;
      }),
    );
  }
});

export {};
