import assert from "node:assert/strict";
import test from "node:test";
import type {
  AgentListingPatchEvent,
  AgentPreferencesPatchEvent,
} from "../shared/actions.ts";
import { defaults } from "../shared/marketplace.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import {
  agentDraft,
  applyListingAction,
  applyPreferenceAction,
  undoListingAction,
  undoPreferenceAction,
} from "./agentActions.ts";
import { newSearch } from "./searchRequest.ts";

const today = "2026-10-13";
const draft: ListingDraft = {
  image: "private-data-image",
  raw: "My desk, CHF 50",
  title: "Desk",
  description: "White desk.",
  price: "50",
  condition: "",
  dimensions: "",
  location: "Lausanne",
  pickup: "",
  category: "All",
};
const action = (
  patch: AgentListingPatchEvent["patch"],
  requiresAcceptance = false,
): AgentListingPatchEvent => ({
  type: "listing_patch",
  id: "patch-1",
  patch,
  reason: "The seller supplied these details.",
  evidence: [{ kind: "seller", quote: "My desk, CHF 50" }],
  requiresAcceptance,
});

test("seller-stated facts and zero price apply without an extra confirmation", () => {
  const result = applyListingAction(
    draft,
    action({ dimensions: "120 × 60 cm", condition: "good", price: 0 }),
    {},
    {},
    false,
    today,
  );
  assert.equal(result.next.dimensions, "120 × 60 cm");
  assert.equal(result.next.condition, "Good");
  assert.equal(result.next.price, "0");
  assert.equal(result.pending, false);
  assert.equal(draft.price, "50");
  assert.equal(result.changes.price?.before, "50");
});

test("researched price stays a proposal until accepted", () => {
  const proposal = action({ price: 75 }, true);
  const pending = applyListingAction(draft, proposal, {}, {}, false, today);
  assert.equal(pending.pending, true);
  assert.equal(pending.next.price, "50");
  assert.deepEqual(pending.changes, {});
  assert.equal(
    applyListingAction(draft, proposal, {}, {}, true, today).next.price,
    "75",
  );
});

test("accepting a researched price updates its labelled description amount without changing purchase costs or other facts", () => {
  const current = {
    ...draft,
    price: "40",
    description:
      "Bought for CHF 40. Original price: CHF 40. Price: CHF 40. Delivery CHF 40. Small scratches. Chair not included.",
  };
  const proposal = action({ price: 65 }, true);
  assert.equal(
    applyListingAction(current, proposal, {}, {}, false, today).next
      .description,
    current.description,
  );
  const applied = applyListingAction(current, proposal, {}, {}, true, today);
  assert.equal(
    applied.next.description,
    "Bought for CHF 40. Original price: CHF 40. Price: CHF 65. Delivery CHF 40. Small scratches. Chair not included.",
  );
  const undone = undoListingAction(applied.next, applied.changes, {});
  assert.equal(undone.next.description, current.description);
  assert.equal(undone.next.price, "40");
});

test("price acceptance and undo preserve a manually revised description", () => {
  const current = {
    ...draft,
    price: "40",
    description: "My edited description. Asking price: CHF 40.",
  };
  const proposal = action({ price: 65 }, true);
  const protectedResult = applyListingAction(
    current,
    proposal,
    {},
    { description: 1 },
    true,
    today,
  );
  assert.equal(protectedResult.next.price, "65");
  assert.equal(protectedResult.next.description, current.description);
  assert.deepEqual(protectedResult.skipped, ["description"]);
  const applied = applyListingAction(current, proposal, {}, {}, true, today);
  const manuallyEdited = {
    ...applied.next,
    description: "My final description.",
  };
  const undone = undoListingAction(manuallyEdited, applied.changes, {
    description: 1,
  });
  assert.equal(undone.next.price, "40");
  assert.equal(undone.next.description, "My final description.");
});

test("late tool patches preserve manual field edits, including edits changed back to the old value", () => {
  const current = { ...draft, title: "My corrected title" };
  const result = applyListingAction(
    current,
    action({
      title: "Agent title",
      description: "Agent description",
      price: 80,
    }),
    {},
    { title: 1, price: 2 },
    false,
    today,
  );
  assert.equal(result.next.title, "My corrected title");
  assert.equal(result.next.price, "50");
  assert.equal(result.next.description, "Agent description");
  assert.deepEqual(result.skipped, ["title", "price"]);
});

test("accepting an old price proposal cannot overwrite a newer manual asking price", () => {
  const result = applyListingAction(
    { ...draft, price: "65" },
    action({ price: 75 }, true),
    {},
    { price: 1 },
    true,
    today,
  );
  assert.equal(result.next.price, "65");
  assert.deepEqual(result.skipped, ["price"]);
});

test("undo restores the agent's changes while preserving later manual corrections", () => {
  const applied = applyListingAction(
    draft,
    action({ title: "New title", dimensions: "120 × 60 cm" }),
    {},
    {},
    false,
    today,
  );
  const undone = undoListingAction(
    { ...applied.next, title: "My later title" },
    applied.changes,
    { title: 1 },
  );
  assert.equal(undone.next.title, "My later title");
  assert.equal(undone.next.dimensions, "");
  assert.deepEqual(undone.preserved, ["title"]);
  assert.deepEqual(undone.restored, ["dimensions"]);
});

test("invalid dates, oversized text and out-of-range prices do not enter the editable draft", () => {
  const result = applyListingAction(
    draft,
    action({ pickup: "2026-02-30", condition: "x".repeat(121), price: 10001 }),
    {},
    {},
    false,
    today,
  );
  assert.deepEqual(result.next, draft);
  assert.equal(result.skipped.length, 3);
  assert.equal(
    applyListingAction(
      draft,
      action({ pickup: "2026-10-12" }),
      {},
      {},
      false,
      today,
    ).next.pickup,
    "",
  );
});

test("a supplied condition outside the old select labels remains editable", () => {
  assert.equal(
    applyListingAction(
      draft,
      action({ condition: "Like new" }),
      {},
      {},
      false,
      today,
    ).next.condition,
    "Like new",
  );
});

test("agent context contains bounded text facts and never the uploaded photo", () => {
  const supplied = agentDraft({
    ...draft,
    description: "x".repeat(4500),
    price: "",
  });
  assert.equal(supplied.description.length, 4000);
  assert.equal(supplied.price, null);
  assert.equal(supplied.raw, draft.raw);
  assert.equal("image" in supplied, false);
  assert.equal("category" in supplied, false);
});

test("structured search answers update actual preferences and keep the original question context", () => {
  const original = newSearch("I need a desk", defaults, "Lausanne");
  const patch: AgentPreferencesPatchEvent = {
    type: "preferences_patch",
    id: "prefs",
    patch: {
      query: "white desk",
      maxPrice: 0,
      radius: 5,
      location: "Bern",
      source: "Kleinanzeigen",
      pickupBy: "",
    },
    reason: "Updated from your answer.",
    evidence: [{ kind: "seller", quote: "Free, within 5 km in Bern" }],
  };
  const result = applyPreferenceAction(original, patch, today);
  assert.equal(result.next.criteria.maxPrice, 0);
  assert.equal(result.next.criteria.source, "Kleinanzeigen");
  assert.equal(result.next.location, "Bern");
  assert.equal(result.next.originalRequest, "I need a desk");
  const afterManualEdit = {
    ...result.next,
    criteria: { ...result.next.criteria, maxPrice: 25 },
  };
  const undone = undoPreferenceAction(afterManualEdit, result.changes);
  assert.equal(undone.criteria.maxPrice, 25);
  assert.equal(undone.criteria.radius, defaults.radius);
  assert.equal(undone.location, "Lausanne");
});
