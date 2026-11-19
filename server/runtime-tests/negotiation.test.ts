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
import { newNegotiation } from "../../shared/negotiation.ts";

test("unconfirmed proposal changes expose safe recovery details without saving an inferred price", async () => {
  for (const [changes, code] of [
    [
      { amount: { value: 145, origin: "buyer", quote: "I take it" } },
      "PROPOSAL_AMOUNT_UNCONFIRMED",
    ],
    [
      { amount: { value: 145, origin: "buyer", quote: "CHF 145" } },
      "PROPOSAL_DETAIL_UNCONFIRMED",
    ],
    [
      {
        amount: {
          value: 145,
          origin: "listing",
          quote: ownDesk.description,
        },
      },
      "PROPOSAL_DETAIL_UNCONFIRMED",
    ],
  ] as const) {
    const model = new MockLanguageModelV4({
      doStream: [
        toolCall(
          "update_negotiation",
          { expectedVersion: 1, changes },
          "unconfirmed-amount",
        ),
        toolCall(
          "ask_user",
          {
            question: "What amount would you like to offer?",
            choices: ["CHF 145", "Another amount"],
          },
          "confirm-amount",
        ),
      ],
    });
    const events = await eventsFor(
      createAgentRuntime({ apiKey: "test", modelImpl: model }),
      {
        text: "I take it",
        context: {
          intent: "negotiation",
          negotiation: newNegotiation("proposal", ownDesk.id),
        },
        inventory: [{ ...ownDesk, price: 145 }],
      },
    );
    const failed = events.find(
      (event) =>
        event.type === "status" &&
        event.id === "unconfirmed-amount" &&
        event.state === "error",
    );
    assert.ok(failed?.type === "status" && failed.failure);
    assert.equal(failed.failure.code, code);
    assert.equal(failed.failure.retryable, true);
    assert.match(failed.failure.message, /[Cc]onfirm/);
    assert.doesNotMatch(
      failed.failure.message,
      /quote|origin|schema|validation/i,
    );
    assert.ok(!events.some((event) => event.type === "negotiation_update"));
    assert.ok(
      events.some(
        (event) => event.type === "question" && event.id === "confirm-amount",
      ),
    );
    assert.ok(events.some((event) => event.type === "complete"));
  }
});

test("a stale proposal update explains recovery and a corrected retry saves only once", async () => {
  const changes = { amount: { value: 70, origin: "buyer", quote: "CHF 70" } };
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_negotiation",
        { expectedVersion: 2, changes },
        "stale-update",
      ),
      toolCall("get_negotiation", {}, "read-current"),
      toolCall(
        "update_negotiation",
        { expectedVersion: 1, changes },
        "corrected-update",
      ),
      toolCall("prepare_offer_draft", { expectedVersion: 2 }, "prepare"),
      answer("Your draft is ready for review."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    {
      text: "I offer CHF 70. Prepare the draft.",
      context: {
        intent: "negotiation",
        negotiation: newNegotiation("proposal", ownDesk.id),
      },
      inventory: [ownDesk],
    },
  );
  const failed = events.find(
    (event) =>
      event.type === "status" &&
      event.id === "stale-update" &&
      event.state === "error",
  );
  assert.ok(failed?.type === "status");
  assert.deepEqual(failed.failure, {
    code: "PROPOSAL_CHANGED",
    message: "Your proposal changed. Try again using its latest draft.",
    retryable: true,
  });
  const updates = events.filter((event) => event.type === "negotiation_update");
  assert.equal(updates.length, 2);
  assert.equal(updates[0].negotiation.version, 2);
  assert.equal(updates[0].negotiation.terms.amount, 70);
  assert.ok(updates[1].negotiation.draft);
  assert.ok(
    events.some(
      (event) =>
        event.type === "status" &&
        event.id === "corrected-update" &&
        event.state === "complete" &&
        !event.failure,
    ),
  );
  assert.ok(events.some((event) => event.type === "complete"));
});

test("unexpected proposal tool errors never expose internal messages in activity", async () => {
  const privateError = "internal provider token=private-test-value";
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_negotiation",
        {
          expectedVersion: 1,
          changes: { amount: { value: 70, origin: "buyer", quote: "CHF 70" } },
        },
        "failed-save",
      ),
      toolCall(
        "ask_user",
        { question: "Would you like to try again?", choices: ["Try again"] },
        "retry",
      ),
    ],
  });
  const events: Awaited<ReturnType<typeof eventsFor>> = [];
  await createAgentRuntime({ apiKey: "test", modelImpl: model }).run(
    {
      text: "I offer CHF 70.",
      context: {
        intent: "negotiation",
        negotiation: newNegotiation("proposal", ownDesk.id),
      },
      inventory: [ownDesk],
    },
    (event) => {
      if (event.type === "negotiation_update") throw new Error(privateError);
      events.push(event);
    },
  );
  const failed = events.find(
    (event) =>
      event.type === "status" &&
      event.id === "failed-save" &&
      event.state === "error",
  );
  assert.ok(failed?.type === "status");
  assert.deepEqual(failed.failure, {
    code: "PROPOSAL_STEP_FAILED",
    message:
      "That proposal step could not finish. Try again using the current draft.",
    retryable: true,
  });
  assert.doesNotMatch(
    JSON.stringify(events),
    /private-test-value|internal provider/,
  );
  assert.ok(!events.some((event) => event.type === "negotiation_update"));
  assert.ok(events.some((event) => event.type === "complete"));
});

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
