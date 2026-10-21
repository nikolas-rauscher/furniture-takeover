import {
  toolCall,
  answer,
  createAgentRuntime,
  ownDesk,
  blankDraft,
  eventsFor,
} from "../testing/runtime.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import type { AgentRunEvent } from "../../shared/runs.ts";

test("missing keys and invalid input never call a provider or return demo success", async () => {
  const model = new MockLanguageModelV4();
  const runtime = createAgentRuntime({ apiKey: "", modelImpl: model });
  assert.deepEqual(runtime.health(), {
    configured: false,
    model: "deepseek-flash",
    webSearchConfigured: false,
  });
  const unavailable = await eventsFor(runtime, { text: "desk" });
  assert.deepEqual(
    unavailable.map((event) =>
      event.type === "error"
        ? { type: event.type, code: event.code, message: event.message }
        : event,
    ),
    [
      {
        type: "error",
        code: "AGENT_NOT_CONFIGURED",
        message: "Add the DeepSeek API key on the server to start the agent.",
      },
    ],
  );
  const invalid = await eventsFor(runtime, { text: "" });
  assert.equal(invalid[0].type, "error");
  assert.equal(model.doStreamCalls.length, 0);
});
test("eight-step tool limit stops real loop execution instead of reporting completion", async () => {
  let count = 0;
  const model = new MockLanguageModelV4({
    doStream: async () => {
      const step = ++count;
      return toolCall(
        step % 2 ? "inventory_search" : "show_takeover_listings",
        step % 2 ? { query: "desk" } : { ids: [] },
        `call-${step}`,
      );
    },
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "key", modelImpl: model }),
    { text: "desk", inventory: [ownDesk] },
  );
  assert.equal(count, 8);
  assert.ok(
    events.some(
      (event) => event.type === "error" && event.code === "STEP_LIMIT",
    ),
  );
  assert.equal(
    events.some((event) => event.type === "complete"),
    false,
  );
});
test("timeout aborts the SDK provider and never reports a completed run", async () => {
  let upstreamAborted = false;
  const guard = setTimeout(() => {}, 1000);
  const model = new MockLanguageModelV4({
    doStream: async ({ abortSignal }) =>
      new Promise((_resolve, reject) => {
        abortSignal?.addEventListener(
          "abort",
          () => {
            upstreamAborted = true;
            reject(new Error("aborted"));
          },
          { once: true },
        );
      }),
  });
  try {
    const events = await eventsFor(
      createAgentRuntime({ apiKey: "key", modelImpl: model, timeoutMs: 20 }),
      { text: "desk" },
    );
    assert.equal(upstreamAborted, true);
    assert.ok(
      events.some(
        (event) => event.type === "error" && event.code === "AGENT_TIMEOUT",
      ),
    );
    assert.equal(
      events.some((event) => event.type === "complete"),
      false,
    );
  } finally {
    clearTimeout(guard);
  }
});
test("caller cancellation propagates to SDK work and does not emit late completion", async () => {
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let upstreamAborted = false;
  const model = new MockLanguageModelV4({
    doStream: async ({ abortSignal }) =>
      new Promise((_resolve, reject) => {
        entered();
        abortSignal?.addEventListener(
          "abort",
          () => {
            upstreamAborted = true;
            reject(new Error("cancelled"));
          },
          { once: true },
        );
      }),
  });
  const events: AgentRunEvent[] = [];
  const controller = new AbortController();
  const pending = createAgentRuntime({ apiKey: "key", modelImpl: model }).run(
    { text: "desk" },
    (event) => {
      events.push(event);
    },
    controller.signal,
  );
  await started;
  controller.abort();
  await pending;
  assert.equal(upstreamAborted, true);
  assert.equal(
    events.some((event) => event.type === "complete"),
    false,
  );
});
test("a provider that skips required search cannot claim successful completion", async () => {
  const model = new MockLanguageModelV4({
    doStream: answer("Try a nearby marketplace."),
  });
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "key",
      braveApiKey: "required-search-key",
      modelImpl: model,
    }),
    { text: "desk" },
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "error" &&
        ["SEARCH_NOT_EXECUTED", "AGENT_UNAVAILABLE"].includes(event.code),
    ),
  );
  assert.equal(
    events.some((event) => event.type === "complete"),
    false,
  );
});
test("production DeepSeek provider uses tool calling and non-thinking mode without exposing failures", async (t) => {
  const logged = t.mock.method(console, "error", () => {});
  let sent: Record<string, unknown> = {};
  const runtime = createAgentRuntime({
    apiKey: "test-secret",
    braveApiKey: "production-provider-key",
    fetchImpl: async (_input, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response("private account data", { status: 401 });
    },
  });
  const events = await eventsFor(runtime, { text: "desk" });
  assert.equal(sent.model, "deepseek-flash");
  assert.deepEqual(sent.thinking, { type: "disabled" });
  assert.equal(sent.stream, true);
  assert.equal(sent.tool_choice, "required");
  assert.ok(events.some((event) => event.type === "error"));
  assert.equal(JSON.stringify(events).includes("private account data"), false);
  assert.equal(JSON.stringify(events).includes("test-secret"), false);
  assert.equal(logged.mock.calls.length, 1);
  const diagnostics = JSON.stringify(
    logged.mock.calls.map((call) => call.arguments),
  );
  assert.equal(diagnostics.includes("private account data"), false);
  assert.equal(diagnostics.includes("test-secret"), false);
  const failure = events.find((event) => event.type === "error");
  assert.equal(
    failure?.type === "error" && failure.diagnostic?.providerStatus,
    401,
  );
});
test("cancellation at an action boundary emits no late listing patch", async () => {
  const controller = new AbortController();
  const model = new MockLanguageModelV4({
    doStream: toolCall(
      "update_listing",
      {
        patch: { title: "desk" },
        reason: "Use your text",
        evidence: [{ kind: "seller", quote: "desk" }],
      },
      "cancelled-action",
    ),
  });
  const events: AgentRunEvent[] = [];
  await createAgentRuntime({
    apiKey: "cancelled-action-key",
    modelImpl: model,
  }).run(
    {
      text: "desk",
      context: { intent: "listing_assist", currentDraft: blankDraft },
    },
    (event) => {
      events.push(event);
      if (
        event.type === "status" &&
        event.id === "cancelled-action" &&
        event.state === "running"
      )
        controller.abort();
    },
    controller.signal,
  );
  assert.equal(
    events.some(
      (event) => event.type === "listing_patch" || event.type === "complete",
    ),
    false,
  );
});
