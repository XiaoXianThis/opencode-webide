import { env } from "./env";

// Strip hop-by-hop and other headers we should not forward upstream.
const REQ_HEADERS_BLOCKLIST = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "transfer-encoding",
  "upgrade",
  "expect",
]);

const RES_HEADERS_BLOCKLIST = new Set([
  "transfer-encoding",
  "connection",
  "content-encoding",
  "content-length",
]);

type StreamingRequestInit = RequestInit & { duplex?: "half" };

function buildUpstreamHeaders(req: Request): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (!REQ_HEADERS_BLOCKLIST.has(key.toLowerCase())) out.set(key, value);
  });
  if (env.basicAuthHeader) out.set("authorization", env.basicAuthHeader);
  return out;
}

function buildClientHeaders(upstream: Response): Headers {
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!RES_HEADERS_BLOCKLIST.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

/**
 * Transparently proxy /api/* to opencode serve.
 * The /api prefix is stripped before forwarding.
 */
export async function proxyApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const upstreamPath = url.pathname.replace(/^\/api/, "") || "/";
  const upstreamUrl = `${env.OPENCODE_URL}${upstreamPath}${url.search}`;

  const init: StreamingRequestInit = {
    method: req.method,
    headers: buildUpstreamHeaders(req),
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildClientHeaders(upstream),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "upstream_unreachable", message, upstream: upstreamUrl }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}