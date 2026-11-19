import test from "node:test";
import assert from "node:assert/strict";
import type { AgentQuestionEvent } from "../shared/actions.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import {
  appendToDescription,
  asksPrice,
  closingLine,
  handoverQuestion,
  isPickupQuestion,
  PICKUP_QUESTION,
  questionQueue,
  niceStep,
  trayPhase,
  DescriptionFullError,
  nextQuestion,
  pendingPrice,
  resolvedByDraft,
  splitQuestion,
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

test("the price stepper moves in steps that suit the amount", () => {
  assert.equal(niceStep(15), 1);
  assert.equal(niceStep(40), 5);
  assert.equal(niceStep(160), 10);
  assert.equal(niceStep(1200), 50);
  assert.equal(niceStep(4000), 100);
});

test("the tray reads Pako first, asks while a question waits, then closes or says what failed", () => {
  const phase = (overrides: Partial<Parameters<typeof trayPhase>[0]>) =>
    trayPhase({
      starting: false,
      status: "complete",
      asking: false,
      ...overrides,
    });
  assert.equal(phase({ starting: true, status: "idle" }), "starting");
  assert.equal(phase({ status: "running" }), "working");
  assert.equal(
    phase({ status: "running", asking: true }),
    "asking",
    "a question can wait while Pako still works",
  );
  assert.equal(phase({ asking: true }), "asking");
  assert.equal(phase({}), "done");
  assert.equal(phase({ status: "error" }), "error");
  assert.equal(phase({ status: "idle" }), "hidden");
});

test("a price question is answered with the price card", () => {
  assert.equal(asksPrice(priceQuestion), true);
  assert.equal(
    asksPrice({ input: { type: "price", min: 0, max: 50, step: 1 } }),
    true,
  );
  assert.equal(asksPrice(factQuestion), false);
});

test("Pako's closing line names what is still missing before saving", () => {
  assert.deepEqual(closingLine([], "Save listing"), {
    title: "All set!",
    text: "Check the card and tap Save listing when you're happy.",
  });
  assert.deepEqual(closingLine(["price"], "Publish listing"), {
    title: "Almost there!",
    text: "Add the price, then tap Publish listing.",
  });
  assert.equal(
    closingLine(["title", "price", "pickup location"], "Save listing").text,
    "Add the title, price and pickup location, then tap Save listing.",
  );
});

test("a question keeps the asked sentence as its heading and what Pako wrote after it apart", () => {
  assert.deepEqual(
    splitQuestion(
      "What asking price would you like? Recent listings ask CHF 1,090 [web-3], so CHF 1,250 is a fair start.",
    ),
    {
      ask: "What asking price would you like?",
      aside:
        "Recent listings ask CHF 1,090 [web-3], so CHF 1,250 is a fair start.",
    },
  );
  assert.deepEqual(splitQuestion("Is the charger included?"), {
    ask: "Is the charger included?",
    aside: "",
  });
  assert.deepEqual(
    splitQuestion("Recent listings ask CHF 40. What would you like to ask?"),
    {
      ask: "Recent listings ask CHF 40. What would you like to ask?",
      aside: "",
    },
  );
});

test("Pako asks for pickup times once, unless the listing already says how it is handed over", () => {
  assert.equal(handoverQuestion(draft, []), PICKUP_QUESTION);
  assert.equal(
    handoverQuestion({ ...draft, pickup: "2026-12-01" }, []),
    undefined,
  );
  assert.equal(
    handoverQuestion(
      { ...draft, description: "Desk. Pickup only on weekends." },
      [],
    ),
    undefined,
  );
  assert.equal(
    handoverQuestion({ ...draft, description: "Desk. Shipping possible." }, []),
    undefined,
  );
  assert.equal(
    handoverQuestion(
      { ...draft, description: "Desk. Pickup in Ecublens (EPFL area)." },
      [],
    ),
    PICKUP_QUESTION,
    "where to pick it up is not when",
  );
  assert.equal(
    handoverQuestion(draft, [{ questions: [PICKUP_QUESTION] }]),
    undefined,
    "an earlier turn asked it already, answered or skipped",
  );
  const handover = {
    type: "question" as const,
    id: "ask-2",
    listingField: "pickup" as const,
    question: "How will buyers get it?",
  };
  assert.equal(handoverQuestion(draft, [{ questions: [handover] }]), undefined);
  assert.equal(isPickupQuestion(handover), true);
  assert.equal(isPickupQuestion({ question: "Is shipping possible?" }), true);
  assert.equal(isPickupQuestion(factQuestion), false);
});

test("Pako's pickup question comes first while he researches, and the run leaves pickup to him", () => {
  const handover = {
    type: "question" as const,
    id: "ask-1:2",
    listingField: "pickup" as const,
    question: "How will buyers get it?",
  };
  const fromRun = [priceQuestion, factQuestion, handover];
  assert.deepEqual(
    questionQueue([], PICKUP_QUESTION).map((question) => question.id),
    ["pako-pickup"],
  );
  assert.deepEqual(
    questionQueue(fromRun, PICKUP_QUESTION).map((question) => question.id),
    ["pako-pickup", "ask-1", "ask-1:1"],
  );
  assert.deepEqual(
    questionQueue([PICKUP_QUESTION, ...fromRun], undefined).map(
      (question) => question.id,
    ),
    ["pako-pickup", "ask-1", "ask-1:1"],
    "once answered, his question stays in its place",
  );
  assert.deepEqual(
    questionQueue(fromRun, undefined).map((question) => question.id),
    ["ask-1", "ask-1:1", "ask-1:2"],
    "without his question the run may ask about pickup",
  );
});
