export const CSRF_HEADER = "x-csrf-token";

let csrfToken: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const part = document.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

export function getCsrfToken(): string | null {
  return csrfToken ?? readCookie("webide_csrf");
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function loginReturnPath(): string {
  const path = window.location.pathname + window.location.search + window.location.hash;
  return path === "/login" ? "/" : path;
}

export function loginUrl(returnTo = loginReturnPath()): string {
  const params = new URLSearchParams({ returnTo });
  return `/login?${params.toString()}`;
}

export function redirectToLogin(returnTo = loginReturnPath()): void {
  window.history.replaceState(null, "", loginUrl(returnTo));
  window.dispatchEvent(new Event("webide:navigate"));
}

export function redirectAfterLogin(fallback = "/"): void {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo") || fallback;
  window.history.replaceState(null, "", returnTo.startsWith("/") ? returnTo : fallback);
  window.dispatchEvent(new Event("webide:navigate"));
}

export async function authFetch(request: Request): ReturnType<typeof fetch> {
  const headers = new Headers(request.headers);
  if (!headers.has(CSRF_HEADER) && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const token = getCsrfToken();
    if (token) headers.set(CSRF_HEADER, token);
  }

  const response = await fetch(new Request(request, { headers }));
  if (response.status === 401) redirectToLogin();
  return response;
}

export async function loginWithToken(token: string): Promise<boolean> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) return false;
  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "csrfToken" in body && typeof body.csrfToken === "string") {
    setCsrfToken(body.csrfToken);
  }
  return true;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: getCsrfToken() ? { [CSRF_HEADER]: getCsrfToken() } : undefined,
  });
  setCsrfToken(null);
  redirectToLogin("/");
}
