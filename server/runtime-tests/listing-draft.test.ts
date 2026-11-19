import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import {
  answer,
  blankDraft,
  call,
  createAgentRuntime,
  eventsFor,
  toolCall,
  toolStep,
} from "../testing/runtime.ts";
import { validateRunRequest } from "../runtime.ts";
import { questionSchema } from "../actions.ts";

const search = () =>
  toolCall(
    "web_search",
    { query: "bureau occasion Lausanne", purpose: "offers" },
    "lookup",
  );
const propose = (price: number, id: string, sourceIds = ["web-1", "web-2"]) =>
  toolCall("propose_price", { price, sourceIds }, id);
const firstDraft = (title: string) => ({
  text: "Create draft",
  context: {
    intent: "listing_assist",
    currentDraft: { ...blankDraft, title },
    photoAnalysis: {
      missingDetails: ["Is the charger included?"],
      keywords: ["electronics"],
    },
  },
});

async function runDraft(
  model: MockLanguageModelV4,
  descriptions: string[],
  title = "Desk",
) {
  return eventsFor(
    createAgentRuntime({
      apiKey: "test",
      braveApiKey: "test",
      modelImpl: model,
      fetchImpl: async () =>
        Response.json({
          web: {
            results: descriptions.map((description, i) => ({
              title: `${title} for pickup`,
              description,
              url: `https://www.ricardo.ch/fr/a/comparable-desk-${123456789 + i}/`,
            })),
          },
        }),
    }),
    firstDraft(title),
  );
}

test("a first draft with no comparable still asks for a price when the model finishes in prose", async () => {
  const model = new MockLanguageModelV4({
    doStream: [search(), answer("I could not find a comparable offer.")],
  });
  const events = await runDraft(model, [], "MacBook Pro");
  assert.deepEqual(
    model.doStreamCalls[0].tools?.map((tool) => tool.name),
    ["web_search"],
  );
  assert.deepEqual(
    model.doStreamCalls[1].tools?.map((tool) => tool.name),
    ["ask_user"],
  );
  const question = events.find((event) => event.type === "question");
  assert.equal(question?.listingField, "price");
  assert.equal(question.input, undefined);
  assert.match(
    events.find((event) => event.type === "complete")!.text,
    /could not find/,
  );
  const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
  assert.match(
    prompt,
    /model year or chip, screen size.*storage.*battery health.*charger included/,
  );
  assert.match(prompt, /at most two short missing key-fact questions/);
  assert.match(prompt, /Is the charger included/);
});

test("a researched proposal preserves citations, plain step labels and two immediately actionable questions", async () => {
  const questions = [
    {
      question: "What condition is the desk in?",
      listingField: "condition",
      choices: [{ label: "Used", patch: { condition: "Used" } }],
    },
    {
      question: "Can the desk be disassembled?",
      listingField: "other",
      choices: [
        {
          label: "Can be disassembled",
          appendDescription: "Can be disassembled.",
        },
      ],
    },
  ];
  const missingValue = { type: "price", min: 0, max: 100, step: 1 };
  const model = new MockLanguageModelV4({
    doStream: [
      search(),
      propose(100, "outside-range"),
      propose(40, "proposal"),
      toolCall(
        "ask_user",
        {
          question: "What asking price would you like?",
          listingField: "price",
          input: missingValue,
        },
        "missing-value",
      ),
      toolStep(
        { type: "text-start", id: "explanation" },
        {
          type: "text-delta",
          id: "explanation",
          delta: "The desks have similar dimensions [web-1].",
        },
        { type: "text-end", id: "explanation" },
        call(
          "ask_user",
          {
            question: "What asking price would you like?",
            listingField: "price",
            input: { ...missingValue, value: 40 },
            followUps: questions,
          },
          "pick",
        ),
      ),
    ],
  });
  const events = await runDraft(model, ["Asking CHF 35.", "Asking CHF 51."]);
  assert.match(
    JSON.stringify(model.doStreamCalls[0].prompt),
    /dimensions .*material, condition, disassembly/,
  );
  assert.match(
    JSON.stringify(model.doStreamCalls.at(-1)?.prompt),
    /Supply a grounded slider value/,
  );
  const patches = events.filter((event) => event.type === "listing_patch");
  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0].patch, { price: 40 });
  assert.equal(patches[0].requiresAcceptance, true);
  assert.deepEqual(
    patches[0].evidence.map((e) => e.quote),
    ["Asking CHF 35.", "Asking CHF 51."],
  );
  const steps = events.filter((event) => event.type === "status");
  assert.ok(
    steps.some(
      (step) =>
        step.label === "Checking comparable prices online" &&
        step.detail === "Desk",
    ),
  );
  assert.ok(steps.some((step) => step.label === "Suggesting a price"));
  assert.ok(
    steps.every(
      (step) =>
        !step.label.includes("bureau") && !step.detail?.includes("bureau"),
    ),
  );
  assert.ok(!steps.some((step) => step.state === "error"));
  const question = events.find((event) => event.type === "question");
  assert.equal(question?.question, "What asking price would you like?");
  assert.equal(question.input?.value, 40);
  assert.equal(question.choiceActions?.[0].acceptsProposal, true);
  assert.deepEqual(
    question.followUps?.map((q) => q.choiceActions),
    questions.map((q) => q.choices),
  );
  assert.deepEqual(question.followUps?.[0].choices, ["Used"]);
  const complete = events.find((event) => event.type === "complete");
  assert.match(complete!.text, /similar dimensions \[web-1\]/);
  assert.match(complete!.text, /CHF 35–51.*\[web-2\]/);
});

test("a proposal rejects invalid amounts, non-asking prices and insufficient distinct sources", async () => {
  for (const [price, ids, description] of [
    [0, ["web-1", "web-2"], "CHF 50"],
    [40, ["web-1"], "CHF 50"],
    [40, ["web-1", "web-1"], "CHF 50"],
    [40, ["web-1", "web-2"], "Sold for CHF 50"],
    [40, ["web-1", "web-2"], "Retail CHF 50"],
    [40, ["web-1", "web-2"], "Shipping CHF 50"],
    [40, ["web-1", "web-2"], "Starting bid CHF 50"],
  ] as const) {
    const model = new MockLanguageModelV4({
      doStream: [
        search(),
        propose(price, "bad", [...ids]),
        answer("Please choose your asking price."),
      ],
    });
    const events = await runDraft(model, ["Asking CHF 35.", description]);
    assert.ok(!events.some((event) => event.type === "listing_patch"));
    assert.equal(
      events.find((event) => event.type === "question")?.listingField,
      "price",
    );
  }
});

test("laptop model years and Swiss thousands separators stay distinct from asking prices", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      search(),
      propose(1250, "macbook-price"),
      toolCall(
        "ask_user",
        {
          listingField: "price",
          question: "What asking price would you like?",
        },
        "decision",
      ),
    ],
  });
  const events = await runDraft(
    model,
    ["MacBook Pro 2020 CHF 1,300.", "MacBook Pro, CHF 1’200."],
    "MacBook Pro",
  );
  const proposal = events.find((event) => event.type === "listing_patch");
  assert.equal(proposal?.patch.price, 1250);
  assert.match(proposal.reason, /CHF 1200–1300/);
});

test("listing inputs bound photo hints, queued questions and editable tap fields", () => {
  const request = firstDraft("Laptop");
  assert.deepEqual(
    validateRunRequest(request).context?.photoAnalysis,
    request.context.photoAnalysis,
  );
  assert.throws(() =>
    validateRunRequest({
      ...request,
      context: {
        ...request.context,
        photoAnalysis: { missingDetails: ["x".repeat(241)] },
      },
    }),
  );
  const fact = {
    question: "What condition?",
    choices: [{ label: "Used", patch: { condition: "Used" } }],
  };
  assert.ok(
    questionSchema.safeParse({ ...fact, followUps: [fact, fact] }).success,
  );
  assert.ok(
    !questionSchema.safeParse({ ...fact, followUps: [fact, fact, fact] })
      .success,
  );
  assert.ok(
    !questionSchema.safeParse({
      ...fact,
      choices: [{ label: "Used", patch: { published: true } }],
    }).success,
  );
});

test("polishing suppresses skipped topics and fields in main and queued questions", async () => {
  const charger = { listingField: "description", question: "Does it come with a power adapter?" };
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("ask_user", charger, "reworded"),
      toolCall("ask_user", {
        question: "How long does the battery last?",
        listingField: "other",
        followUps: [charger, { listingField: "dimensions", question: "How big is it?" }],
      }, "battery"),
    ],
  });
  const events = await eventsFor(createAgentRuntime({ apiKey: "test", modelImpl: model }), {
    text: "Polish the description",
    context: {
      intent: "listing_assist",
      currentDraft: { ...blankDraft, title: "Laptop", price: 40 },
      skippedQuestions: [
        { question: "Is the charger included?", listingField: "other" },
        { question: "What are its measurements?", listingField: "dimensions" },
      ],
    },
  });
  const questions = events.filter((event) => event.type === "question");
  assert.deepEqual(questions.map((question) => question.id), ["battery"]);
  assert.equal(questions[0].followUps, undefined);
});
