import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createAgentService } from "./service.ts";
import { createAgentServer, MAX_BODY_BYTES } from "./http.ts";
import {
  output,
  completion,
  fakeConfig,
  fakeFetch,
} from "./testing/provider.ts";
import { unavailableKeyStatus } from "./account-keys.ts";

// Each test gets a loopback port and automatic cleanup, including failed assertions.
async function startServer(
  t: TestContext,
  service = createAgentService({ ...fakeConfig, apiKey: "" }),
  options: Parameters<typeof createAgentServer>[1] = {},
) {
  const server = createAgentServer(service, options);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
}

test("account keys and AI requests use only the authenticated owner's credentials", async (t) => {
  const status = (owner: string) => ({
    ...unavailableKeyStatus(),
    enabled: true,
    providers: {
      deepseek: {
        saved: owner === "alice",
        lastFour: owner === "alice" ? "1234" : undefined,
      },
      brave: { saved: false },
    },
  });
  const seen: string[] = [];
  const instance = await startServer(
    t,
    createAgentService({ ...fakeConfig, apiKey: "" }),
    {
      cloud: {
        config: {
          supabaseUrl: "https://example.supabase.co",
          supabaseKey: "public-only",
        },
        authorize: async (header) => {
          const owner = header?.replace("Bearer ", "");
          if (owner !== "alice" && owner !== "bob") {
            const { AgentError } = await import("./errors.ts");
            throw new AgentError(401, "AUTH_REQUIRED", "Sign in.");
          }
          return owner;
        },
      },
      accountKeys: {
        status: async (owner) => status(owner),
        change: async (owner, authorization, input) => {
          assert.equal(authorization, `Bearer ${owner}`);
          assert.equal((input as { user_id: string }).user_id, "eve");
          return status(owner);
        },
        credentials: async () => ({}),
      },
      forAccount: async (owner, authorization) => {
        assert.equal(authorization, `Bearer ${owner}`);
        const apiKey = `${owner}-private-provider-key`;
        return {
          service: createAgentService({
            ...fakeConfig,
            apiKey,
            fetchImpl: fakeFetch(async (_url, init) => {
              assert.equal(
                (init?.headers as Record<string, string>).Authorization,
                `Bearer ${apiKey}`,
              );
              seen.push(owner);
              return completion(output);
            }),
          }),
          runtime: {
            health: () => ({
              configured: true,
              model: "test",
              webSearchConfigured: false,
            }),
            run: async (_input, emit) => {
              seen.push(owner);
              await emit({
                type: "complete",
                runId: "test",
                text: "Draft ready.",
                sources: [],
              });
            },
          },
        };
      },
    },
  );
  assert.equal((await fetch(instance.url + "/api/account/keys")).status, 401);
  for (const owner of ["alice", "bob"]) {
    const headers = {
      Authorization: `Bearer ${owner}`,
      "Content-Type": "application/json",
    };
    const changed = await fetch(instance.url + "/api/account/keys", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        provider: "deepseek",
        key: "not-real-secret",
        user_id: "eve",
      }),
    });
    assert.deepEqual(
      await changed.json(),
      JSON.parse(JSON.stringify(status(owner))),
    );
    const result = await fetch(instance.url + "/api/agent/assist", {
      method: "POST",
      headers,
      body: JSON.stringify({ intent: "search", text: "white desk" }),
    });
    assert.equal(result.status, 200);
    assert.ok(!(await result.text()).includes("private-provider-key"));
    const run = await fetch(instance.url + "/api/agent/run", {
      method: "POST",
      headers,
      body: JSON.stringify({ text: "desk" }),
    });
    assert.equal(run.status, 200);
    assert.ok((await run.text()).includes("Draft ready"));
    const health = await (
      await fetch(instance.url + "/api/health", { headers })
    ).json();
    assert.equal(health.configured, true);
    assert.ok(!JSON.stringify(health).includes("private-provider-key"));
  }
  assert.deepEqual(seen, ["alice", "alice", "bob", "bob"]);
  const config = await (await fetch(instance.url + "/api/config")).json();
  assert.deepEqual(Object.keys(config).sort(), ["supabaseKey", "supabaseUrl"]);
});

test(
  "HTTP reports setup status and keeps local origin restrictions",
  { timeout: 5000 },
  async (t) => {
    const instance = await startServer(t);
    const health = await fetch(`${instance.url}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).mode, "unconfigured");
    const response = await fetch(`${instance.url}/api/agent/assist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ intent: "search", text: "desk" }),
    });
    assert.equal(response.status, 503);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    const denied = await fetch(`${instance.url}/api/health`, {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "ORIGIN_NOT_ALLOWED");
  },
);

test(
  "HTTP rejects malformed and oversized bodies before provider work",
  { timeout: 5000 },
  async (t) => {
    const instance = await startServer(t);
    const invalid = await fetch(`${instance.url}/api/agent/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, "INVALID_JSON");
    const large = await fetch(`${instance.url}/api/agent/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(MAX_BODY_BYTES + 1),
    });
    assert.equal(large.status, 413);
    assert.equal((await large.json()).error.code, "BODY_TOO_LARGE");
    const wrongType = await fetch(`${instance.url}/api/agent/assist`, {
      method: "POST",
      body: "desk",
    });
    assert.equal(wrongType.status, 415);
  },
);

test(
  "HTTP concurrency cap returns retryable error while an agent request is active",
  { timeout: 5000 },
  async (t) => {
    let entered!: () => void;
    let finish!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(async () => {
        entered();
        await gate;
        return completion(output);
      }),
    });
    t.after(finish);
    const instance = await startServer(t, service, { maxConcurrent: 1 });
    const init = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "search", text: "desk" }),
    };
    const first = fetch(`${instance.url}/api/agent/assist`, init);
    await started;
    const second = await fetch(`${instance.url}/api/agent/assist`, init);
    assert.equal(second.status, 429);
    assert.equal(second.headers.get("retry-after"), "1");
    finish();
    assert.equal((await first).status, 200);
  },
);

test(
  "disconnecting an HTTP caller cancels the provider request",
  { timeout: 5000 },
  async (t) => {
    let entered!: () => void;
    let cancelled!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const aborted = new Promise<void>((resolve) => {
      cancelled = resolve;
    });
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            entered();
            init?.signal?.addEventListener(
              "abort",
              () => {
                cancelled();
                reject(new Error("cancelled"));
              },
              { once: true },
            );
          }),
      ),
    });
    const instance = await startServer(t, service);
    const controller = new AbortController();
    const pending = fetch(`${instance.url}/api/agent/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "search", text: "desk" }),
      signal: controller.signal,
    });
    await started;
    controller.abort();
    await assert.rejects(pending);
    await aborted;
  },
);

test(
  "agent runs deliver activity before completion and cancel when the browser disconnects",
  { timeout: 5000 },
  async (t) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let cancelled = false;
    let onCancelled!: () => void;
    const aborted = new Promise<void>((resolve) => {
      onCancelled = resolve;
    });
    t.after(() => release?.());
    const { url } = await startServer(
      t,
      createAgentService({ ...fakeConfig, apiKey: "" }),
      {
        runtime: {
          health: () => ({
            configured: true,
            model: "test-model",
            webSearchConfigured: true,
          }),
          async run(_input, emit, signal) {
            signal.addEventListener(
              "abort",
              () => {
                cancelled = true;
                onCancelled();
                release?.();
              },
              { once: true },
            );
            emit({
              type: "status",
              id: "web",
              label: "Searching the web",
              state: "running",
            });
            await gate;
            if (!signal.aborted)
              emit({
                type: "complete",
                text: "Finished",
                sources: [],
                runId: "test-run",
              });
          },
        },
      },
    );
    const controller = new AbortController();
    const response = await fetch(`${url}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "desk" }),
      signal: controller.signal,
    });
    assert.match(response.headers.get("content-type") ?? "", /x-ndjson/);
    const first = await response.body!.getReader().read();
    assert.equal(
      JSON.parse(new TextDecoder().decode(first.value)).type,
      "status",
    );
    assert.equal(cancelled, false);
    controller.abort();
    await aborted;
    assert.equal(cancelled, true);
  },
);

test("cloud mode exposes only public config and guards all AI and old demo routes", async (t) => {
  const { AgentError } = await import("./errors.ts");
  let calls = 0;
  const instance = await startServer(
    t,
    createAgentService({ ...fakeConfig, apiKey: "" }),
    {
      cloud: {
        config: {
          supabaseUrl: "https://example.supabase.co",
          supabaseKey: "public-test-key",
        },
        authorize: async (header) => {
          calls++;
          if (header !== "Bearer valid")
            throw new AgentError(401, "AUTH_REQUIRED", "Sign in.");
        },
      },
    },
  );
  const config = await (await fetch(`${instance.url}/api/config`)).json();
  assert.deepEqual(config, {
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "public-test-key",
  });
  for (const route of ["/api/agent/assist", "/api/agent/run"])
    assert.equal(
      (await fetch(instance.url + route, { method: "POST", body: "{}" }))
        .status,
      401,
    );
  assert.equal(calls, 2);
  for (const route of [
    "/api/listings",
    "/api/listings/demo/update",
    "/api/messages",
  ])
    assert.equal((await fetch(instance.url + route)).status, 410);
  const allowed = await fetch(`${instance.url}/api/agent/assist`, {
    method: "POST",
    headers: {
      Authorization: "Bearer valid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ intent: "search", text: "desk" }),
  });
  assert.equal(allowed.status, 503); // Passed auth; deliberately unconfigured provider.
});
