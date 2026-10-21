import {
  toolCall,
  answer,
  createAgentRuntime,
  blankDraft,
  eventsFor,
} from "../testing/runtime.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";

test("ask_user pauses the actual SDK loop and completes a question without searching", async () => {
  let fetched = false;
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "ask_user",
        {
          question: "What are you looking for?",
          choices: ["Describe an item", "Browse nearby"],
        },
        "question-1",
      ),
      answer("This step must never execute."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "question-model-key",
      braveApiKey: "question-search-key",
      modelImpl: model,
      fetchImpl: async () => {
        fetched = true;
        throw new Error("Must pause first");
      },
    }),
    { text: "Help me find something" },
  );
  assert.equal(model.doStreamCalls.length, 1);
  assert.equal(fetched, false);
  assert.deepEqual(
    events.find((event) => event.type === "question"),
    {
      type: "question",
      id: "question-1",
      question: "What are you looking for?",
      choices: ["Describe an item", "Browse nearby"],
    },
  );
  assert.equal(
    events.find((event) => event.type === "complete")?.text,
    "What are you looking for?",
  );
  assert.equal(
    events.some((event) => event.type === "error"),
    false,
  );
});
test("ask_user transports a typed price control through the actual SDK loop", async () => {
  const input = { type: "price", min: 0, max: 100, step: 1, value: 20 };
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "ask_user",
        {
          question: "What asking price in CHF would you like?",
          choices: ["Give it away for free"],
          input,
        },
        "price-slider",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "slider-test", modelImpl: model }),
    {
      text: "Help choose my price",
      context: { intent: "listing_assist", currentDraft: blankDraft },
    },
  );
  assert.deepEqual(
    events.find((event) => event.type === "question"),
    {
      type: "question",
      id: "price-slider",
      question: "What asking price in CHF would you like?",
      choices: ["Give it away for free"],
      input,
    },
  );
  assert.equal(
    events.some((event) => event.type === "error"),
    false,
  );
});
test("ask_user drops a spurious price control from pickup questions and keeps quick choices", async () => {
  for (const question of [
    "How would you like the bike to be handed over to the buyer?",
    "Where should the buyer collect it after paying CHF 115?",
    "What condition is it in?",
  ]) {
    const choices = ["Pickup only", "Shipping possible"];
    const model = new MockLanguageModelV4({
      doStream: [
        toolCall(
          "ask_user",
          {
            question,
            choices,
            input: { type: "price", min: 0, max: 10000, step: 1, value: 0 },
          },
          "handover",
        ),
      ],
    });
    const events = await eventsFor(
      createAgentRuntime({ apiKey: "handover-test", modelImpl: model }),
      {
        text: "Asking price: CHF 115",
        context: {
          intent: "listing_assist",
          currentDraft: { ...blankDraft, price: 115 },
        },
      },
    );
    assert.deepEqual(
      events.find((event) => event.type === "question"),
      {
        type: "question",
        id: "handover",
        question,
        choices,
      },
    );
    assert.equal(
      events.some((event) => event.type === "error"),
      false,
    );
  }
});
