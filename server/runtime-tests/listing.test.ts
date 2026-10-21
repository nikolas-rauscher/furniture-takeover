import { createAgentRuntime as createRuntime } from "../runtime.ts";
import {
  call,
  toolStep,
  toolCall,
  answer,
  createAgentRuntime,
  blankDraft,
  eventsFor,
} from "../testing/runtime.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";

test("listing reviews can answer from seller facts without an unnecessary web search", async () => {
  let fetched = false;
  const model = new MockLanguageModelV4({
    doStream: answer(
      "Ask the seller whether the small scratches affect the writing surface.",
    ),
  });
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "review-model-key",
      braveApiKey: "review-search-key",
      modelImpl: model,
      fetchImpl: async () => {
        fetched = true;
        throw new Error("Unexpected request");
      },
    }),
    {
      text: "What should I ask about this listing? White desk, CHF 65, small scratches; chair not included.",
      context: { intent: "listing_review" },
    },
  );
  assert.equal(model.doStreamCalls[0].toolChoice?.type, "auto");
  assert.equal(fetched, false);
  assert.ok(events.some((event) => event.type === "complete"));
  assert.equal(
    events.some((event) => event.type === "error"),
    false,
  );
});
test("listing review sends strict grounding rules for example copy and ambiguous titles to the SDK", async () => {
  const model = new MockLanguageModelV4({
    doStream: answer(
      "The supplied facts are CHF 40, Good condition, 100 x 50 x 70 cm, Lausanne and flexible pickup. What material is the desk made from?",
    ),
  });
  const sellerFacts = {
    title: "Workflow desk B",
    price: 40,
    condition: "Good",
    dimensions: "100 x 50 x 70 cm",
    location: "Lausanne",
    pickupBy: "",
    description: "Desk. Flexible pickup.",
  };
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "grounded-review-model-key",
      modelImpl: model,
    }),
    {
      text: `Review this listing and suggest improvements: ${JSON.stringify(sellerFacts)}`,
      context: { intent: "listing_review" },
    },
  );
  const system = model.doStreamCalls[0].prompt
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n");
  // This regression verifies delivered instructions, not semantic correctness of a live model.
  assert.match(
    system,
    /suggested descriptions, example copy, rewritten titles/,
  );
  assert.match(system, /NEVER invent plausible details/);
  assert.match(system, /Rewrites may only restate supplied facts/);
  assert.match(
    system,
    /title is a seller's label, NOT evidence of a brand or model/,
  );
  assert.match(system, /number of drawers/);
  assert.match(
    system,
    /"Good" does not imply either specific scratches or a scratch-free surface/,
  );
  assert.match(system, /flexible pickup does not imply ground-floor access/);
  assert.match(system, /Present missing details as a few neutral questions/);
  assert.match(
    system,
    /Previous assistant answers are not evidence of seller facts/,
  );
  assert.doesNotMatch(system, /three best leads/);
  const user = model.doStreamCalls[0].prompt.find(
    (message) => message.role === "user",
  );
  assert.ok(user?.role === "user");
  const text = user.content.find((part) => part.type === "text");
  assert.ok(text?.type === "text");
  assert.match(JSON.parse(text.text).text, /Workflow desk B/);
  assert.ok(events.some((event) => event.type === "complete"));
});
test("listing assist emits grounded changes then stops for the missing price", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_listing",
        {
          patch: {
            title: "White desk",
            condition: "Good",
            dimensions: "120 x 60 x 75 cm",
          },
          reason: "Use the supplied details.",
          evidence: [
            {
              kind: "seller",
              quote: "White desk. Good condition. 120 × 60 × 75 cm.",
            },
          ],
        },
        "draft-change",
      ),
      toolCall(
        "ask_user",
        { question: "What asking price in CHF would you like?" },
        "price-question",
      ),
      answer("Should not continue after a question."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "listing-tools-key", modelImpl: model }),
    {
      text: "White desk. Good condition. 120 × 60 × 75 cm.",
      context: { intent: "listing_assist", currentDraft: blankDraft },
    },
  );
  const change = events.find((event) => event.type === "listing_patch");
  assert.ok(change?.type === "listing_patch");
  assert.deepEqual(change.patch, {
    title: "White desk",
    condition: "Good",
    dimensions: "120 x 60 x 75 cm",
  });
  assert.equal(change.requiresAcceptance, false);
  assert.equal(model.doStreamCalls.length, 2);
  assert.ok(events.some((event) => event.type === "question"));
  assert.ok(events.some((event) => event.type === "complete"));
});
test("a short answer to the previous asking-price question emits a factual price patch", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_listing",
        {
          patch: { price: 65 },
          reason: "Your answer to the asking-price question.",
          evidence: [{ kind: "seller", quote: "65" }],
        },
        "answered-price",
      ),
      answer("The draft now shows CHF 65 for your review."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "short-answer-key", modelImpl: model }),
    {
      text: "65",
      context: {
        intent: "listing_assist",
        currentDraft: {
          ...blankDraft,
          title: "White desk",
          price: 40,
          description: "White desk. Price: CHF 40. Small scratches.",
        },
        previousQuestion: "What asking price in CHF would you like?",
      },
    },
  );
  const change = events.find((event) => event.type === "listing_patch");
  assert.ok(change?.type === "listing_patch");
  assert.deepEqual(change.patch, {
    price: 65,
    description: "White desk. Price: CHF 65. Small scratches.",
  });
  assert.equal(change.requiresAcceptance, false);
});
test("a mixed book update keeps its price and requires a condition question without a failed lookup", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_listing",
        {
          patch: { price: 10, condition: "Like new" },
          reason: "Prepare the books.",
          evidence: [{ kind: "seller", quote: "CHF 10" }],
        },
        "books-update",
      ),
      toolCall(
        "ask_user",
        {
          question: "What condition are the books in?",
          choices: ["Like new", "Used"],
        },
        "books-condition",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test-key", modelImpl: model }),
    {
      text: "CHF 10",
      context: {
        intent: "listing_assist",
        currentDraft: { ...blankDraft, title: "Two Gregs Tagebuch books" },
      },
    },
  );
  const patch = events.find((event) => event.type === "listing_patch");
  assert.ok(patch?.type === "listing_patch");
  assert.deepEqual(patch.patch, { price: 10 });
  assert.ok(
    events.some(
      (event) =>
        event.type === "status" &&
        event.id === "books-update" &&
        event.state === "needs_input",
    ),
  );
  assert.equal(
    events.some((event) => event.type === "status" && event.state === "error"),
    false,
  );
  assert.deepEqual(
    model.doStreamCalls[1].tools?.map((tool) => tool.name),
    ["ask_user"],
  );
  assert.ok(events.some((event) => event.type === "question"));
});
test("unsupported listing tool output is rejected before any patch and the agent can ask instead", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_listing",
        {
          patch: { dimensions: "120 x 60 cm" },
          reason: "Typical size.",
          evidence: [{ kind: "seller", quote: "desk" }],
        },
        "invented-size",
      ),
      toolCall(
        "ask_user",
        { question: "What are the desk's dimensions?" },
        "size-question",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "rejected-action-key", modelImpl: model }),
    {
      text: "desk",
      context: { intent: "listing_assist", currentDraft: blankDraft },
    },
  );
  assert.equal(
    events.some((event) => event.type === "listing_patch"),
    false,
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "status" &&
        event.id === "invented-size" &&
        event.state === "needs_input",
    ),
  );
  assert.ok(events.some((event) => event.type === "question"));
});
test("researching an asking price emits real source evidence and an acceptance-only proposal", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "web_search",
        { query: "bureau blanc occasion Lausanne", purpose: "offers" },
        "price-research",
      ),
      toolCall(
        "update_listing",
        {
          patch: { price: 80 },
          reason:
            "A tentative starting price based on one comparable asking price; review it before accepting.",
          evidence: [
            { kind: "source", sourceId: "web-1", quote: "Asking CHF 80" },
          ],
        },
        "price-proposal",
      ),
      answer(
        "One comparable asks CHF 80 [web-1]. You can accept or keep your price.",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "price-research-model",
      braveApiKey: "price-research-search",
      modelImpl: model,
      fetchImpl: async () =>
        Response.json({
          web: {
            results: [
              {
                title: "White desk in Lausanne",
                url: "https://www.ricardo.ch/fr/a/test-desk-123456789/",
                description: "Asking CHF 80. Pickup in Lausanne.",
              },
            ],
          },
        }),
    }),
    {
      text: "Research an asking price",
      context: {
        intent: "listing_assist",
        currentDraft: { ...blankDraft, title: "White desk", price: 60 },
      },
    },
  );
  const change = events.find((event) => event.type === "listing_patch");
  assert.ok(change?.type === "listing_patch");
  assert.equal(change.requiresAcceptance, true);
  assert.deepEqual(change.patch, { price: 80 });
  assert.ok(
    events.findIndex((event) => event.type === "sources") <
      events.findIndex((event) => event.type === "listing_patch"),
  );
  assert.ok(events.some((event) => event.type === "complete"));
});
test("a question prevents other parallel actions from changing the draft", async () => {
  const model = new MockLanguageModelV4({
    doStream: toolStep(
      call(
        "ask_user",
        { question: "What condition is it in?" },
        "parallel-question",
      ),
      call(
        "update_listing",
        {
          patch: { title: "desk" },
          reason: "Use your text",
          evidence: [{ kind: "seller", quote: "desk" }],
        },
        "after-question",
      ),
    ),
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "parallel-question-key", modelImpl: model }),
    {
      text: "desk",
      context: { intent: "listing_assist", currentDraft: blankDraft },
    },
  );
  assert.equal(
    events.some((event) => event.type === "listing_patch"),
    false,
  );
  assert.ok(events.some((event) => event.type === "complete"));
});
test("listing specification research returns actual sources but cannot authorize a price patch", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "web_search",
        {
          query: "manufacturer desk specifications",
          purpose: "product_info",
        },
        "specifications",
      ),
      toolCall(
        "update_listing",
        {
          patch: { price: 80 },
          reason: "Manufacturer price.",
          evidence: [{ kind: "source", sourceId: "web-1", quote: "CHF 80" }],
        },
        "invalid-spec-price",
      ),
      answer(
        "The product page is not a comparable second-hand asking-price offer.",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({
      apiKey: "specifications-model-key",
      braveApiKey: "specifications-search-key",
      modelImpl: model,
      fetchImpl: async () =>
        Response.json({
          web: {
            results: [
              {
                title: "Desk manufacturer specifications",
                url: "https://manufacturer.example/desk",
                description: "Manufacturer specifications. CHF 80.",
              },
            ],
          },
        }),
    }),
    {
      text: "Research manufacturer specifications",
      context: {
        intent: "listing_assist",
        currentDraft: { ...blankDraft, title: "Desk" },
      },
    },
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "sources" &&
        event.sources[0]?.url === "https://manufacturer.example/desk",
    ),
  );
  assert.equal(
    events.some((event) => event.type === "listing_patch"),
    false,
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "status" &&
        event.id === "invalid-spec-price" &&
        event.state === "error",
    ),
  );
});
test("an unanswered handover question never causes automatic description changes", async () => {
  for (const text of [
    "Never mind, do not change anything.",
    "What price would you recommend?",
  ]) {
    const model = new MockLanguageModelV4({
      doStream: [
        toolCall("inventory_search", { query: "book" }, "read-only"),
        answer("The listing draft is unchanged."),
      ],
    });
    const events = await eventsFor(
      createRuntime({
        apiKey: "test",
        modelImpl: model,
        listingTextTranslator: async () => {
          throw new Error("No listing update should invoke translation");
        },
      }),
      {
        text,
        context: {
          intent: "listing_assist",
          currentDraft: {
            ...blankDraft,
            title: "Book",
            description: "A used book.",
            price: 10,
          },
          previousQuestion: "How should the book be handed over?",
          answeredQuestions: [
            { question: "When can the buyer collect it?", answer: "Saturday" },
          ],
        },
      },
    );
    assert.ok(!events.some((event) => event.type === "listing_patch"));
    assert.ok(!events.some((event) => event.type === "error"));
    assert.ok(events.some((event) => event.type === "complete"));
  }
});
test("a genuine handover fact is saved through the validated listing tool", async () => {
  const description = "A used book. Shipping possible.";
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "update_listing",
        {
          patch: { description },
          reason: "Keep the seller's shipping option.",
          evidence: [
            { kind: "seller", quote: "A used book." },
            { kind: "seller", quote: "Shipping possible" },
          ],
        },
        "shipping-update",
      ),
      answer("Shipping has been added to the draft."),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    {
      text: "Shipping possible",
      context: {
        intent: "listing_assist",
        currentDraft: {
          ...blankDraft,
          title: "Book",
          description: "A used book.",
          price: 10,
        },
        previousQuestion: "How should the book be handed over?",
      },
    },
  );
  const patches = events.filter((event) => event.type === "listing_patch");
  assert.equal(patches.length, 1);
  assert.equal(patches[0].id, "shipping-update");
  assert.equal(patches[0].patch.description, description);
  assert.ok(events.some((event) => event.type === "complete"));
  assert.ok(!events.some((event) => event.type === "error"));
});
for (const price of [0, 40]) {
  test(`a saved CHF ${price} price resolves a repeated seller price question inside the tool loop`, async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        toolCall(
          "ask_user",
          {
            question: "What price would you like to set?",
            listingField: "price",
            purpose: "missing_detail",
            input: { type: "price", min: 0, max: 100, step: 1 },
          },
          "repeat-price",
        ),
        answer("The asking price is already saved. Your listing is ready."),
      ],
    });
    const events = await eventsFor(
      createAgentRuntime({ apiKey: "test", modelImpl: model }),
      {
        text: "Pickup or shipping possible",
        context: {
          intent: "listing_assist",
          currentDraft: { ...blankDraft, title: "Lawn mower", price },
          previousAnswer:
            "The draft has no price. I propose CHF 40 for review.",
        },
      },
    );
    assert.equal(
      events.some((event) => event.type === "question"),
      false,
    );
    assert.equal(
      events.some((event) => event.type === "error"),
      false,
    );
    assert.match(
      JSON.stringify(model.doStreamCalls[1].prompt),
      /alreadyAnswered/,
    );
    assert.match(
      JSON.stringify(model.doStreamCalls[1].prompt),
      new RegExp(`CHF ${price}`),
    );
    assert.ok(events.some((event) => event.type === "complete"));
  });
}
test("seller may explicitly revise an already saved asking price", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall(
        "ask_user",
        {
          question: "What should the new price be?",
          listingField: "price",
          purpose: "change_detail",
        },
        "revise-price",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    {
      text: "I want to change the asking price",
      context: {
        intent: "listing_assist",
        currentDraft: { ...blankDraft, price: 40 },
      },
    },
  );
  assert.ok(events.some((event) => event.type === "question"));
});
