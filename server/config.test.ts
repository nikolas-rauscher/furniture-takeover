import test from "node:test";
import assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import {
  readServerConfig,
  readPort,
  isLoopbackHost,
  readStudyConfig,
} from "./config.ts";
import { createAgentServer } from "./http.ts";
import { createAgentService } from "./service.ts";

test("fresh setup works without credentials and uses a project-relative database", () => {
  const config = readServerConfig({});
  assert.equal(config.port, 8787);
  assert.equal(config.maxConcurrent, 16);
  assert.equal(config.modelAccess.apiKey, "");
  assert.equal(config.modelAccess.model, "deepseek-flash");
  assert.ok(isAbsolute(config.databasePath));
  assert.ok(config.allowedOrigins.includes("http://localhost:4173"));
  assert.ok(!config.allowedOrigins.includes("https://untrusted.example"));
});

test("custom dev/preview ports and explicit origins stay narrow", () => {
  const config = readServerConfig({
    APP_PORT: "5180",
    API_AGENT_CONCURRENCY: "21",
    PREVIEW_PORT: "4180",
    API_ALLOWED_ORIGINS: " https://team.example,https://team.example/ ",
  });
  assert.equal(config.maxConcurrent, 21);
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
      provider: "deepseek",
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

test("the API listens on loopback unless another address is configured", () => {
  assert.equal(readServerConfig({}).host, "127.0.0.1");
  assert.equal(readServerConfig({ API_HOST: " 0.0.0.0 " }).host, "0.0.0.0");
  assert.equal(
    readServerConfig({ API_HOST: "192.168.1.30" }).host,
    "192.168.1.30",
  );
  assert.equal(
    readServerConfig({ API_HOST: "app-lxc.lan" }).host,
    "app-lxc.lan",
  );
  for (const value of ["http://x", "a b", "-bad", "host/path", "a;b"])
    assert.throws(
      () => readServerConfig({ API_HOST: value }),
      /API_HOST/,
      value,
    );
  for (const host of ["127.0.0.1", "127.1.2.3", "localhost", "::1"])
    assert.equal(isLoopbackHost(host), true, host);
  for (const host of ["0.0.0.0", "192.168.1.30", "::", "app-lxc.lan"])
    assert.equal(isLoopbackHost(host), false, host);
});

test("the study is set up only with a contact address and a deletion date", () => {
  assert.deepEqual(readStudyConfig({}), { open: false });
  assert.deepEqual(
    readStudyConfig({ STUDY_CONTACT: " ", STUDY_DELETE_BY: "" }),
    { open: false },
  );
  assert.deepEqual(
    readStudyConfig({
      STUDY_CONTACT: " study@takeover.example ",
      STUDY_DELETE_BY: "2026-12-31",
    }),
    { open: true, contact: "study@takeover.example", deleteBy: "2026-12-31" },
  );
  assert.equal(readServerConfig({}).study.open, false);
});

test("a deletion date that has come still starts the server, with collection closed", () => {
  const contact = "study@takeover.example";
  for (const deleteBy of ["2026-11-21", "2026-11-20"]) {
    const env = { STUDY_CONTACT: contact, STUDY_DELETE_BY: deleteBy };
    assert.deepEqual(readStudyConfig(env), {
      open: true,
      contact,
      deleteBy,
    });
    assert.equal(readServerConfig(env).study.open, true);
  }
});

test("a half-set or invalid study configuration stops the server", () => {
  const contact = "study@takeover.example";
  assert.throws(() => readStudyConfig({ STUDY_CONTACT: contact }), /both/);
  assert.throws(
    () => readStudyConfig({ STUDY_DELETE_BY: "2026-12-31" }),
    /both/,
  );
  for (const deleteBy of ["31.12.2026", "2026-02-30", "2026-12-31T00:00:00Z"])
    assert.throws(
      () =>
        readStudyConfig({ STUDY_CONTACT: contact, STUDY_DELETE_BY: deleteBy }),
      /ISO date/,
    );
  assert.throws(
    () =>
      readStudyConfig({
        STUDY_CONTACT: "not-an-address",
        STUDY_DELETE_BY: "2026-12-31",
      }),
    /email address/,
  );
});

test("OpenAI needs its key and model, and keeps DeepSeek ready for students' own keys", () => {
  const openai = {
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: " key ",
    OPENAI_MODEL: "gpt-6-luna",
    DEEPSEEK_API_KEY: "deepseek-key",
  };
  const config = readServerConfig(openai);
  assert.deepEqual(config.modelAccess, {
    provider: "openai",
    apiKey: "key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-6-luna",
  });
  assert.equal(config.deepseek.apiKey, "deepseek-key");
  for (const missing of ["OPENAI_API_KEY", "OPENAI_MODEL"])
    assert.throws(
      () => readServerConfig({ ...openai, [missing]: "" }),
      /OPENAI_API_KEY and OPENAI_MODEL/,
    );
  assert.throws(
    () => readServerConfig({ AI_PROVIDER: "other" }),
    /AI_PROVIDER/,
  );
});

test("the demo login is closed without a long code", () => {
  assert.equal(readServerConfig({}).demoLoginCode, undefined);
  assert.equal(
    readServerConfig({ DEMO_LOGIN_CODE: "team-demo-code-2026" }).demoLoginCode,
    "team-demo-code-2026",
  );
  for (const code of [
    "short",
    "Upper-Case-Code-2026",
    "with spaces in the code",
  ])
    assert.throws(
      () => readServerConfig({ DEMO_LOGIN_CODE: code }),
      /DEMO_LOGIN_CODE/,
    );
});
