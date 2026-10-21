import test from "node:test";
import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { readServerConfig, readPort } from "./config.ts";
import { createAgentServer } from "./http.ts";
import { createAgentService } from "./service.ts";

test("fresh setup works without credentials and uses a project-relative database", () => {
  const config = readServerConfig({});
  assert.equal(config.port, 8787);
  assert.equal(config.apiKey, "");
  assert.equal(config.model, "deepseek-flash");
  assert.ok(isAbsolute(config.databasePath));
  assert.ok(config.allowedOrigins.includes("http://localhost:4173"));
  assert.ok(!config.allowedOrigins.includes("https://untrusted.example"));
});

test("custom dev/preview ports and explicit origins stay narrow", () => {
  const config = readServerConfig({
    APP_PORT: "5180",
    PREVIEW_PORT: "4180",
    API_ALLOWED_ORIGINS: " https://team.example,https://team.example/ ",
  });
  assert.ok(config.allowedOrigins.includes("http://localhost:5180"));
  assert.ok(config.allowedOrigins.includes("http://127.0.0.1:4180"));
  assert.equal(
    config.allowedOrigins.filter((origin) => origin === "https://team.example")
      .length,
    1,
  );
  assert.ok(!config.allowedOrigins.includes("http://localhost:5173"));
});

test("configuration rejects invalid ports and unsafe endpoint/origin values", () => {
  for (const port of ["0", "65536", "-1", "8e3", "1.5", "abc"]) {
    assert.throws(() => readPort(port, 8787, "API_PORT"));
  }
  for (const origin of [
    "*",
    "https://*.example",
    "https://team.example/path",
    "https://user:pass@team.example",
    "file:///tmp",
    "https://team.example?secret=1",
  ]) {
    assert.throws(() => readServerConfig({ API_ALLOWED_ORIGINS: origin }));
  }
  for (const baseUrl of [
    "http://remote.example",
    "https://user:pass@api.example",
    "https://api.example?key=secret",
  ]) {
    assert.throws(() => readServerConfig({ DEEPSEEK_BASE_URL: baseUrl }));
  }
});

test("HTTP accepts the configured teammate origin and rejects another origin", async () => {
  const server = createAgentServer(
    createAgentService({
      apiKey: "",
      model: "test",
      baseUrl: "https://api.deepseek.com",
    }),
    {
      allowedOrigins: readServerConfig({ APP_PORT: "5180" }).allowedOrigins,
    },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/health`;
  try {
    assert.equal(
      (await fetch(url, { headers: { Origin: "http://localhost:5180" } }))
        .status,
      200,
    );
    assert.equal(
      (await fetch(url, { headers: { Origin: "http://localhost:5173" } }))
        .status,
      403,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
