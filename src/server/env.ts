// Server-side env loader. Bun auto-loads .env into process.env.

const PORT = Number(process.env.PORT ?? 3000);
const OPENCODE_URL = (process.env.OPENCODE_URL ?? "http://127.0.0.1:4096").replace(/\/+$/, "");
const OPENCODE_USERNAME = process.env.OPENCODE_USERNAME ?? "opencode";
const OPENCODE_PASSWORD = process.env.OPENCODE_PASSWORD ?? "";

function basicAuthHeader(): string | undefined {
  if (!OPENCODE_PASSWORD) return undefined;
  const token = Buffer.from(`${OPENCODE_USERNAME}:${OPENCODE_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

export const env = {
  PORT,
  OPENCODE_URL,
  OPENCODE_USERNAME,
  OPENCODE_PASSWORD,
  basicAuthHeader: basicAuthHeader(),
};
