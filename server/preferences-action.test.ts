import test from "node:test";
import assert from "node:assert/strict";
import type { AgentListingDraft } from "../shared/actions.ts";
import { preferencesAction } from "./preferences-action.ts";

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
