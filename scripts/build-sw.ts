import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { generateSW } from "workbox-build";

function copyPublicDir(source: string, target: string): void {
  if (!existsSync(source)) return;
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const sourcePath = join(source, entry);
    const targetPath = join(target, entry);
    if (statSync(sourcePath).isDirectory()) copyPublicDir(sourcePath, targetPath);
    else copyFileSync(sourcePath, targetPath);
  }
}

copyPublicDir("public", "dist/public");

await generateSW({
  globDirectory: "dist/public",
  swDest: "dist/public/sw.js",
  globPatterns: ["**/*.{html,js,css,svg,webmanifest}"],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  navigateFallback: "/index.html",
  navigateFallbackDenylist: [/^\/api\//, /^\/healthz$/],
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.headers.get("accept")?.includes("text/event-stream") ?? false,
      handler: "NetworkOnly",
    },
    {
      urlPattern: ({ url }) => /^\/api\/(events?|pty|permission|auth|file\/write)/.test(url.pathname),
      handler: "NetworkOnly",
    },
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: { cacheName: "webide-html" },
    },
    {
      urlPattern: ({ url, request }) => url.origin === self.location.origin && request.method === "GET" && !url.pathname.startsWith("/api/"),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "webide-static" },
    },
  ],
});
