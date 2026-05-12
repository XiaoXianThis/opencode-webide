// Server-side env loader. Bun auto-loads .env into process.env.

function port(): number {
  return Number(process.env.PORT ?? 3000);
}

function opencodeUrl(): string {
  return (process.env.OPENCODE_URL ?? "http://127.0.0.1:4096").replace(/\/+$/, "");
}

function opencodeUsername(): string {
  return process.env.OPENCODE_USERNAME ?? "opencode";
}

function opencodePassword(): string {
  return process.env.OPENCODE_PASSWORD ?? "";
}

function basicAuthHeader(): string | undefined {
  const password = opencodePassword();
  if (!password) return undefined;
  const token = Buffer.from(`${opencodeUsername()}:${password}`).toString("base64");
  return `Basic ${token}`;
}

export const env = {
  get PORT() {
    return port();
  },
  get OPENCODE_URL() {
    return opencodeUrl();
  },
  get OPENCODE_USERNAME() {
    return opencodeUsername();
  },
  get OPENCODE_PASSWORD() {
    return opencodePassword();
  },
  get basicAuthHeader() {
    return basicAuthHeader();
  },
};