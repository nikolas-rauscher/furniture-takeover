import { createCloud } from "./cloud.ts";
import { createMessagesStore } from "./messages.ts";
import { createAgentService } from "./service.ts";
import { createAgentServer } from "./http.ts";
import { createAgentRuntime } from "./runtime.ts";
import { createThreadAgent } from "./thread-agent.ts";
import { isLoopbackHost, readServerConfig } from "./config.ts";
import { createListingsStore } from "./database.ts";
import { createAccountKeyStore } from "./account-keys.ts";
import { isCollecting } from "./routes/study.ts";
import { createSqliteStudyStore } from "./study-sqlite.ts";
import { createSupabaseStudyStore } from "./study-supabase.ts";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const staticDirectory = process.argv.includes("--serve")
  ? fileURLToPath(new URL("../dist/", import.meta.url))
  : undefined;
if (staticDirectory)
  await access(new URL("../dist/index.html", import.meta.url));

const config = readServerConfig();
const cloud = createCloud(process.env, {
  localTesting:
    !staticDirectory &&
    ["127.0.0.1", "localhost", "::1"].includes(
      process.env.APP_HOST ?? "127.0.0.1",
    ) &&
    config.allowedOrigins.every((origin) =>
      ["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname),
    ),
});
const { port, baseUrl, apiKey, model } = config;
// Demo mode has no accounts, so it must not be reachable from other machines.
if (!isLoopbackHost(config.host) && !cloud)
  throw new Error(
    "API_HOST can only be set beyond this machine when Supabase accounts are configured.",
  );
const accountKeys =
  cloud && process.env.ACCOUNT_KEYS_ENCRYPTION_KEY
    ? createAccountKeyStore({
        url: cloud.internalUrl,
        publishableKey: cloud.config.supabaseKey,
        encryptionKey: process.env.ACCOUNT_KEYS_ENCRYPTION_KEY.trim(),
      })
    : undefined;
const service = createAgentService({
  apiKey,
  model,
  baseUrl,
});
const listings = cloud ? undefined : createListingsStore(config.databasePath);
listings?.seedDemo();
const runtime = createAgentRuntime({
  apiKey,
  model,
  baseUrl,
  braveApiKey: config.braveApiKey,
  inventoryAuthoritative: !!cloud,
  inventoryProvider: cloud
    ? () => cloud.inventory()
    : () => listings!.listDemo(),
});
const threads = createThreadAgent({ apiKey, model, baseUrl });
const messages = cloud ? undefined : createMessagesStore(config.databasePath);
const study = config.study.open
  ? {
      config: config.study,
      store: cloud
        ? createSupabaseStudyStore(cloud.internalUrl, cloud.serviceKey)
        : createSqliteStudyStore(config.databasePath),
    }
  : undefined;
if (study && !isCollecting(study.config, new Date()))
  console.log(
    `The study's deletion date ${study.config.deleteBy} has come: it collects no more answers.`,
  );
const server = createAgentServer(service, {
  runtime,
  threads,
  cloud,
  accountKeys,
  forAccount: accountKeys
    ? async (owner, authorization) => {
        const keys = await accountKeys.credentials(owner, authorization);
        const userApiKey = keys.deepseek ?? apiKey;
        const userBaseUrl = keys.deepseek
          ? "https://api.deepseek.com"
          : baseUrl;
        return {
          service: createAgentService({
            apiKey: userApiKey,
            model,
            baseUrl: userBaseUrl,
          }),
          runtime: createAgentRuntime({
            apiKey: userApiKey,
            model,
            baseUrl: userBaseUrl,
            braveApiKey: keys.brave ?? config.braveApiKey,
            inventoryAuthoritative: !!cloud,
            inventoryProvider: () => cloud!.inventory(),
          }),
          threads: createThreadAgent({
            apiKey: userApiKey,
            model,
            baseUrl: userBaseUrl,
          }),
        };
      }
    : undefined,
  listings,
  messages,
  study,
  allowedOrigins: config.allowedOrigins,
  maxConcurrent: config.maxConcurrent,
  staticDirectory,
});
server.once("close", () => messages?.close());
server.once("close", () => listings?.close());
server.once("close", () => study?.store.close?.());
server.listen(port, config.host, () => {
  const state = service.health();
  console.log(
    `Agent API listening at http://${config.host}:${port} (${state.mode}; ${state.model}).`,
  );
});
const shutdown = () => server.close(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
