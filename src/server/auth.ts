import { env } from "./env";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "webide_session";
const CSRF_COOKIE = "webide_csrf";
const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isAuthEnabled(): boolean {
  return env.WEBIDE_TOKEN.length > 0;
}

export function csrfHeaderName(): string {
  return CSRF_HEADER;
}

function parseCookies(req: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  const header = req.headers.get("cookie");
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, decodeURIComponent(value));
  }

  return cookies;
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function sessionValue(): string {
  return createHmac("sha256", env.WEBIDE_TOKEN).update("webide-session").digest("base64url");
}

function cookie(name: string, value: string, maxAge?: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

function csrfCookie(value: string, maxAge?: number): string {
  const parts = [`${CSRF_COOKIE}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Strict"];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function forbidden(): Response {
  return Response.json({ error: "csrf_failed" }, { status: 403 });
}

export function validateAuth(req: Request): Response | undefined {
  if (!isAuthEnabled()) return undefined;

  const cookies = parseCookies(req);
  const session = cookies.get(SESSION_COOKIE) ?? "";
  if (!session || !timingSafeEqualString(session, sessionValue())) return unauthorized();

  if (SAFE_METHODS.has(req.method)) return undefined;

  const csrfCookieValue = cookies.get(CSRF_COOKIE) ?? "";
  const csrfHeaderValue = req.headers.get(CSRF_HEADER) ?? "";
  if (!csrfCookieValue || !csrfHeaderValue || !timingSafeEqualString(csrfCookieValue, csrfHeaderValue)) {
    return forbidden();
  }

  return undefined;
}

export async function login(req: Request): Promise<Response> {
  if (!isAuthEnabled()) return Response.json({ ok: true, authEnabled: false });

  let token = "";
  try {
    const body = await req.json();
    if (typeof body === "object" && body !== null && "token" in body && typeof body.token === "string") {
      token = body.token;
    }
  } catch {
    return unauthorized();
  }

  if (!timingSafeEqualString(token, env.WEBIDE_TOKEN)) return unauthorized();

  const csrfToken = crypto.randomUUID();
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", cookie(SESSION_COOKIE, sessionValue()));
  headers.append("set-cookie", csrfCookie(csrfToken));
  return new Response(JSON.stringify({ ok: true, authEnabled: true, csrfToken }), { headers });
}

export function logout(): Response {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", cookie(SESSION_COOKIE, "", 0));
  headers.append("set-cookie", csrfCookie("", 0));
  return new Response(JSON.stringify({ ok: true }), { headers });
}

export function authStatus(req: Request): Response {
  if (!isAuthEnabled()) return Response.json({ authEnabled: false, authenticated: true });
  const failure = validateAuth(new Request(req.url, { method: "GET", headers: req.headers }));
  return Response.json({ authEnabled: true, authenticated: failure === undefined });
}
