import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { isIP } from "node:net";

type Environment = Record<string, string | undefined>;
const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function readPort(
  value: string | undefined,
  fallback: number,
  name: string,
) {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)
    throw new Error(`${name} must be an integer from 1 to 65535.`);
  return Number(value);
}

/** Address the API listens on. Loopback unless a proxy on another machine needs it. */
export function readHost(value: string | undefined, name = "API_HOST") {
  const host = value?.trim() || "127.0.0.1";
  if (!isIP(host) && !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(host))
    throw new Error(`${name} must be an IP address or hostname.`);
  return host;
}

export const isLoopbackHost = (host: string) =>
  host === "localhost" || host === "::1" || /^127\./.test(host);

export function localOrigins(appPort = 5173, previewPort = 4173): string[] {
  return [...new Set([appPort, previewPort])].flatMap((port) => [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]);
}

export function readServerConfig(env: Environment = process.env) {
  const port = readPort(env.API_PORT, 8787, "API_PORT");
  const host = readHost(env.API_HOST);
  const appPort = readPort(env.APP_PORT, 5173, "APP_PORT");
  const previewPort = readPort(env.PREVIEW_PORT, 4173, "PREVIEW_PORT");
  const baseUrl = env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  const endpoint = new URL(baseUrl);
  if (
    endpoint.protocol !== "https:" &&
    !(
      endpoint.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
    )
  )
    throw new Error(
      "DEEPSEEK_BASE_URL must use HTTPS (or a local HTTP test server).",
    );
  if (
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error("DEEPSEEK_BASE_URL must be a plain API base URL.");

  const allowedOrigins = localOrigins(appPort, previewPort);
  for (const value of (env.API_ALLOWED_ORIGINS ?? "").split(",")) {
    const origin = value.trim();
    if (!origin) continue;
    const url = new URL(origin);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      url.hostname.includes("*")
    )
      throw new Error(
        "API_ALLOWED_ORIGINS must contain exact HTTP(S) origins, without paths or wildcards.",
      );
    allowedOrigins.push(url.origin);
  }
  return {
    port,
    host,
    baseUrl,
    apiKey: env.DEEPSEEK_API_KEY?.trim() ?? "",
    model: env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
    braveApiKey: env.BRAVE_SEARCH_API_KEY?.trim() ?? "",
    databasePath: resolve(
      projectRoot,
      env.DATABASE_PATH?.trim() || "data/marketplace.sqlite",
    ),
    allowedOrigins: [...new Set(allowedOrigins)],
  };
}
