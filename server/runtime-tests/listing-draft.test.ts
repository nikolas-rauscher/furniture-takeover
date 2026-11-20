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
import { questionSchema } from "../action-schemas.ts";

const search = () =>
  toolCall(
    "web_search",
    { query: "bureau occasion Lausanne", purpose: "offers" },
    "lookup",
  );
const propose = (id: string) => toolCall("propose_price", {}, id);
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
      propose("proposal"),
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
            input: { ...missingValue, value: 39 },
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
  assert.deepEqual(patches[0].patch, { price: 43 });
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
  assert.equal(question.input?.value, 43);
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

test("a price request excludes retail, sold prices, pickup costs and auction starts", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      search(),
      propose("no-usable-price"),
      answer("Please choose your asking price."),
    ],
  });
  const events = await runDraft(model, [
    "Asking CHF 35.",
    "Sold for CHF 50",
    "Retail CHF 50",
    "Shipping CHF 50",
    "Starting bid CHF 50",
  ]);
  assert.equal(
    events.some((event) => event.type === "listing_patch"),
    false,
  );
  assert.equal(
    events.find((event) => event.type === "question")?.input,
    undefined,
  );
});

test("a study desk proposal uses the CHF 35 used offer instead of duplicate new stock", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      search(),
      propose("desk-price"),
      answer("Review the suggested price."),
    ],
  });
  const events = await runDraft(model, [
    "Fabriqué artisanalement. Article neuf, valeur 4680.– Objet en stock LIQUIDE à Fr. 2590.–",
    "Fabriqué artisanalement. Article neuf, valeur 4680.– Objet en stock LIQUIDE à Fr. 2590.– Plusieurs dimensions.",
    "Bureau IKEA 120x60 (D’occasion), CHF 35 – retrait uniquement",
    "Desk asking CHF 95",
  ]);
  const proposal = events.find((event) => event.type === "listing_patch");
  assert.deepEqual(proposal?.patch, { price: 35 });
  assert.match(proposal.reason, /one used offer.*starting point.*\[web-3\]/);
  assert.deepEqual(
    proposal.evidence.map((item) => item.kind === "source" && item.sourceId),
    ["web-3"],
  );
  assert.equal(
    events.find((event) => event.type === "question")?.input?.value,
    35,
  );
});

test("search results show the model each offer's usable asking price, skipping Ricardo's pickup cost", async () => {
  const model = new MockLanguageModelV4({
    doStream: [search(), answer("Here is what I found.")],
  });
  const events = await runDraft(model, [
    "Retrait par l'acheteur à 1012 Lausanne, CHF 0.00 · Hauteur · 65 cm",
    "Startpreis: CHF 75",
    "Asking CHF 180.",
  ]);
  const toolResult = JSON.stringify(model.doStreamCalls[1].prompt);
  assert.match(toolResult, /askingPrice\\?":null/);
  assert.match(toolResult, /askingPrice\\?":180/);
  const proposal = events.find((event) => event.type === "listing_patch");
  assert.equal(proposal, undefined);
});

test("a first draft whose search found asking prices gets a cited price slider even when the model skips propose_price", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      search(),
      toolCall(
        "ask_user",
        {
          question: "What asking price would you like?",
          listingField: "price",
        },
        "ask-price",
      ),
    ],
  });
  const events = await runDraft(model, [
    "Prix : CHF 60 · Etat : D'occasion",
    "Retrait par l'acheteur à 1012 Lausanne, CHF 0.00 · Prix CHF 40 · D’occasion",
    "Used desk. Asking CHF 90.",
  ]);
  const proposal = events.find((event) => event.type === "listing_patch");
  assert.deepEqual(proposal?.patch, { price: 60 });
  assert.equal(proposal.requiresAcceptance, true);
  assert.match(
    proposal.reason,
    /3 used offers asking CHF 40–90\. \[web-1\] \[web-2\] \[web-3\]/,
  );
  const question = events.find((event) => event.type === "question");
  assert.equal(question?.input?.value, 60);
  assert.equal(question.choiceActions?.[0].acceptsProposal, true);
});

test("laptop model years and Swiss thousands separators stay distinct from asking prices", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      search(),
      propose("macbook-price"),
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
  const charger = {
    listingField: "description",
    question: "Does it come with a power adapter?",
  };
  const model = new MockLanguageModelV4({
    doStream: [
      toolCall("ask_user", charger, "reworded"),
      toolCall(
        "ask_user",
        {
          question: "How long does the battery last?",
          listingField: "other",
          followUps: [
            charger,
            { listingField: "dimensions", question: "How big is it?" },
          ],
        },
        "battery",
      ),
    ],
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    {
      text: "Polish the description",
      context: {
        intent: "listing_assist",
        currentDraft: { ...blankDraft, title: "Laptop", price: 40 },
        skippedQuestions: [
          { question: "Is the charger included?", listingField: "other" },
          {
            question: "What are its measurements?",
            listingField: "dimensions",
          },
        ],
      },
    },
  );
  const questions = events.filter((event) => event.type === "question");
  assert.deepEqual(
    questions.map((question) => question.id),
    ["battery"],
  );
  assert.equal(questions[0].followUps, undefined);
});

test("desk measurement questions offer local dimensions patches in the main question and queue", async () => {
  const question = {
    question: "What are the width, depth and height of the desk?",
    listingField: "dimensions",
  };
  for (const queued of [false, true]) {
    const measured = "125 x 55 x 72 cm";
    const model = new MockLanguageModelV4({
      doStream: toolCall(
        "ask_user",
        queued
          ? {
              question: "Does the desk come apart?",
              listingField: "other",
              followUps: [{ ...question, choices: [measured, "Not sure"] }],
            }
          : question,
        "details",
      ),
    });
    const events = await eventsFor(
      createAgentRuntime({ apiKey: "test", modelImpl: model }),
      {
        text: "Polish the description",
        context: {
          intent: "listing_assist",
          currentDraft: { ...blankDraft, title: "Study desk", price: 50 },
        },
      },
    );
    const main = events.find((event) => event.type === "question");
    const dimensions = queued ? main?.followUps?.[0] : main;
    assert.equal(dimensions?.listingField, "dimensions");
    const actions = dimensions.choiceActions ?? [];
    assert.ok(actions.length > 0);
    for (const action of actions) {
      assert.ok(dimensions.choices?.includes(action.label));
      assert.deepEqual(action.patch, { dimensions: action.label });
    }
    if (queued)
      assert.deepEqual(
        actions.map((action) => action.label),
        [measured],
      );
    assert.ok(!events.some((event) => event.type === "listing_patch"));
  }
});
