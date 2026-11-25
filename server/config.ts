import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { isIP } from "node:net";
import {
  modelProviders,
  providerBaseUrls,
  readOpenAIReasoningEffort,
  type ModelAccess,
} from "./model-provider.ts";
import { studyConfigSchema, type StudyConfig } from "../shared/study.ts";

export const DEFAULT_AGENT_CONCURRENCY = 16;

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
function readHost(value: string | undefined, name = "API_HOST") {
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

/**
 * The study is set up only when the deployment names a contact address and a deletion date,
 * because the consent text promises both. A date that has passed still starts the server:
 * the study routes stop collecting on that date, and the rest of the app runs as before.
 */
export function readStudyConfig(env: Environment): StudyConfig {
  const contact = env.STUDY_CONTACT?.trim();
  const deleteBy = env.STUDY_DELETE_BY?.trim();
  if (!contact && !deleteBy) return { open: false };
  if (!contact || !deleteBy)
    throw new Error("Set both STUDY_CONTACT and STUDY_DELETE_BY, or neither.");
  const parsed = studyConfigSchema.safeParse({ open: true, contact, deleteBy });
  if (!parsed.success)
    throw new Error(
      "STUDY_CONTACT must be an email address and STUDY_DELETE_BY an ISO date (YYYY-MM-DD).",
    );
  return parsed.data;
}

/** The code in the team's demo link. Without one, the demo login is closed. */
function readDemoLoginCode(env: Environment): string | undefined {
  const code = env.DEMO_LOGIN_CODE?.trim();
  if (!code) return undefined;
  if (!/^[a-z0-9-]{16,64}$/.test(code))
    throw new Error(
      "DEMO_LOGIN_CODE must be 16 to 64 lowercase letters, numbers or dashes.",
    );
  return code;
}

/** The provider the server's own key uses. OpenAI runs only with its key and model set. */
function readModelAccess(env: Environment, deepseek: ModelAccess): ModelAccess {
  const provider = env.AI_PROVIDER?.trim() || "deepseek";
  if (provider === "deepseek") return deepseek;
  if (provider !== "openai")
    throw new Error(
      `AI_PROVIDER must be one of: ${modelProviders.join(", ")}.`,
    );
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim();
  if (!apiKey || !model)
    throw new Error(
      "Set OPENAI_API_KEY and OPENAI_MODEL when AI_PROVIDER is openai.",
    );
  const effort = env.OPENAI_REASONING_EFFORT?.trim();
  return {
    provider,
    apiKey,
    baseUrl: providerBaseUrls.openai,
    model,
    ...(effort !== undefined && {
      openaiReasoningEffort: readOpenAIReasoningEffort(model, effort),
    }),
  };
}

export function readServerConfig(env: Environment = process.env) {
  const port = readPort(env.API_PORT, 8787, "API_PORT");
  const host = readHost(env.API_HOST);
  const appPort = readPort(env.APP_PORT, 5173, "APP_PORT");
  const previewPort = readPort(env.PREVIEW_PORT, 4173, "PREVIEW_PORT");
  const baseUrl = env.DEEPSEEK_BASE_URL?.trim() || providerBaseUrls.deepseek;
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
  const deepseek: ModelAccess = {
    provider: "deepseek",
    apiKey: env.DEEPSEEK_API_KEY?.trim() ?? "",
    baseUrl,
    model: env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
  };
  return {
    port,
    host,
    maxConcurrent: readPort(
      env.API_AGENT_CONCURRENCY,
      DEFAULT_AGENT_CONCURRENCY,
      "API_AGENT_CONCURRENCY",
    ),
    modelAccess: readModelAccess(env, deepseek),
    deepseek,
    braveApiKey: env.BRAVE_SEARCH_API_KEY?.trim() ?? "",
    databasePath: resolve(
      projectRoot,
      env.DATABASE_PATH?.trim() || "data/marketplace.sqlite",
    ),
    allowedOrigins: [...new Set(allowedOrigins)],
    study: readStudyConfig(env),
    demoLoginCode: readDemoLoginCode(env),
  };
}
