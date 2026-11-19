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
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

test("production hosting serves built assets but never source, secrets or escaped paths", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "takeover-hosting-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dist = join(directory, "dist");
  await mkdir(join(dist, "assets"), { recursive: true });
  await writeFile(join(dist, "index.html"), "<html>Takeover</html>");
  await writeFile(join(dist, "assets/app-123.js"), "console.log('app')");
  await writeFile(join(directory, "private.html"), "private");
  await writeFile(join(dist, ".env"), "secret");
  await writeFile(join(dist, "assets/app-123.js.map"), "source");
  await symlink(join(directory, "private.html"), join(dist, "escape.html"));
  const { url } = await startServer(t, undefined, { staticDirectory: dist });
  const page = await fetch(url);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") ?? "", /text\/html/);
  assert.equal(page.headers.get("cache-control"), "no-cache");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.match(
    page.headers.get("content-security-policy") ?? "",
    /script-src 'self'/,
  );
  assert.match(
    page.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );
  assert.equal(await page.text(), "<html>Takeover</html>");
  const asset = await fetch(`${url}/assets/app-123.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("cache-control") ?? "", /immutable/);
  assert.match(asset.headers.get("content-type") ?? "", /javascript/);
  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  for (const path of [
    "/.env",
    "/%2eenv",
    "/assets/app-123.js.map",
    "/server/index.ts",
    "/assets/..%2f..%2fprivate.html",
    "/escape.html",
    "/missing.js",
    "/assets%5c..%5cprivate.html",
    "/null%00.html",
    "/api/missing",
  ])
    assert.equal((await fetch(url + path)).status, 404, path);
  assert.equal((await fetch(url + "/invalid%zz.html")).status, 400);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
  const health = await fetch(url + "/api/health");
  assert.equal(health.status, 200);
  assert.match(health.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(
    (await fetch(url, { headers: { Origin: "https://untrusted.example" } }))
      .status,
    403,
  );
});

test("daily allowance blocks both agent routes before provider work and health checks do not spend it", async (t) => {
  let allowed = false,
    providerCalls = 0;
  const reservations: boolean[] = [];
  const resetAt = new Date(Date.now() + 3600_000).toISOString();
  const { url } = await startServer(
    t,
    createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(async () => {
        providerCalls++;
        return completion(output);
      }),
    }),
    {
      cloud: {
        config: {
          supabaseUrl: "https://example.supabase.co",
          supabaseKey: "public-test-key",
        },
        authorize: async () => "alice",
        quota: async (_authorization, spend = false) => {
          reservations.push(spend);
          return { allowed, limit: 50, remaining: allowed ? 49 : 0, resetAt };
        },
      },
      runtime: {
        health: () => ({
          configured: true,
          model: "test",
          webSearchConfigured: false,
        }),
        run: async () => {
          providerCalls++;
        },
      },
    },
  );
  const headers = {
    Authorization: "Bearer alice",
    "Content-Type": "application/json",
  };
  const health = await (await fetch(url + "/api/health", { headers })).json();
  assert.equal(health.quota.remaining, 0);
  for (const path of ["/api/agent/assist", "/api/agent/run"]) {
    const result = await fetch(url + path, {
      method: "POST",
      headers,
      body: JSON.stringify({ intent: "search", text: "white desk" }),
    });
    assert.equal(result.status, 429);
    assert.equal((await result.json()).error.code, "AI_QUOTA_EXCEEDED");
    assert.equal(result.headers.get("X-AI-Quota-Remaining"), "0");
    assert.ok(Number(result.headers.get("Retry-After")) > 0);
  }
  assert.equal(providerCalls, 0);
  assert.deepEqual(reservations, [false, true, true]);
  allowed = true;
  assert.equal(
    (
      await fetch(url + "/api/agent/assist", {
        method: "POST",
        headers,
        body: JSON.stringify({ intent: "search", text: "white desk" }),
      })
    ).status,
    200,
  );
  assert.equal(providerCalls, 1);
});

test("too many pending token validations are rejected before another Supabase auth request", async (t) => {
  const { AgentError } = await import("./errors.ts");
  let checks = 0,
    ready!: () => void,
    release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const saturated = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const { url } = await startServer(t, undefined, {
    cloud: {
      config: {
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "public",
      },
      authorize: async () => {
        checks++;
        if (checks === 8) ready();
        await pending;
        throw new AgentError(401, "AUTH_REQUIRED", "Sign in.");
      },
      quota: async () => {
        throw new Error("Must not reach quotas without auth");
      },
    },
  });
  t.after(release);
  const requests = Array.from({ length: 8 }, () =>
    fetch(url + "/api/agent/assist", {
      method: "POST",
      headers: { Authorization: "Bearer invalid" },
      body: "{}",
    }),
  );
  await saturated;
  const denied = await fetch(url + "/api/agent/assist", {
    method: "POST",
    headers: { Authorization: "Bearer invalid" },
    body: "{}",
  });
  assert.equal(denied.status, 429);
  assert.equal((await denied.json()).error.code, "AUTH_BUSY");
  assert.equal(checks, 8);
  release();
  for (const result of await Promise.all(requests))
    assert.equal(result.status, 401);
});

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
        quota: async () => ({
          allowed: true,
          limit: 50,
          remaining: 49,
          resetAt: "2026-12-01T00:00:00Z",
        }),
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

test(
  "HTTP routes photo sorting through the same validated agent path",
  { timeout: 5000 },
  async (t) => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(async () =>
        completion({ groups: [{ photos: [1, 0], label: "Desk" }] }),
      ),
    });
    const instance = await startServer(t, service);
    const response = await fetch(`${instance.url}/api/agent/group-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [png, png] }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).groups, [
      { photos: [1, 0], label: "Desk" },
    ]);
    const invalid = await fetch(`${instance.url}/api/agent/group-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: "desk" }),
    });
    assert.equal(invalid.status, 400);
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
          return "alice";
        },
        quota: async () => ({
          allowed: true,
          limit: 50,
          remaining: 49,
          resetAt: "2026-12-01T00:00:00Z",
        }),
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
