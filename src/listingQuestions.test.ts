import test from "node:test";
import assert from "node:assert/strict";
import type { AgentQuestionEvent } from "../shared/actions.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import {
  appendToDescription,
  DescriptionFullError,
  nextQuestion,
  pendingPrice,
  resolvedByDraft,
  tapAction,
  tapOutcome,
} from "./listingQuestions.ts";

const draft: ListingDraft = {
  image: "photo",
  raw: "",
  title: "IKEA desk",
  description: "IKEA desk, 120×60 cm.",
  price: "",
  condition: "",
  dimensions: "",
  location: "EPFL, Ecublens",
  pickup: "",
  category: "All",
};
const priceQuestion: AgentQuestionEvent = {
  type: "question",
  id: "ask-1",
  listingField: "price",
  question: "What asking price would you like?",
  choices: ["Use CHF 40", "Give it away for free"],
  choiceActions: [
    { label: "Use CHF 40", patch: { price: 40 }, acceptsProposal: true },
    { label: "Give it away for free", patch: { price: 0 } },
  ],
};
const factQuestion: AgentQuestionEvent = {
  type: "question",
  id: "ask-1:1",
  listingField: "other",
  question: "Can the desk be taken apart?",
  choices: ["Can be disassembled", "Used", "Not sure"],
  choiceActions: [
    {
      label: "Can be disassembled",
      appendDescription: "Can be disassembled.",
    },
    {
      label: "Used",
      patch: { condition: "Used" },
      appendDescription: "Used for two years.",
    },
    { label: "Not sure" },
  ],
};

test("a tap applies here unless only Pako can tell what it means", () => {
  assert.equal(tapOutcome(priceQuestion, "Use CHF 40").kind, "accept-proposal");
  assert.equal(
    tapOutcome(priceQuestion, "Give it away for free").kind,
    "patch",
  );
  assert.equal(tapOutcome(factQuestion, "Can be disassembled").kind, "patch");
  assert.equal(tapOutcome(factQuestion, "Used").kind, "patch");
  assert.equal(tapOutcome(factQuestion, "Not sure").kind, "record");
  assert.equal(
    tapOutcome(
      { ...factQuestion, choices: [...factQuestion.choices!, "Skip"] },
      "Skip",
    ).kind,
    "record",
    "a plain label among structured answers is an uncertain answer",
  );
  const older = { ...factQuestion, choiceActions: undefined };
  assert.equal(tapOutcome(older, "Can be disassembled").kind, "ask-agent");
  assert.equal(
    tapOutcome(factQuestion, "It has a scratch").kind,
    "ask-agent",
    "words the question did not offer go to Pako",
  );
});

test("a tapped answer becomes the student's own change, with the description appended", () => {
  const tap = tapAction(factQuestion.choiceActions![1], draft, "tap-1");
  assert.deepEqual(tap.patch, {
    condition: "Used",
    description: "IKEA desk, 120×60 cm.\nUsed for two years.",
  });
  assert.deepEqual(tap.evidence, [{ kind: "seller", quote: "Used" }]);
  assert.equal(tap.requiresAcceptance, false);
  assert.equal(tap.id, "tap-1");
  assert.deepEqual(
    tapAction(
      { label: "Give it away for free", patch: { price: 0 } },
      draft,
      "tap-2",
    ).patch,
    { price: 0 },
  );
});

test("a sentence joins the description once, on its own line, within the limit", () => {
  assert.equal(
    appendToDescription("", " Pickup on weekends. "),
    "Pickup on weekends.",
  );
  assert.equal(
    appendToDescription("Desk.\n", "Pickup on weekends."),
    "Desk.\nPickup on weekends.",
  );
  assert.equal(
    appendToDescription("Desk. PICKUP ON WEEKENDS.", "Pickup on weekends."),
    "Desk. PICKUP ON WEEKENDS.",
  );
  assert.throws(
    () => appendToDescription("x".repeat(3990), "Pickup on weekends."),
    DescriptionFullError,
  );
});

test("questions are asked in order, with the ones put off for later last", () => {
  const questions = [{ id: "price" }, { id: "fact" }, { id: "pickup" }];
  assert.equal(nextQuestion(questions, {}, [])?.id, "price");
  assert.equal(nextQuestion(questions, {}, ["price"])?.id, "fact");
  assert.equal(
    nextQuestion(questions, { fact: "Yes", pickup: "Weekends" }, ["price"])?.id,
    "price",
    "a question put off comes back once the others are answered",
  );
  assert.equal(
    nextQuestion(questions, { price: "40", fact: "Yes", pickup: "No" }, []),
    undefined,
  );
});

test("an edit in the details answers a question about that field, never one about the description", () => {
  assert.equal(resolvedByDraft({ listingField: "condition" }, draft), false);
  assert.equal(
    resolvedByDraft(
      { listingField: "condition" },
      { ...draft, condition: "Good" },
    ),
    true,
  );
  assert.equal(
    resolvedByDraft({ listingField: "price" }, { ...draft, price: "0" }),
    true,
  );
  assert.equal(resolvedByDraft({ listingField: "description" }, draft), false);
  assert.equal(resolvedByDraft({ listingField: "other" }, draft), false);
  assert.equal(resolvedByDraft({}, draft), false);
});

test("Pako's suggested price shows until the listing has a price of its own", () => {
  const suggestion = (id: string, price: number) => ({
    type: "listing_patch" as const,
    id,
    patch: { price },
    reason: `Suggested CHF ${price}.`,
    evidence: [{ kind: "source" as const, sourceId: "web-1", quote: "CHF 40" }],
    requiresAcceptance: true,
  });
  const fact = {
    ...suggestion("fact", 0),
    patch: { condition: "Used" },
    requiresAcceptance: false,
  };
  const turns = [
    { actions: [suggestion("old", 35)] },
    { actions: [suggestion("new", 40), fact] },
  ];
  assert.equal(pendingPrice(turns, { price: "" }), 40);
  assert.equal(
    pendingPrice(turns, { price: "40" }),
    undefined,
    "an accepted or chosen price replaces the suggestion",
  );
  assert.equal(pendingPrice(turns, { price: "0" }), undefined);
  assert.equal(pendingPrice([{ actions: [fact] }], { price: "" }), undefined);
});
