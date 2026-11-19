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
import {
  MAX_BATCH_PHOTOS,
  MAX_PHOTO_PREVIEW_BYTES,
} from "../shared/listingPhotos.ts";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import type { ThreadAgent } from "./thread-agent.ts";
import type { ThreadTurn, ThreadTurnRequest } from "../shared/threadTurn.ts";
import { AgentError } from "./errors.ts";
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

const readingRequest: ThreadTurnRequest = {
  intent: "thread_turn",
  trigger: "reply",
  role: "seller",
  listing: { title: "Desk chair", price: 30, status: "active" },
  deal: null,
  messages: [
    {
      id: "m1",
      from: "them",
      text: "Hi! Could I get it for 20?",
      at: "2026-11-19T13:00:00.000Z",
    },
  ],
};
const reading: ThreadTurn = {
  forMessageId: "m1",
  summary: "{other} offers CHF 20.",
  language: "en",
  stance: "offer",
  facts: {},
  pickupAt: null,
  agreement: { status: "none", missing: [] },
  options: [
    {
      id: "opt-1",
      label: "Meet at CHF 25",
      kind: "counter",
      message: "Could we meet at CHF 25?",
      terms: null,
    },
  ],
};
const readerOf = (turn: ThreadAgent["turn"]): ThreadAgent => ({
  configured: true,
  turn,
});

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
        quota: async (userId, spend = false) => {
          assert.equal(userId, "alice");
          reservations.push(spend);
          return { allowed, limit: 50, remaining: allowed ? 49 : 0, resetAt };
        },
        spendReplyReading: async () => {
          throw new Error("Searches never spend reply readings");
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
      spendReplyReading: async () => {
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
        spendReplyReading: async () => {
          throw new Error("This test reads no replies");
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
          threads: readerOf(async () => {
            seen.push(owner);
            return reading;
          }),
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

test("HTTP gives a queued agent request the next available slot", async (t) => {
  let finished!: () => void;
  let entered!: () => void;
  const firstStarted = new Promise<void>((resolve) => { entered = resolve; });
  const firstGate = new Promise<void>((resolve) => { finished = resolve; });
  let starts = 0;
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async () => {
      if (++starts === 1) {
        entered();
        await firstGate;
      }
      return completion(output);
    }),
  });
  t.after(finished);
  const { url } = await startServer(t, service, { maxConcurrent: 1 });
  const assist = () => fetch(url + "/api/agent/assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: "search", text: "desk" }),
  });
  const first = assist();
  await firstStarted;
  const second = assist();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(starts, 1);
  finished();
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
  assert.equal(starts, 2);
});

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

test(
  "sorting the most photos, each at its full preview share, fits the request body limit",
  { timeout: 5000 },
  async (t) => {
    const preview = Buffer.alloc(Math.floor(MAX_PHOTO_PREVIEW_BYTES));
    preview.set([0xff, 0xd8, 0xff]);
    const images = Array<string>(MAX_BATCH_PHOTOS).fill(
      `data:image/jpeg;base64,${preview.toString("base64")}`,
    );
    const body = JSON.stringify({ images, itemCount: MAX_BATCH_PHOTOS });
    assert.ok(Buffer.byteLength(body) <= MAX_BODY_BYTES);
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(async () =>
        completion({ groups: images.map((_, index) => ({ photos: [index] })) }),
      ),
    });
    const { url } = await startServer(t, service);
    const response = await fetch(`${url}/api/agent/group-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).groups.length, MAX_BATCH_PHOTOS);
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
        spendReplyReading: async () => {
          throw new Error("This test reads no replies");
        },
      },
    },
  );
  const config = await (await fetch(`${instance.url}/api/config`)).json();
  assert.deepEqual(config, {
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "public-test-key",
  });
  for (const route of [
    "/api/agent/assist",
    "/api/agent/run",
    "/api/agent/thread",
  ])
    assert.equal(
      (await fetch(instance.url + route, { method: "POST", body: "{}" }))
        .status,
      401,
    );
  assert.equal(calls, 3);
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

const signedIn = {
  Authorization: "Bearer alice",
  "Content-Type": "application/json",
};

test("each reply reading spends one reading of its own allowance, only after its request is valid", async (t) => {
  let remaining = 2,
    readings = 0;
  const spent: string[] = [];
  const resetAt = new Date(Date.now() + 3600_000).toISOString();
  const { url } = await startServer(t, undefined, {
    cloud: {
      config: {
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "public-test-key",
      },
      authorize: async (header) => {
        if (header !== "Bearer alice")
          throw new AgentError(401, "AUTH_REQUIRED", "Sign in.");
        return "alice";
      },
      quota: async () => {
        throw new Error("Reading replies never spends searches");
      },
      spendReplyReading: async (userId) => {
        spent.push(userId);
        const allowed = remaining > 0;
        if (allowed) remaining--;
        return { allowed, limit: 150, remaining, resetAt };
      },
    },
    threads: readerOf(async () => {
      readings++;
      return reading;
    }),
  });
  const read = (body: unknown, headers: Record<string, string> = signedIn) =>
    fetch(`${url}/api/agent/thread`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  assert.equal(
    (await read(readingRequest, { "Content-Type": "application/json" })).status,
    401,
  );
  const invalid = await read({ ...readingRequest, messages: [] });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INVALID_THREAD_REQUEST");
  assert.deepEqual(spent, []);
  const first = await read(readingRequest);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), {
    turn: reading,
    allowance: { limit: 150, remaining: 1, resetAt },
  });
  assert.equal((await read(readingRequest)).status, 200);
  const exhausted = await read(readingRequest);
  assert.equal(exhausted.status, 429);
  assert.equal((await exhausted.json()).error.code, "THREAD_QUOTA_EXCEEDED");
  assert.ok(Number(exhausted.headers.get("Retry-After")) > 0);
  assert.equal(readings, 2);
  assert.deepEqual(spent, Array(3).fill("alice"));
});

test("the local demo reads replies without accounts, within the route's size, method and origin", async (t) => {
  const { url } = await startServer(t, undefined, {
    threads: readerOf(async () => reading),
  });
  const read = (init: RequestInit) =>
    fetch(`${url}/api/agent/thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  const local = await read({ body: JSON.stringify(readingRequest) });
  assert.equal(local.status, 200);
  assert.deepEqual(await local.json(), { turn: reading });
  const large = JSON.stringify({
    ...readingRequest,
    messages: [{ ...readingRequest.messages[0], text: "x".repeat(70_000) }],
  });
  assert.equal((await read({ body: large })).status, 413);
  assert.equal((await read({ method: "GET" })).status, 405);
  assert.equal(
    (
      await read({
        headers: {
          "Content-Type": "application/json",
          Origin: "https://untrusted.example",
        },
        body: JSON.stringify(readingRequest),
      })
    ).status,
    403,
  );
});

test("an account server without the reply reading update says so instead of reading", async (t) => {
  let readings = 0;
  const { url } = await startServer(t, undefined, {
    cloud: {
      config: {
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "public-test-key",
      },
      authorize: async () => "alice",
      quota: async () => {
        throw new Error("Reading replies never spends searches");
      },
      spendReplyReading: async () => {
        throw new AgentError(
          503,
          "THREAD_READING_UNAVAILABLE",
          "Pako can't read replies here yet.",
        );
      },
    },
    threads: readerOf(async () => {
      readings++;
      return reading;
    }),
  });
  const response = await fetch(`${url}/api/agent/thread`, {
    method: "POST",
    headers: signedIn,
    body: JSON.stringify(readingRequest),
  });
  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error.code,
    "THREAD_READING_UNAVAILABLE",
  );
  assert.equal(readings, 0);
});

test("deal messages keep one version and one receipt across HTTP retries",async(t)=>{
 const { createMessagesStore }=await import("./messages.ts");
 const messages=createMessagesStore(":memory:");
 t.after(()=>messages.close());
 const {url}=await startServer(t,undefined,{messages});
 const workspace=crypto.randomUUID();
 const send=(workspace:string,body:object)=>fetch(url+"/api/messages/deal",{method:"POST",headers:{"Content-Type":"application/json","X-Message-Workspace":workspace},body:JSON.stringify(body)});
 const terms={amount:25,fulfillment:"shipping",pickupTime:null,pickupAt:null,pickupPoint:null};
 const input={title:"Lamp",listingId:"lamp",seller:"Seller",sender:"buyer",messageId:crypto.randomUUID(),text:"CHF 25 shipped?",action:{type:"propose",terms},listingStatus:"active",expectedVersion:0};
 const first=await (await send(workspace,input)).json();
 assert.equal(first.conversation.deal.version,1);
 assert.deepEqual(await (await send(workspace,input)).json(),first);
 for(const [patch,key] of [[{text:"Another message"},"message_conflict"],[{messageId:crypto.randomUUID()},"deal_changed"]] as const){
 assert.equal((await (await send(workspace,{...input,...patch})).json()).error.code,key);
 }
 assert.equal(messages.list(workspace)[0].messages.length,1);
 assert.equal((await (await send(crypto.randomUUID(),{...input,sender:"seller"})).json()).error.code,"NO_CONVERSATION");
 assert.equal((await send(workspace,{...input,text:"x".repeat(65536)})).status,413);
});

test("reverse location validates its method, forwards rounded coordinates and throttles repeats", async (t) => {
  const originalFetch = globalThis.fetch;
  let lookups = 0;
  globalThis.fetch = (input, init) => {
    if (!(input instanceof URL) || input.hostname !== "nominatim.openstreetmap.org")
      return originalFetch(input, init);
    lookups++;
    assert.equal(input.pathname, "/reverse");
    assert.equal(input.searchParams.get("lat"), "46.520");
    assert.equal(input.searchParams.get("lon"), "6.567");
    assert.ok(init?.signal);
    return Promise.resolve(Response.json({
      address: { road: "Route Cantonale", postcode: "1015", town: "Lausanne" },
    }));
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const { url } = await startServer(t);
  const endpoint = url + "/api/location/reverse";
  const wrongMethod = await fetch(endpoint);
  assert.equal(wrongMethod.status, 405);
  assert.deepEqual(await wrongMethod.json(), {
    error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for location lookups." },
  });
  const unsupported = await fetch(endpoint, { method: "POST", body: "{}" });
  assert.equal(unsupported.status, 415);
  const lookup = () => fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: 46.5198, longitude: 6.5672 }),
  });
  const found = await lookup();
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), { location: "Route Cantonale, 1015 Lausanne" });
  const busy = await lookup();
  assert.equal(busy.status, 429);
  assert.equal(busy.headers.get("retry-after"), "2");
  assert.equal(lookups, 1);
});

test("cloud guards and preflight keep their precedence over route matching", async (t) => {
  let authChecks = 0;
  const unusedAllowance = async () => {
    throw new Error("No allowance should be read");
  };
  const { url } = await startServer(t, undefined, {
    cloud: {
      config: { supabaseUrl: "https://example.supabase.co", supabaseKey: "public-test-key" },
      authorize: async (header) => {
        authChecks++;
        if (!header) throw new AgentError(401, "AUTH_REQUIRED", "Sign in.");
        return "alice";
      },
      quota: unusedAllowance,
      spendReplyReading: unusedAllowance,
    },
  });
  const unknownAgent = url + "/api/agent/unknown";
  const preflight = await fetch(unknownAgent, { method: "OPTIONS" });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "GET, POST, PUT, DELETE, OPTIONS");
  assert.equal(authChecks, 0);
  assert.equal((await fetch(unknownAgent)).status, 401);
  assert.equal((await fetch(unknownAgent, { headers: { Authorization: "Bearer valid" } })).status, 404);
  assert.equal(authChecks, 2);
  assert.equal((await fetch(url + "/api/listings/unknown")).status, 410);
  const postingCheck = await fetch(url + "/api/listings/permission");
  assert.equal(postingCheck.status, 404);
  assert.equal((await postingCheck.json()).error.code, "admin_unavailable");
  for (const path of ["/api/health", "/api/config"])
    assert.equal((await fetch(url + path, { method: "POST" })).status, 404);
});
