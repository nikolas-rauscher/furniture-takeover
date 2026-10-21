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

test("review-only offers require an observed Takeover listing and recover from invented IDs", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("inventory_search", { query: "desk" }, "find"),
      toolCall("show_takeover_listings", { ids: [ownDesk.id] }, "select"),
      toolCall(
        "suggest_takeover_offer",
        { listingId: "external-or-invented" },
        "invalid-offer",
      ),
      toolCall(
        "suggest_takeover_offer",
        { listingId: ownDesk.id },
        "valid-offer",
      ),
      answer("## Takeover\nYou can review an offer draft for the white desk."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
    {
      text: "Find a desk under CHF 100. Prepare a draft for review.",
      context: { maxPrice: 100, source: "takeover", budgetSpecified: true },
      inventory: [ownDesk],
    },
  );
  assert.deepEqual(
    events.filter((event) => event.type === "offer_suggestion"),
    [{ type: "offer_suggestion", listingId: ownDesk.id }],
  );
  assert.ok(events.some((event) => event.type === "complete"));
});
test("negotiation continuations save user terms then ask, without resetting discovery filters", async () => {
  const { newNegotiation } = await import("../../shared/negotiation.ts");
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_negotiation",
        {
          expectedVersion: 1,
          changes: {
            amount: { value: 70, origin: "buyer", quote: "CHF 70" },
            pickupTime: {
              value: "Saturday 15:00",
              origin: "buyer",
              quote: "Saturday 15:00",
            },
          },
        },
        "update-proposal",
      ),
      toolCall(
        "ask_user",
        {
          question: "Where would you like to meet?",
          choices: ["Ask the seller for a point", "EPFL library entrance"],
        },
        "meeting-point",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
    {
      text: "CHF 70, Saturday 15:00",
      context: {
        intent: "negotiation",
        negotiation: newNegotiation("proposal", ownDesk.id),
        maxPrice: 100,
        budgetSpecified: true,
      },
      inventory: [ownDesk],
    },
  );
  const changed = events.find((event) => event.type === "negotiation_update");
  assert.equal(changed?.negotiation.terms.amount, 70);
  assert.equal(changed?.negotiation.terms.pickupTime, "Saturday 15:00");
  assert.ok(events.some((event) => event.type === "question"));
  assert.ok(events.some((event) => event.type === "complete"));
  assert.equal(
    events.some((event) => event.type === "preferences_patch"),
    false,
  );
  assert.ok(
    model.doStreamCalls[0].tools?.some(
      (tool) => tool.name === "update_negotiation",
    ),
  );
});
test("preparing a real proposal finishes with a summary rather than another optional question", async () => {
  const { newNegotiation } = await import("../../shared/negotiation.ts");
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("prepare_offer_draft", { expectedVersion: 1 }, "prepare"),
      answer(
        "Your draft is ready for review. The message asks the seller about handover.",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
    {
      text: "Prepare now, leaving unknowns as questions to the seller.",
      context: {
        intent: "negotiation",
        negotiation: newNegotiation("proposal", ownDesk.id),
      },
      inventory: [ownDesk],
    },
  );
  assert.ok(
    events.some(
      (event) => event.type === "negotiation_update" && event.negotiation.draft,
    ),
  );
  assert.ok(events.some((event) => event.type === "complete"));
  assert.deepEqual(model.doStreamCalls[1].toolChoice, { type: "none" });
  assert.equal(
    events.some((event) => event.type === "question"),
    false,
  );
});
test("buyer pickup questions remain available after switching listings within a run", async () => {
  const { newNegotiation } = await import("../../shared/negotiation.ts");
  const chair = { ...ownDesk, id: "own-chair", title: "Chair" };
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("select_listing", { listingId: chair.id }, "choose-chair"),
      toolCall(
        "ask_user",
        {
          question: "When can you collect the chair?",
          choices: ["Saturday", "Sunday"],
        },
        "chair-time",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    {
      text: "I also want this chair.",
      context: {
        intent: "negotiation",
        negotiation: newNegotiation("desk-proposal", ownDesk.id),
        recentMessages: [
          { role: "assistant", text: "When can you collect the desk?" },
          { role: "user", text: "Saturday at 15:00" },
        ],
      },
      inventory: [ownDesk, chair],
    },
  );
  const selected = events.find((event) => event.type === "negotiation_update");
  assert.equal(selected?.negotiation.listingId, chair.id);
  assert.equal(selected?.negotiation.terms.pickupTime, null);
  assert.ok(
    events.some(
      (event) => event.type === "question" && event.id === "chair-time",
    ),
  );
  assert.ok(events.some((event) => event.type === "complete"));
  assert.ok(!events.some((event) => event.type === "error"));
});
