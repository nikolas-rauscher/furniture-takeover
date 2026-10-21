import test from "node:test";
import assert from "node:assert/strict";
import {
  listingAction,
  prepareListingAction,
  preferencesAction,
  questionSchema,
} from "./actions.ts";
import type {
  AgentListingDraft,
  AgentListingPatch,
} from "../shared/actions.ts";
import type { AgentRunRequest, AgentRunSource } from "../shared/runs.ts";

const empty: AgentListingDraft = {
  title: "",
  description: "",
  price: null,
  condition: "",
  dimensions: "",
  location: "",
  pickup: "",
  raw: "",
};
const request = (
  text: string,
  draft: Partial<AgentListingDraft> = {},
  previousQuestion?: string,
): AgentRunRequest => ({
  text,
  context: {
    intent: "listing_assist",
    currentDraft: { ...empty, ...draft },
    previousQuestion,
  },
});
const seller = (
  patch: AgentListingPatch,
  quote: string,
  req: AgentRunRequest,
) =>
  listingAction(
    {
      patch,
      reason: "Use the seller's stated facts.",
      evidence: [{ kind: "seller", quote }],
    },
    req,
    [],
    new Set(),
    "patch-1",
  );
test("book listing preserves a stated price while asking for an unsupported condition", () => {
  const prepared = prepareListingAction(
    {
      patch: {
        title: "Two Gregs Tagebuch books",
        price: 10,
        condition: "Like new",
      },
      reason: "Prepare the listing.",
      evidence: [{ kind: "seller", quote: "Asking price: CHF 10" }],
    },
    request("Asking price: CHF 10", {
      title: "Two Gregs Tagebuch books",
      description: "Two books. Covers have scratches.",
    }),
    [],
    new Set(),
    "books",
  );
  assert.deepEqual(prepared.action?.patch, { price: 10 });
  assert.deepEqual(prepared.needsInput, ["condition"]);
  assert.equal(prepared.action?.requiresAcceptance, false);
});

test("partial recovery never accepts fabricated quotes or removes disclosed damage", () => {
  const input = {
    patch: { price: 10, description: "Two books." },
    reason: "Update.",
    evidence: [{ kind: "seller", quote: "CHF 10. Two books." }],
  };
  const prepared = prepareListingAction(
    input,
    request("CHF 10. Two books.", {
      description: "Two books. Damaged covers.",
    }),
    [],
    new Set(),
    "damage",
  );
  assert.deepEqual(prepared.action?.patch, { price: 10 });
  assert.deepEqual(prepared.needsInput, ["description"]);
  assert.throws(
    () =>
      prepareListingAction(
        { ...input, evidence: [{ kind: "seller", quote: "Like new, CHF 10" }] },
        request("CHF 10"),
        [],
        new Set(),
        "fake",
      ),
    /ACTION_REJECTED/,
  );
});

test("an unchanged listing proposal is a no-op rather than a failed update", () => {
  assert.deepEqual(
    prepareListingAction(
      {
        patch: { title: "Two books" },
        reason: "Keep title.",
        evidence: [{ kind: "seller", quote: "CHF 10" }],
      },
      request("CHF 10", { title: "Two books" }),
      [],
      new Set(),
      "same",
    ),
    { action: null, needsInput: [] },
  );
});

const source: AgentRunSource = {
  id: "web-1",
  title: "Desk offer",
  url: "https://www.ricardo.ch/fr/a/desk-123456789/",
  snippet: "Asking CHF 80. Collection in Lausanne.",
};
const researched = (
  patch: AgentListingPatch,
  evidence = [{ kind: "source", sourceId: source.id, quote: "Asking CHF 80" }],
  sources = [source],
  ids = new Set([source.id]),
) =>
  listingAction(
    {
      patch,
      reason:
        "A tentative asking price from the cited comparable; please review.",
      evidence,
    },
    request("Research an asking price", { title: "Desk" }),
    sources,
    ids,
    "research-1",
  );

test("seller-supplied fields apply only with matching field evidence", () => {
  const req = request(
    "White desk. Good condition. 120 × 60 × 75 cm. Asking CHF 65. Lausanne.",
  );
  for (const [patch, quote] of [
    [{ title: "White desk" }, "White desk"],
    [{ condition: "Good" }, "Good condition"],
    [{ dimensions: "120 x 60 x 75 cm" }, "120 × 60 × 75 cm"],
    [{ price: 65 }, "Asking CHF 65"],
    [{ location: "Lausanne" }, "Lausanne"],
  ] as [AgentListingPatch, string][])
    assert.equal(seller(patch, quote, req).requiresAcceptance, false);
  assert.throws(
    () => seller({ dimensions: "120 x 60 cm" }, "White desk", req),
    /dimensions/,
  );
  assert.throws(() => seller({ price: 99 }, "White desk", req), /price/i);
  assert.throws(
    () => seller({ price: 65 }, "White desk", req),
    /Price evidence/,
  );
  assert.throws(
    () =>
      seller(
        { description: "White laminate desk with grey metal legs." },
        "White desk",
        req,
      ),
    /description/,
  );
  assert.throws(
    () =>
      seller({ condition: "Good" }, "Good", request("Not in good condition.")),
    /condition/,
  );
});

test("short answers use the previous question without inventing a currency or dimension", () => {
  assert.equal(
    seller(
      { price: 65 },
      "65",
      request("65", {}, "What asking price in CHF would you like?"),
    ).patch.price,
    65,
  );
  assert.throws(
    () => seller({ price: 65 }, "65", request("65", {}, "How wide is it?")),
    /price/i,
  );
  assert.equal(
    seller(
      { condition: "Good" },
      "Good",
      request("Good", {}, "What condition is it in?"),
    ).patch.condition,
    "Good",
  );
  assert.equal(
    seller(
      { dimensions: "120 x 60 x 75 cm" },
      "120 ×60 × 75cm",
      request("120 ×60 × 75cm", {}, "What are its dimensions?"),
    ).patch.dimensions,
    "120 x 60 x 75 cm",
  );
  assert.throws(
    () =>
      seller(
        { price: 65 },
        "EUR 65",
        request("EUR 65", {}, "What asking price?"),
      ),
    /price/i,
  );
});

test("historical raw notes cannot overwrite current manual facts or remove defects", () => {
  const req = request("Improve the listing", {
    title: "Oak desk",
    description: "Oak desk. Chair not included. Small scratches.",
    price: 80,
    condition: "Used",
    raw: "White desk. Good condition. Asking CHF 40.",
  });
  assert.throws(() => seller({ price: 40 }, "Asking CHF 40", req), /price/i);
  assert.throws(
    () => seller({ condition: "Good" }, "Good condition", req),
    /Historical/,
  );
  assert.throws(
    () => seller({ title: "White desk" }, "White desk", req),
    /Historical/,
  );
  assert.throws(
    () => seller({ description: "Oak desk." }, "Oak desk", req),
    /defect or exclusion/,
  );
  assert.equal(
    seller(
      { price: 40 },
      "Asking CHF 40",
      request("Asking CHF 40", req.context!.currentDraft),
    ).patch.price,
    40,
  );
});

test("source-backed prices need current quoted CHF offer evidence and always require acceptance", () => {
  assert.equal(researched({ price: 80 }).requiresAcceptance, true);
  assert.throws(() => researched({ price: 90 }), /supported range/);
  assert.throws(
    () => researched({ price: 80, condition: "Good" }),
    /only propose/,
  );
  assert.throws(
    () =>
      researched({ price: 80 }, [
        { kind: "source", sourceId: "web-99", quote: "Asking CHF 80" },
      ]),
    /returned during this run/,
  );
  assert.throws(
    () =>
      researched({ price: 80 }, [
        { kind: "source", sourceId: source.id, quote: "Asking CHF 800" },
      ]),
    /quote a source/,
  );
  assert.throws(
    () => researched({ price: 80 }, undefined, undefined, new Set()),
    /not product specifications/,
  );
  for (const quote of [
    "Asking EUR 80",
    "Asking USD 80",
    "Sold for CHF 80",
    "Original retail price CHF 80",
  ]) {
    assert.throws(
      () =>
        researched(
          { price: 80 },
          [{ kind: "source", sourceId: source.id, quote }],
          [{ ...source, snippet: quote }],
        ),
      /CHF|asking-price/,
    );
  }
});

test("past pickup dates, unsupported edits and fabricated evidence are rejected", () => {
  assert.throws(
    () =>
      seller(
        { pickup: "2000-01-01" },
        "2000-01-01",
        request("Pickup by 2000-01-01"),
      ),
    /today or later/,
  );
  assert.equal(
    seller(
      { pickup: "" },
      "Pickup flexible",
      request("Pickup flexible", { pickup: "2030-01-01" }),
    ).patch.pickup,
    "",
  );
  assert.throws(
    () => seller({ title: "Oak desk" }, "Oak desk", request("White desk")),
    /quote the current/,
  );
  assert.throws(
    () =>
      listingAction(
        {
          patch: { image: "https://example.com" },
          reason: "Change",
          evidence: [{ kind: "seller", quote: "desk" }],
        },
        request("desk"),
        [],
        new Set(),
        "bad",
      ),
    /valid editable/,
  );
});

test("search preference actions require latest user wording and preserve unspecified values", () => {
  const req = {
    text: "White desk under CHF 80 within 5 km, pickup flexible in Lausanne.",
  };
  const event = preferencesAction(
    {
      patch: {
        query: "White desk",
        maxPrice: 80,
        radius: 5,
        pickupBy: "",
        location: "Lausanne",
      },
      reason: "Use your request.",
      evidence: [{ kind: "seller", quote: req.text }],
    },
    req,
    "preferences-1",
  );
  assert.equal(event.patch.radius, 5);
  assert.equal("condition" in event.patch, false);
  assert.throws(
    () =>
      preferencesAction(
        {
          patch: { maxPrice: 100 },
          reason: "More options.",
          evidence: [{ kind: "seller", quote: "White desk" }],
        },
        req,
        "bad",
      ),
    /explicitly stated/,
  );
  assert.throws(
    () =>
      preferencesAction(
        {
          patch: { source: "takeover" },
          reason: "Local",
          evidence: [{ kind: "seller", quote: "only my listings" }],
        },
        {
          text: "Find a desk",
          context: { currentDraft: { ...empty, raw: "only my listings" } },
        },
        "stale",
      ),
    /latest user message/,
  );
});

test("short search answers use the question to distinguish budget from radius", () => {
  const input = {
    patch: { maxPrice: 100 },
    reason: "Your budget answer.",
    evidence: [{ kind: "seller", quote: "100" }],
  };
  const req = {
    text: "100",
    context: { previousQuestion: "What is your maximum budget in CHF?" },
  };
  assert.equal(
    preferencesAction(input, req, "budget-answer").patch.maxPrice,
    100,
  );
  assert.throws(
    () =>
      preferencesAction(
        input,
        { text: "100", context: { previousQuestion: "What size desk?" } },
        "ambiguous",
      ),
    /explicitly stated/,
  );
  assert.equal(
    preferencesAction(
      {
        ...input,
        patch: { radius: 5 },
        evidence: [{ kind: "seller", quote: "5" }],
      },
      {
        text: "5",
        context: { previousQuestion: "How far can you travel in km?" },
      },
      "radius-answer",
    ).patch.radius,
    5,
  );
});

test("Anibis preference extraction accepts repeated current filters and explicit second-hand wording", () => {
  const text = "Find a second-hand desk on Anibis in Lausanne under CHF 100";
  const event = preferencesAction(
    {
      patch: {
        query: "desk",
        maxPrice: 100,
        radius: 20,
        pickupBy: "",
        source: "Anibis",
        condition: "Used",
        location: "Lausanne",
      },
      reason: "Use the stated marketplace and budget.",
      evidence: [{ kind: "seller", quote: text }],
    },
    {
      text,
      context: {
        source: "Anibis",
        location: "Lausanne",
        radius: 20,
        pickupBy: "",
      },
    },
    "live-request",
  );
  assert.equal(event.patch.source, "Anibis");
  assert.equal(event.patch.maxPrice, 100);
  assert.equal(event.patch.condition, "Used");
  assert.throws(
    () =>
      preferencesAction(
        {
          patch: { source: "All" },
          reason: "More results",
          evidence: [{ kind: "seller", quote: text }],
        },
        { text, context: { source: "Anibis" } },
        "silent-broadening",
      ),
    /Clearing source/,
  );
});

test("seller price corrections synchronize only the known old description amount", () => {
  const draft = {
    title: "Desk",
    price: 40,
    description:
      "White desk. Price: CHF 40. Small scratches. Chair not included.",
  };
  const req = request("65", draft, "What asking price in CHF would you like?");
  const action = seller({ price: 65 }, "65", req);
  assert.deepEqual(action.patch, {
    price: 65,
    description:
      "White desk. Price: CHF 65. Small scratches. Chair not included.",
  });
  assert.ok(
    action.evidence.some(
      (item) => item.kind === "seller" && item.quote === "Price: CHF 40",
    ),
  );
  assert.equal(
    seller(
      {
        description:
          "White desk. Price: CHF 65. Small scratches. Chair not included.",
      },
      "65",
      req,
    ).patch.description,
    action.patch.description,
  );
  assert.throws(
    () =>
      seller(
        {
          description:
            "White laminate desk. Price: CHF 65. Small scratches. Chair not included.",
        },
        "65",
        req,
      ),
    /description/,
  );
  assert.throws(
    () =>
      seller(
        {
          description:
            "White desk. Price: CHF 65. Small scratches. Chair not included.",
        },
        "desk",
        request("Improve the desk listing", draft),
      ),
    /description/,
  );
  const historical = seller(
    { price: 65 },
    "Asking CHF 65",
    request("Asking CHF 65", {
      price: 40,
      description: "Bought for CHF 40. Price: CHF 40.",
    }),
  );
  assert.equal(
    historical.patch.description,
    "Bought for CHF 40. Price: CHF 65.",
  );
});

test("explicit per-item CHF prices remain grounded when a bundle total is also supplied", () => {
  const text = "5 CHF per book (10 CHF for both).";
  assert.equal(seller({ price: 5 }, text, request(text)).patch.price, 5);
  assert.throws(() => seller({ price: 10 }, text, request(text)), /price/i);
  assert.throws(
    () => seller({ price: 5 }, "CHF 5 or CHF 10", request("CHF 5 or CHF 10")),
    /price/i,
  );
  assert.equal(
    seller(
      { price: 0 },
      "Give it away for free",
      request("Give it away for free"),
    ).patch.price,
    0,
  );
});

test("agent price controls validate bounds without imposing a valuation", () => {
  const input = { type: "price", min: 0, max: 100, step: 1, value: 20 };
  assert.deepEqual(
    questionSchema.parse({ question: "Choose an asking price", input }).input,
    input,
  );
  for (const invalid of [
    { ...input, value: 101 },
    { ...input, min: 100 },
    { ...input, step: 0 },
    { ...input, max: 10001 },
  ]) {
    assert.equal(
      questionSchema.safeParse({
        question: "Choose an asking price",
        input: invalid,
      }).success,
      false,
    );
  }
});

test("a seller price-only description preserves the item narrative and fills the confirmed unit price", () => {
  const description =
    "Two Gregs Tagebuch books. Small scratches on the covers. Pages not missing.";
  const price = "5 CHF per book (10 CHF for both).";
  const action = seller(
    { description: price },
    price,
    request(price, { title: "Gregs Tagebuch (two books)", description }),
  );
  assert.deepEqual(action.patch, {
    description: `${description}\n${price}`,
    price: 5,
  });
  assert.equal("title" in action.patch, false);
  assert.throws(
    () =>
      seller(
        { description: price },
        price,
        request("Add a price", { description }),
      ),
    /evidence/i,
  );
  const custom = seller(
    { description: "CHF 5" },
    "CHF 5",
    request("CHF 5", { description: "A bicycle for sale." }),
  );
  assert.equal(custom.patch.description, "A bicycle for sale.\nCHF 5");
  assert.equal(custom.patch.price, 5);
  assert.throws(
    () =>
      seller(
        { description: "CHF 40" },
        "CHF 40",
        request("Asking CHF 65", {
          description: "A bicycle for sale. Price: CHF 40.",
          price: 40,
        }),
      ),
    /latest seller-stated price/,
  );
});

test("price fragments reconcile the old asking amount and repeated updates are idempotent", () => {
  const description = "Two books. Asking price CHF 5. Covers are worn.";
  const fragment = "Asking price CHF 8.";
  const first = seller(
    { description: fragment },
    fragment,
    request(fragment, { price: 5, description }),
  );
  assert.deepEqual(first.patch, {
    price: 8,
    description: "Two books. Asking price CHF 8. Covers are worn.",
  });
  const again = seller(
    { description: fragment },
    fragment,
    request(fragment, {
      price: 8,
      description: first.patch.description,
    }),
  );
  assert.deepEqual(again.patch, first.patch);
  const noFieldPrice = seller(
    { description: fragment },
    fragment,
    request(fragment, { description }),
  );
  assert.deepEqual(noFieldPrice.patch, first.patch);
  const richer = "8 CHF per book (16 CHF for both).";
  const bundle = seller(
    { description: richer },
    richer,
    request(richer, {
      price: 5,
      description: "Two books. Price CHF 5.",
    }),
  );
  assert.equal(
    bundle.patch.description,
    "Two books. Price CHF 8.\n8 CHF per book (16 CHF for both).",
  );
  const repeatedBundle = seller(
    { description: richer },
    richer,
    request(richer, {
      price: 8,
      description: bundle.patch.description,
    }),
  );
  assert.deepEqual(repeatedBundle.patch, bundle.patch);
});

test("a short Used answer updates condition without resubmitting the listing", () => {
  const prepared = prepareListingAction(
    {
      patch: { condition: "Used" },
      reason: "Record the seller's condition.",
      evidence: [{ kind: "seller", quote: "Used" }],
    },
    request(
      "Used",
      {
        title: "Large floor lamp",
        description: "Large floor lamp. Pickup or shipping.",
        price: 30,
        location: "Lausanne",
      },
      "What condition is the lamp in?",
    ),
    [],
    new Set(),
    "condition-answer",
  );
  assert.deepEqual(prepared.action?.patch, { condition: "Used" });
  assert.deepEqual(prepared.needsInput, []);
});

test("seller answers from earlier turns can complete a draft without asking again", () => {
  const req = request("Leave this detail unspecified and continue.", {
    description: "Desk. Small scratches.",
    condition: "Used",
  });
  req.context!.recentMessages = [
    { role: "assistant", text: "Pickup only. Like new." },
    { role: "user", text: "Pickup only" },
  ];
  const prepared = prepareListingAction(
    {
      patch: { description: "Desk. Small scratches.\nPickup only" },
      reason: "Keep the earlier handover answer.",
      evidence: [
        { kind: "seller", quote: "Desk. Small scratches." },
        { kind: "seller", quote: "Pickup only" },
      ],
    },
    req,
    [],
    new Set(),
    "history",
  );
  assert.equal(
    prepared.action?.patch.description,
    "Desk. Small scratches.\nPickup only",
  );
  assert.deepEqual(prepared.needsInput, []);
  assert.throws(
    () => seller({ condition: "Like new" }, "Like new", req),
    /ACTION_REJECTED/,
  );
  req.context!.recentMessages.push({ role: "user", text: "Good" });
  assert.throws(() => seller({ condition: "Good" }, "Good", req), /Historical/);
});

test("explicit answered-question history remains usable as seller evidence", () => {
  const req = request("Continue", { description: "Lamp." });
  req.context!.answeredQuestions = [
    { question: "How is it handed over?", answer: "Shipping possible" },
  ];
  const result = listingAction(
    {
      patch: { description: "Lamp.\nShipping possible" },
      reason: "Record the prior answer.",
      evidence: [
        { kind: "seller", quote: "Lamp." },
        { kind: "seller", quote: "Shipping possible" },
      ],
    },
    req,
    [],
    new Set(),
    "answered",
  );
  // The full unchanged narrative still needs its own evidence quote.
  assert.equal(result.patch.description, "Lamp.\nShipping possible");
});
