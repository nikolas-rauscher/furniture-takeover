import test from "node:test";
import assert from "node:assert/strict";
import { AgentApiError, getAgentHealth, requestAgentAssist } from "./agent.ts";

const validResponse = {
  mode: "live",
  model: "deepseek-flash",
  suggestions: ["A desk under CHF 80"],
  missingDetails: ["What size should it be?"],
  metadata: { query: "desk", keywords: ["desk"] },
};

test("a proxy outage during a health check reports service connectivity, not a failed prompt", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Bad gateway", { status: 502 }),
  );
  await assert.rejects(getAgentHealth(), (error) => {
    assert.ok(error instanceof AgentApiError);
    assert.equal(error.status, 502);
    assert.equal(
      error.message,
      "The AI service is temporarily unavailable. Retry in a moment.",
    );
    return true;
  });
});

test("typing assistance sends the request and abort signal to the server", async (context) => {
  const controller = new AbortController();
  const request = {
    intent: "search" as const,
    text: "small desk",
    context: { maxPrice: 80 },
  };
  context.mock.method(
    globalThis,
    "fetch",
    async (path: string, options: RequestInit) => {
      assert.equal(path, "/api/agent/assist");
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(String(options.body)), request);
      assert.equal(options.signal, controller.signal);
      return Response.json(validResponse);
    },
  );
  assert.deepEqual(
    await requestAgentAssist(request, { signal: controller.signal }),
    validResponse,
  );
});

test("server errors retain their useful message and code", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Please wait a moment and try again.",
        },
      },
      { status: 429 },
    ),
  );
  await assert.rejects(
    requestAgentAssist({ intent: "search", text: "desk" }),
    (error) => {
      assert.ok(error instanceof AgentApiError);
      assert.equal(error.message, "Please wait a moment and try again.");
      assert.equal(error.code, "RATE_LIMITED");
      assert.equal(error.status, 429);
      return true;
    },
  );
});

test("a malformed success response cannot reach the suggestion renderer", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json({ ...validResponse, suggestions: [42] }),
  );
  await assert.rejects(requestAgentAssist({ intent: "search", text: "desk" }), {
    code: "INVALID_RESPONSE",
  });
});

test("network errors explain that writing can continue", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    requestAgentAssist({ intent: "listing", text: "wooden chair" }),
    {
      code: "NETWORK_ERROR",
      message:
        "The assistant is unavailable. You can keep writing and try again.",
    },
  );
});

test("cancellation stays a cancellation instead of becoming an unavailable error", async (context) => {
  const controller = new AbortController();
  controller.abort();
  const error = new DOMException("Aborted", "AbortError");
  context.mock.method(globalThis, "fetch", async () => {
    throw error;
  });
  await assert.rejects(
    requestAgentAssist(
      { intent: "search", text: "desk" },
      { signal: controller.signal },
    ),
    (value) => value === error,
  );
});

test("health exposes whether suggestions are live or a demo", async (context) => {
  const health = { mode: "live", configured: false, model: "deepseek-flash" };
  context.mock.method(globalThis, "fetch", async () => Response.json(health));
  assert.deepEqual(await getAgentHealth(), health);
});

test("malformed metadata cannot become search criteria or listing fields", async (context) => {
  for (const metadata of [
    { query: {} },
    { title: ["Desk"] },
    { maxPrice: "80" },
    { radius: -1 },
    { price: "free" },
    { condition: false },
    { dimensions: 120 },
    { pickupBy: "2026-02-30" },
    { pickupBy: "Friday" },
  ]) {
    const fetch = context.mock.method(globalThis, "fetch", async () =>
      Response.json({
        ...validResponse,
        metadata: { keywords: [], ...metadata },
      }),
    );
    await assert.rejects(
      requestAgentAssist({ intent: "search", text: "desk" }),
      {
        code: "INVALID_RESPONSE",
      },
    );
    fetch.mock.restore();
  }
});

test("nullable unknown listing details and a valid pickup date remain usable", async (context) => {
  const response = {
    ...validResponse,
    metadata: {
      keywords: [],
      price: null,
      condition: null,
      dimensions: null,
      pickupBy: "2026-10-16",
    },
  };
  context.mock.method(globalThis, "fetch", async () => Response.json(response));
  assert.deepEqual(
    await requestAgentAssist({ intent: "listing", text: "desk" }),
    response,
  );
});

test("an array cannot masquerade as an API mode", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json({
      mode: ["demo"],
      configured: false,
      model: "deepseek-flash",
    }),
  );
  await assert.rejects(getAgentHealth(), { code: "INVALID_RESPONSE" });
});

test("an explicitly cleared pickup deadline remains flexible", async (context) => {
  const response = {
    ...validResponse,
    metadata: { keywords: [], pickupBy: "" },
  };
  context.mock.method(globalThis, "fetch", async () => Response.json(response));
  const result = await requestAgentAssist({
    intent: "search",
    text: "any pickup date",
  });
  assert.equal(result.metadata.pickupBy, "");
});

test("cancelling while the response body is read remains a cancellation", async (context) => {
  const controller = new AbortController();
  const abort = new DOMException("Aborted", "AbortError");
  context.mock.method(
    globalThis,
    "fetch",
    async () =>
      ({
        ok: true,
        json: async () => {
          controller.abort(abort);
          throw abort;
        },
      }) as unknown as Response,
  );
  await assert.rejects(
    requestAgentAssist(
      { intent: "search", text: "desk" },
      { signal: controller.signal },
    ),
    (error) => error === abort,
  );
});
