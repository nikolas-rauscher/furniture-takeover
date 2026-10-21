import test from "node:test";
import assert from "node:assert/strict";
import type { AgentRunEvent, AgentRunRequest } from "../../shared/runs.ts";
import { readAgentRunStream, safeSourceUrl, streamAgentRun } from "./runs.ts";

const encoder = new TextEncoder();
const source = {
  id: "web-1",
  title: "A chair in Genève",
  url: "https://example.com/chair",
  snippet: "A real returned result.",
};
const complete: AgentRunEvent = {
  type: "complete",
  text: "Genève 🪑",
  sources: [source],
  runId: "run-1",
};

function body(
  lines: AgentRunEvent[],
  fragmentSize = 1024,
  finalNewline = true,
) {
  const bytes = encoder.encode(
    lines.map((line) => JSON.stringify(line)).join("\n") +
      (finalNewline ? "\n" : ""),
  );
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += fragmentSize)
        controller.enqueue(bytes.slice(offset, offset + fragmentSize));
      controller.close();
    },
  });
}

test("stream accepts bounded inventory snapshots and rejects malformed or duplicate IDs", async () => {
  const events: AgentRunEvent[] = [];
  await readAgentRunStream(
    body([
      { type: "inventory_matches", ids: ["own-bike"] },
      { type: "inventory_matches", ids: [] },
      complete,
    ]),
    (event) => events.push(event),
  );
  assert.deepEqual(
    events.filter((event) => event.type === "inventory_matches"),
    [
      { type: "inventory_matches", ids: ["own-bike"] },
      { type: "inventory_matches", ids: [] },
    ],
  );
  for (const ids of [
    ["own-bike", "own-bike"],
    [""],
    ["x".repeat(121)],
    ["bike\n"],
    [4],
    Array.from({ length: 13 }, (_, index) => String(index)),
  ]) {
    await assert.rejects(
      readAgentRunStream(
        body([{ type: "inventory_matches", ids } as AgentRunEvent, complete]),
        () => {},
      ),
      { code: "INVALID_STREAM" },
    );
  }
});

test("NDJSON handles every byte boundary, including fragmented emoji and accented UTF-8", async () => {
  const input: AgentRunEvent[] = [
    {
      type: "status",
      id: "search-1",
      label: "Searching the web",
      state: "running",
    },
    { type: "text_delta", text: "Genève " },
    { type: "text_delta", text: "🪑" },
    { type: "sources", sources: [source] },
    complete,
  ];
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body(input, 1), (event) => seen.push(event));
  assert.deepEqual(seen, input);
});

test("stream accepts a listing step awaiting seller details without turning it into an error", async () => {
  const needsInput: AgentRunEvent = {
    type: "status",
    id: "books-update",
    label: "Preparing listing changes",
    state: "needs_input",
  };
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body([needsInput, complete]), (event) =>
    seen.push(event),
  );
  assert.deepEqual(seen, [needsInput, complete]);
});

test("a final complete event does not require a trailing newline", async () => {
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body([complete], 3, false), (event) =>
    seen.push(event),
  );
  assert.deepEqual(seen, [complete]);
});

test("source limits apply to each authoritative scope, not discarded earlier platforms", async () => {
  const oldScope = Array.from({ length: 30 }, (_, index) => ({
    ...source,
    id: `web-${index + 1}`,
    url: `https://old.example.com/offer/${index}`,
  }));
  const newScope = Array.from({ length: 30 }, (_, index) => ({
    ...source,
    id: `web-${index + 31}`,
    url: `https://new.example.com/offer/${index}`,
  }));
  const events: AgentRunEvent[] = [
    { type: "sources", sources: oldScope },
    { type: "sources", sources: [] },
    { type: "sources", sources: newScope },
    { ...complete, sources: newScope },
  ];
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body(events), (event) => seen.push(event));
  assert.deepEqual(seen, events);
});

test("questions and grounded field proposals arrive before the terminal completion", async () => {
  const events: AgentRunEvent[] = [
    {
      type: "listing_patch",
      id: "patch-1",
      patch: { title: "Oak desk", price: 0, pickup: "" },
      reason: "Details you supplied.",
      evidence: [{ kind: "seller", quote: "Oak desk, free to collect" }],
      requiresAcceptance: false,
    },
    {
      type: "preferences_patch",
      id: "prefs-1",
      patch: { query: "desk", maxPrice: 0, radius: 5 },
      reason: "Your search preferences.",
      evidence: [{ kind: "seller", quote: "A free desk within 5 km" }],
    },
    {
      type: "question",
      id: "question-1",
      question: "What condition is it in?",
      choices: ["Good", "Used"],
    },
    { ...complete, text: "What condition is it in?" },
  ];
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body(events, 2), (event) => seen.push(event));
  assert.deepEqual(seen, events);
});

test("only allowed listing patch fields are exposed to application callbacks", async () => {
  const action = {
    type: "listing_patch",
    id: "patch-1",
    patch: {
      title: "Desk",
      image: "private-photo",
      raw: "overwrite seller notes",
      execute: "alert(1)",
    },
    reason: "Your item name.",
    evidence: [{ kind: "seller", quote: "Desk" }],
    requiresAcceptance: false,
  } as unknown as AgentRunEvent;
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body([action, complete]), (event) =>
    seen.push(event),
  );
  assert.equal(seen[0].type, "listing_patch");
  if (seen[0].type === "listing_patch")
    assert.deepEqual(seen[0].patch, { title: "Desk" });
});

test("malformed questions, ungrounded patches, and unaccepted research prices are rejected", async () => {
  const valid = {
    type: "listing_patch",
    id: "patch-1",
    patch: { title: "Desk" },
    reason: "Your item name.",
    evidence: [{ kind: "seller", quote: "Desk" }],
    requiresAcceptance: false,
  };
  const invalid = [
    { type: "question", id: "q", question: "x".repeat(501) },
    {
      type: "question",
      id: "q",
      question: "Which?",
      choices: Array(6).fill("Choice"),
    },
    { ...valid, patch: { price: 10_001 } },
    { ...valid, patch: { description: "d".repeat(4001) } },
    { ...valid, patch: { pickup: "2026-02-30" } },
    { ...valid, patch: { image: "private-photo" } },
    { ...valid, evidence: [] },
    { ...valid, evidence: Array(9).fill({ kind: "seller", quote: "Desk" }) },
    {
      ...valid,
      patch: { price: 50 },
      evidence: [{ kind: "source", sourceId: "web-1", quote: "CHF 50" }],
    },
    {
      ...valid,
      patch: { price: 50, title: "Desk" },
      requiresAcceptance: true,
      evidence: [{ kind: "source", sourceId: "web-1", quote: "CHF 50" }],
    },
    {
      type: "preferences_patch",
      id: "p",
      patch: { radius: 501 },
      reason: "Your preferences.",
      evidence: [{ kind: "seller", quote: "500 km" }],
    },
    {
      type: "preferences_patch",
      id: "p",
      patch: { radius: 5 },
      reason: "Your preferences.",
      evidence: [{ kind: "source", sourceId: "web-1", quote: "5 km" }],
    },
  ];
  for (const event of invalid)
    await assert.rejects(
      readAgentRunStream(body([event as AgentRunEvent, complete]), () => {}),
      { code: "INVALID_STREAM" },
    );
});

test("duplicate action IDs cannot trigger the same field update twice", async () => {
  const question: AgentRunEvent = {
    type: "question",
    id: "same-id",
    question: "What is your budget?",
  };
  const seen: AgentRunEvent[] = [];
  await assert.rejects(
    readAgentRunStream(body([question, question, complete]), (event) =>
      seen.push(event),
    ),
    { code: "INVALID_STREAM" },
  );
  assert.deepEqual(seen, [question]);
});

test("listing-assist context sends only typed current draft facts and the previous question", async (context) => {
  const draft = {
    title: "Desk",
    description: "",
    price: null,
    condition: "",
    dimensions: "",
    location: "Lausanne",
    pickup: "",
    raw: "An oak desk",
    image: "data:image/png;base64,private-photo",
  };
  context.mock.method(
    globalThis,
    "fetch",
    async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(String(options.body));
      assert.equal(payload.context.intent, "listing_assist");
      assert.equal(
        payload.context.previousQuestion,
        "  What condition is it in?  ",
      );
      assert.deepEqual(payload.context.currentDraft, {
        title: "Desk",
        description: "",
        price: null,
        condition: "",
        dimensions: "",
        location: "Lausanne",
        pickup: "",
        raw: "An oak desk",
      });
      return new Response(body([complete]));
    },
  );
  await streamAgentRun(
    {
      text: "Some scratches",
      context: {
        intent: "listing_assist",
        previousQuestion: "  What condition is it in?  ",
        currentDraft: draft,
      },
    },
    { onEvent() {} },
  );
});

test("real HTTPS thumbnails survive source and completion events", async () => {
  const imageUrl = "https://images.example.com/chair.jpg";
  const result = { ...source, imageUrl };
  const input: AgentRunEvent[] = [
    { type: "sources", sources: [result] },
    { ...complete, sources: [result] },
  ];
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body(input, 3), (event) => seen.push(event));
  assert.deepEqual(seen, input);
  assert.equal(
    seen[0].type === "sources" && seen[0].sources[0].url,
    source.url,
  );
});

test("an unsafe or malformed optional thumbnail is removed without losing the source", async () => {
  for (const imageUrl of [
    "http://images.example.com/chair.jpg",
    "javascript:alert(1)",
    "https://user:pass@images.example.com/chair.jpg",
    "data:image/png;base64,abc",
    "https://images.example.com/" + "x".repeat(4096),
    42,
    null,
  ]) {
    const seen: AgentRunEvent[] = [];
    const result = { ...source, imageUrl } as unknown as typeof source;
    await readAgentRunStream(
      body([
        { type: "sources", sources: [result] },
        { ...complete, sources: [result] },
      ]),
      (event) => seen.push(event),
    );
    assert.deepEqual(seen, [{ type: "sources", sources: [source] }, complete]);
  }
});

test("a closed stream with partial text is an incomplete response, not success", async () => {
  await assert.rejects(
    readAgentRunStream(
      body([{ type: "text_delta", text: "Partial answer" }]),
      () => {},
    ),
    { code: "INCOMPLETE_STREAM" },
  );
});

test("error events preserve their actionable message", async () => {
  const seen: AgentRunEvent[] = [];
  const error: AgentRunEvent = {
    type: "error",
    code: "WEB_SEARCH_UNAVAILABLE",
    message: "Web search is unavailable. Please try again.",
  };
  await assert.rejects(
    readAgentRunStream(body([error]), (event) => seen.push(event)),
    { code: error.code, message: error.message },
  );
  assert.deepEqual(seen, [error]);
});

test("unsafe source URLs and malformed events cannot reach the UI", async () => {
  const stream = body([
    { ...complete, sources: [{ ...source, url: "javascript:alert(1)" }] },
  ]);
  const seen: AgentRunEvent[] = [];
  await assert.rejects(
    readAgentRunStream(stream, (event) => seen.push(event)),
    { code: "INVALID_STREAM" },
  );
  assert.equal(seen.length, 0);
  assert.equal(safeSourceUrl("http://example.com"), null);
  assert.equal(safeSourceUrl("https://user:password@example.com"), null);
  assert.equal(
    safeSourceUrl("https://example.com/item"),
    "https://example.com/item",
  );
  await assert.rejects(
    readAgentRunStream(
      body([{ type: "unknown" } as unknown as AgentRunEvent]),
      () => {},
    ),
    { code: "INVALID_STREAM" },
  );
});

test("a growing unterminated line and cumulative text are bounded", async () => {
  const longLine = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode("x".repeat(160_001)));
      controller.close();
    },
  });
  await assert.rejects(
    readAgentRunStream(longLine, () => {}),
    { code: "INVALID_STREAM" },
  );
  await assert.rejects(
    readAgentRunStream(
      body([
        { type: "text_delta", text: "a".repeat(60_000) },
        { type: "text_delta", text: "a".repeat(60_000) },
      ]),
      () => {},
    ),
    { code: "INVALID_STREAM" },
  );
});

test("cancellation releases a blocked reader and does not emit more events", async () => {
  const controller = new AbortController();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const read = readAgentRunStream(
    stream,
    () => assert.fail("no events expected"),
    controller.signal,
  );
  controller.abort();
  await assert.rejects(read, { name: "AbortError" });
  assert.equal(cancelled, true);
  assert.equal(stream.locked, false);
});

test("run requests send only the declared inventory fields, never listing photos", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      assert.equal(url, "/api/agent/run");
      assert.equal(options.method, "POST");
      const payload = JSON.parse(String(options.body));
      assert.deepEqual(payload.inventory, [
        {
          id: "own-1",
          title: "Chair",
          price: 30,
          description: "Blue chair",
          location: "Lausanne",
        },
      ]);
      return new Response(body([complete]), {
        headers: { "Content-Type": "application/x-ndjson" },
      });
    },
  );
  const item = {
    id: "own-1",
    title: "Chair",
    price: 30,
    description: "Blue chair",
    location: "Lausanne",
    image: "data:image/png;base64,private-photo",
    seller: "Personal data",
  };
  await streamAgentRun(
    { text: "Find a chair", inventory: [item] },
    { onEvent() {} },
  );
});

test("HTTP failures expose the server message instead of attempting an NDJSON stream", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        error: {
          code: "NOT_CONFIGURED",
          message: "The agent is not configured yet.",
        },
      },
      { status: 503 },
    ),
  );
  await assert.rejects(
    streamAgentRun({ text: "Find a chair" }, { onEvent() {} }),
    { code: "NOT_CONFIGURED", message: "The agent is not configured yet." },
  );
});

test("follow-up answers and structured preferences survive projection without extra client state", async (context) => {
  const previousAnswer = "  A chair from the last response.\n[web-1]\n";
  const originalRequest = `  ${"Desk ".repeat(799)}  \n`;
  assert.equal(originalRequest.length, 4000);
  context.mock.method(
    globalThis,
    "fetch",
    async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(String(options.body));
      assert.deepEqual(payload.context, {
        location: "Lausanne",
        currentQuery: "oak chair",
        previousAnswer,
        originalRequest,
        maxPrice: 80,
        radius: 5,
        pickupBy: "2026-10-16",
        condition: "Good",
        source: "Any marketplace",
        intent: "listing_review",
      });
      assert.equal("image" in payload, false);
      return new Response(body([complete]));
    },
  );
  const details = {
    location: " Lausanne ",
    currentQuery: " oak chair ",
    previousAnswer,
    originalRequest,
    maxPrice: 80,
    radius: 5,
    pickupBy: "2026-10-16",
    condition: " Good ",
    source: " Any marketplace ",
    intent: "listing_review" as const,
    image: "data:image/png;base64,private-photo",
    account: "private-account",
  };
  await streamAgentRun(
    { text: "Review this listing", context: details },
    { onEvent() {} },
  );
});

test("budget intent survives request projection and malformed intent is rejected", async (context) => {
  const sent: unknown[] = [];
  context.mock.method(
    globalThis,
    "fetch",
    async (_url: string, options: RequestInit) => {
      sent.push(JSON.parse(String(options.body)).context.budgetSpecified);
      return new Response(body([complete]));
    },
  );
  for (const budgetSpecified of [false, true]) {
    await streamAgentRun(
      { text: "Find a desk", context: { budgetSpecified, maxPrice: 500 } },
      { onEvent() {} },
    );
  }
  assert.deepEqual(sent, [false, true]);
  await assert.rejects(
    streamAgentRun(
      {
        text: "Find a desk",
        context: { budgetSpecified: "false" },
      } as unknown as AgentRunRequest,
      { onEvent() {} },
    ),
    { code: "INVALID_CONTEXT" },
  );
  assert.equal(sent.length, 2);
});

test("zero preferences and flexible pickup remain explicit", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async (_url: string, options: RequestInit) => {
      assert.deepEqual(JSON.parse(String(options.body)).context, {
        maxPrice: 0,
        radius: 0,
        pickupBy: "",
        condition: "",
        source: "",
        currentQuery: "",
        previousAnswer: "",
        intent: "search",
      });
      return new Response(body([complete]));
    },
  );
  await streamAgentRun(
    {
      text: "Free items",
      context: {
        maxPrice: 0,
        radius: 0,
        pickupBy: "",
        condition: "",
        source: "",
        currentQuery: "",
        previousAnswer: "",
        intent: "search",
      },
    },
    { onEvent() {} },
  );
});

test("invalid or oversized preferences are rejected before a request is sent", async (context) => {
  const fetchMock = context.mock.method(globalThis, "fetch", async () => {
    throw new Error("No network request expected");
  });
  const invalid = [
    { radius: -1 },
    { radius: 501 },
    { maxPrice: Number.NaN },
    { maxPrice: 1_000_001 },
    { maxPrice: "80" },
    { pickupBy: "2026-02-30" },
    { pickupBy: "tomorrow" },
    { intent: "publish" },
    { source: "s".repeat(121) },
    { condition: "c".repeat(121) },
    { previousAnswer: "a".repeat(6001) },
    { originalRequest: "a".repeat(4001) },
    { currentQuery: "q".repeat(501) },
    null,
  ];
  for (const value of invalid) {
    await assert.rejects(
      streamAgentRun(
        { text: "Find a chair", context: value as AgentRunRequest["context"] },
        { onEvent() {} },
      ),
      { code: "INVALID_CONTEXT" },
    );
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("stream transports agent-requested price sliders and rejects invalid ranges", async () => {
  const question: AgentRunEvent = {
    type: "question",
    id: "price",
    question: "Choose an asking price",
    input: { type: "price", min: 0, max: 100, step: 1, value: 20 },
  };
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body([question, complete]), (event) =>
    seen.push(event),
  );
  assert.deepEqual(seen[0], question);
  for (const input of [
    { type: "price", min: 0, max: 100, step: 0 },
    { type: "price", min: 100, max: 50, step: 1 },
    { type: "price", min: 0, max: 100, step: 1, value: 200 },
  ]) {
    await assert.rejects(
      readAgentRunStream(
        body([{ ...question, input } as AgentRunEvent, complete]),
        () => {},
      ),
    );
  }
});

test("offer suggestions accept bounded listing IDs and reject malformed payloads", async () => {
  const suggestion: AgentRunEvent = {
    type: "offer_suggestion",
    listingId: "own-desk",
  };
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body([suggestion, complete]), (event) =>
    seen.push(event),
  );
  assert.deepEqual(seen, [suggestion, complete]);
  for (const listingId of ["", "x".repeat(121), "desk\n", 4]) {
    await assert.rejects(
      readAgentRunStream(
        body([
          { type: "offer_suggestion", listingId } as AgentRunEvent,
          complete,
        ]),
        () => {},
      ),
      { code: "INVALID_STREAM" },
    );
  }
});

test("negotiation snapshots reject stale draft messages and preserve review-only state", async () => {
  const { newNegotiation, prepareNegotiation } =
    await import("../../shared/negotiation.ts");
  const proposal = prepareNegotiation(
    newNegotiation("proposal", "desk"),
    "Desk",
    1,
  );
  const event: AgentRunEvent = {
    type: "negotiation_update",
    previousVersion: 1,
    negotiation: proposal,
  };
  const seen: AgentRunEvent[] = [];
  await readAgentRunStream(body([event, complete], 1), (event) =>
    seen.push(event),
  );
  assert.deepEqual(seen, [event, complete]);
  await assert.rejects(
    readAgentRunStream(
      body([{ ...event, previousVersion: 0 }, complete]),
      () => {},
    ),
    { code: "INVALID_STREAM" },
  );
  await assert.rejects(
    readAgentRunStream(
      body([
        {
          ...event,
          negotiation: {
            ...proposal,
            draft: { message: "Old offer", version: 1 },
          },
        },
        complete,
      ]),
      () => {},
    ),
    { code: "INVALID_STREAM" },
  );
});

test("transport retains proposal facts and seller pickup point without leaking full product data", async (context) => {
  const { newNegotiation } = await import("../../shared/negotiation.ts");
  const negotiation = newNegotiation("proposal", "desk");
  let payload: AgentRunRequest | undefined;
  context.mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init: RequestInit) => {
      payload = JSON.parse(String(init.body));
      return new Response(body([complete]), { status: 200 });
    },
  );
  await streamAgentRun(
    {
      text: "Saturday at 15:00",
      context: {
        intent: "negotiation",
        negotiation,
        recentMessages: [{ role: "user", text: "CHF 70" }],
      },
      inventory: [
        {
          id: "desk",
          title: "Desk",
          price: 80,
          description: "Pickup only.",
          location: "Lausanne",
          pickupArrangement: "Saturday afternoons",
          pickupPoint: "EPFL library entrance",
        },
      ],
    },
    { onEvent() {} },
  );
  assert.deepEqual(payload?.context?.negotiation, negotiation);
  assert.equal(payload?.context?.intent, "negotiation");
  assert.equal(payload?.inventory?.[0].pickupPoint, "EPFL library entrance");
  assert.deepEqual(payload?.context?.recentMessages, [
    { role: "user", text: "CHF 70" },
  ]);
});
