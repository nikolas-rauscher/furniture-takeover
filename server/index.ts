import { createMessagesStore } from "./messages.ts";
import { createAgentService } from "./service.ts";
import { createAgentServer } from "./http.ts";
import { createAgentRuntime } from "./runtime.ts";
import { readServerConfig } from "./config.ts";
import { createListingsStore } from "./database.ts";

const config = readServerConfig();
const { port, baseUrl, apiKey, model } = config;
const service = createAgentService({
  apiKey,
  model,
  baseUrl,
});
const listings = createListingsStore(config.databasePath);
listings.seedDemo();
const runtime = createAgentRuntime({
  apiKey,
  model,
  baseUrl,
  braveApiKey: config.braveApiKey,
  inventoryProvider: () => listings.listDemo(),
});
const messages = createMessagesStore(config.databasePath);
const server = createAgentServer(service, {
  runtime,
  listings,
  messages,
  allowedOrigins: config.allowedOrigins,
});
server.once("close", () => messages.close());
server.once("close", () => listings.close());
server.listen(port, "127.0.0.1", () => {
  const state = service.health();
  console.log(
    `Agent API listening at http://127.0.0.1:${port} (${state.mode}; ${state.model}).`,
  );
});
const shutdown = () => server.close(() => process.exit(0));
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
