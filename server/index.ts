import { createCloud } from "./cloud.ts";
import { createMessagesStore } from "./messages.ts";
import { createAgentService } from "./service.ts";
import { createAgentServer } from "./http.ts";
import { createAgentRuntime } from "./runtime.ts";
import { readServerConfig } from "./config.ts";
import { createListingsStore } from "./database.ts";
import { createAccountKeyStore } from "./account-keys.ts";

const config = readServerConfig();
const cloud = createCloud();
const { port, baseUrl, apiKey, model } = config;
const accountKeys =
  cloud && process.env.ACCOUNT_KEYS_ENCRYPTION_KEY
    ? createAccountKeyStore({
        url: cloud.config.supabaseUrl,
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
const messages = cloud ? undefined : createMessagesStore(config.databasePath);
const server = createAgentServer(service, {
  runtime,
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
        };
      }
    : undefined,
  listings,
  messages,
  allowedOrigins: config.allowedOrigins,
});
server.once("close", () => messages?.close());
server.once("close", () => listings?.close());
server.listen(port, "127.0.0.1", () => {
  const state = service.health();
  console.log(
    `Agent API listening at http://127.0.0.1:${port} (${state.mode}; ${state.model}).`,
  );
});
const shutdown = () => server.close(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
