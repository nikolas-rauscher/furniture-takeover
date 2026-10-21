import {
  toolCall,
  answer,
  createAgentRuntime,
  ownDesk,
  eventsFor,
} from "../testing/runtime.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import {
  inventorySearch,
  selectTakeoverListings,
  validateRunRequest,
} from "../runtime.ts";

test("takeover curation accepts only observed IDs within the current budget", () => {
  const observed = new Map([[ownDesk.id, ownDesk]]);
  assert.deepEqual(selectTakeoverListings([ownDesk.id], observed, 80), [
    ownDesk.id,
  ]);
  assert.deepEqual(selectTakeoverListings([], observed, 80), []);
  for (const ids of [["made-up"], [ownDesk.id, ownDesk.id]])
    assert.throws(() => selectTakeoverListings(ids, observed, 80), {
      code: "INVALID_INVENTORY_SELECTION",
    });
  assert.throws(() => selectTakeoverListings([ownDesk.id], observed, 60), {
    code: "INVALID_INVENTORY_SELECTION",
  });
  assert.throws(() => selectTakeoverListings([ownDesk.id], new Map()), {
    code: "INVALID_INVENTORY_SELECTION",
  });
});
test("agent-selected takeover cards replace keyword candidates and exclude accessories", async () => {
  const lamp = {
    ...ownDesk,
    id: "own-desk-lamp",
    title: "Desk lamp",
    price: 20,
  };
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "inventory_search",
        { query: "desk", maxPrice: 120 },
        "find-desks",
      ),
      toolCall("show_takeover_listings", { ids: [ownDesk.id] }, "choose-desks"),
      answer("The white desk is CHF 65. The desk lamp is not a desk."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
    {
      text: "Find a desk under CHF 120. Only our listings.",
      context: { maxPrice: 120, source: "takeover" },
      inventory: [ownDesk, lamp],
    },
  );
  assert.deepEqual(
    events.filter((event) => event.type === "inventory_matches"),
    [
      { type: "inventory_matches", ids: [ownDesk.id, lamp.id] },
      { type: "inventory_matches", ids: [ownDesk.id] },
    ],
  );
  assert.deepEqual(model.doStreamCalls[1].toolChoice, { type: "required" });
  assert.deepEqual(
    model.doStreamCalls[1].tools?.map((tool) => tool.name),
    ["show_takeover_listings"],
  );
  assert.equal(model.doStreamCalls[2].toolChoice?.type, "auto");
});
test("unknown IDs cannot produce offer cards and the agent can recover with an observed subset", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("inventory_search", { query: "desk" }, "find-existing"),
      toolCall(
        "show_takeover_listings",
        { ids: ["invented-desk"] },
        "invalid-selection",
      ),
      toolCall(
        "show_takeover_listings",
        { ids: [ownDesk.id] },
        "valid-selection",
      ),
      answer("A white desk is available on takeover."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
    {
      text: "Find a desk",
      context: { source: "takeover" },
      inventory: [ownDesk],
    },
  );
  assert.ok(
    !events.some(
      (event) =>
        event.type === "inventory_matches" &&
        event.ids.includes("invented-desk"),
    ),
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "status" &&
        event.id === "invalid-selection" &&
        event.state === "error",
    ),
  );
  assert.deepEqual(
    events.filter((event) => event.type === "inventory_matches").at(-1),
    { type: "inventory_matches", ids: [ownDesk.id] },
  );
  assert.ok(events.some((event) => event.type === "complete"));
});
test("inventory match events use actual tool rows and cannot exceed the saved budget", async () => {
  for (const maxPrice of [undefined, 100]) {
    const model = new MockLanguageModelV4({
      doStream: [
        toolCall(
          "inventory_search",
          { query: "desk", ...(maxPrice === undefined ? {} : { maxPrice }) },
          "inventory-budget",
        ),
        answer("No matching takeover offers within your budget."),
      ],
    });
    const events = await eventsFor(
      createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
      {
        text: "Find a desk",
        context: { maxPrice: 60, source: "takeover" },
        inventory: [ownDesk],
      },
    );
    assert.deepEqual(
      events.filter((event) => event.type === "inventory_matches"),
      [{ type: "inventory_matches", ids: [] }],
    );
    assert.ok(
      !JSON.stringify(model.doStreamCalls[1].prompt).includes(
        '"items":[{"id":"own-desk"',
      ),
    );
  }
});
test("inventory searches return only supplied records and never excluded accessories", () => {
  assert.deepEqual(inventorySearch([ownDesk], "chair"), []);
  assert.deepEqual(inventorySearch([ownDesk], "white desk", 60), []);
  assert.deepEqual(inventorySearch([ownDesk], "white desk", 80), [ownDesk]);
  assert.deepEqual(inventorySearch([], ""), []);
  assert.throws(() =>
    validateRunRequest({ text: "desk", inventory: [ownDesk, ownDesk] }),
  );
  assert.throws(() =>
    validateRunRequest({
      text: "desk",
      inventory: [{ ...ownDesk, price: -10 }],
    }),
  );
  assert.equal(
    "private" in
      (validateRunRequest({
        text: "desk",
        private: "not projected",
      }) as object),
    false,
  );
});
test("structured search preferences retain free values and reject invalid constraints", () => {
  const context = {
    location: "Lausanne",
    currentQuery: "desk",
    maxPrice: 0,
    radius: 0,
    pickupBy: "",
    condition: "Seller-restored",
    source: "Neighbourhood exchange",
    originalRequest: "  Find a small desk that fits a 90cm gap.  ",
    intent: "search" as const,
  };
  assert.deepEqual(
    validateRunRequest({ text: "Find a desk", context }).context,
    context,
  );
  assert.equal(
    validateRunRequest({ text: "desk", context: { pickupBy: "2028-02-29" } })
      .context?.pickupBy,
    "2028-02-29",
  );
  for (const invalid of [
    { maxPrice: -1 },
    { maxPrice: 1_000_001 },
    { radius: 501 },
    { radius: Infinity },
    { pickupBy: "2027-02-29" },
    { pickupBy: "Friday" },
    { condition: "x".repeat(121) },
    { source: "x".repeat(121) },
    { intent: "publish" },
    { originalRequest: "x".repeat(4001) },
  ])
    assert.throws(() => validateRunRequest({ text: "desk", context: invalid }));
});
test("the actual SDK request carries area and preferences alongside the latest user refinement", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "inventory_search",
        { query: "desk", maxPrice: 40 },
        "filtered-inventory",
      ),
      toolCall("show_takeover_listings", { ids: [] }, "no-local-matches"),
      answer("No matching local listings found."),
    ],
  });
  const context = {
    location: "Lausanne",
    currentQuery: "white desk under CHF 80",
    maxPrice: 80,
    radius: 5,
    pickupBy: "2026-10-20",
    condition: "Used",
    source: "takeover",
    originalRequest: "Find a white desk under CHF 80 near Lausanne",
  };
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "context-model-key",
      braveApiKey: "context-search-key",
      modelImpl: model,
      fetchImpl: async () => {
        throw new Error("Own-only must not fetch external data");
      },
    }),
    {
      text: "Make the budget CHF 40 and pickup flexible",
      context,
      inventory: [ownDesk],
    },
  );
  assert.deepEqual(model.doStreamCalls[0].toolChoice, { type: "required" });
  const user = model.doStreamCalls[0].prompt.find(
    (message) => message.role === "user",
  );
  assert.ok(user?.role === "user");
  const content = user.content.find((part) => part.type === "text");
  assert.ok(content?.type === "text");
  const payload = JSON.parse(content.text);
  assert.deepEqual(payload.context, context);
  assert.equal(payload.text, "Make the budget CHF 40 and pickup flexible");
  assert.equal(
    model.doStreamCalls[0].tools?.some((entry) => entry.name === "web_search"),
    false,
  );
  assert.ok(events.some((event) => event.type === "complete"));
});
test("preference tools apply explicit constraints while leaving external research optional", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_search_preferences",
        {
          patch: { query: "desk", maxPrice: 80, radius: 5 },
          reason: "Use your requirements.",
          evidence: [
            { kind: "seller", quote: "desk under CHF 80 within 5 km" },
          ],
        },
        "set-preferences",
      ),
      toolCall(
        "web_search",
        { query: "bureau occasion Lausanne CHF 80" },
        "search-after-preferences",
      ),
      answer("No matching offers were returned."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "preferences-model-key",
      braveApiKey: "preferences-search-key",
      modelImpl: model,
      fetchImpl: async () => Response.json({ web: { results: [] } }),
    }),
    { text: "desk under CHF 80 within 5 km" },
  );
  assert.ok(events.some((event) => event.type === "preferences_patch"));
  assert.deepEqual(model.doStreamCalls[1].toolChoice, { type: "auto" });
  assert.ok(
    model.doStreamCalls[1].tools?.some((tool) => tool.name === "web_search"),
  );
  assert.ok(events.some((event) => event.type === "complete"));
});
test("initial catalog scan includes all active supplied records and preserves demo identity", async () => {
  const inventory = Array.from({ length: 20 }, (_, i) => ({
    ...ownDesk,
    id: `item-${i}`,
    demo: true,
  }));
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("inventory_search", { query: "desk" }, "local-first"),
      toolCall(
        "show_takeover_listings",
        { ids: ["item-0", "item-1"] },
        "curate-local",
      ),
      answer("Demo listings on takeover."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    { text: "desk", inventory },
  );
  const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
  assert.match(prompt, /item-19/);
  assert.match(prompt, /demo/);
  assert.ok(events.some((event) => event.type === "complete"));
});
test("local samples remain eligible and common multilingual queries find them", () => {
  const espresso = {
    ...ownDesk,
    id: "espresso",
    title: "Espresso machine",
    description: "Coffee maker",
    demo: true,
    price: 70,
  };
  assert.deepEqual(inventorySearch([espresso], "coffee machine", 100), [
    espresso,
  ]);
  assert.deepEqual(inventorySearch([espresso], "caffee", 100), [espresso]);
  const mirror = {
    ...ownDesk,
    id: "mirror",
    title: "Full-length mirror",
    description: "Standing mirror",
  };
  assert.deepEqual(inventorySearch([mirror], "speigle"), [mirror]);
});
