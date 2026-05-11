import { env } from "./env";

/**
 * SSE pass-through for /api/events -> opencode /event.
 * We deliberately stream the upstream body bytes verbatim to preserve framing.
 */
export async function proxyEvents(req: Request): Promise<Response> {
  const upstreamUrl = `${env.OPENCODE_URL}/event`;

  const headers = new Headers({ accept: "text/event-stream" });
  if (env.basicAuthHeader) headers.set("authorization", env.basicAuthHeader);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      signal: req.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(
        JSON.stringify({
          error: "events_upstream_failed",
          status: upstream.status,
          statusText: upstream.statusText,
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "events_unreachable", message, upstream: upstreamUrl }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}
