import test from "node:test";
import assert from "node:assert/strict";
import type { AgentRunRequest } from "../shared/runs.ts";
import { questionTopic, repeatedQuestion } from "./conversation.ts";
test("handed-over answers resolve later pickup-versus-posting questions", () => {
  const request: AgentRunRequest = {
    text: "Shipping possible",
    context: {
      intent: "listing_assist",
      previousQuestion: "How should the jersey be handed over?",
    },
  };
  assert.equal(
    questionTopic(request.context?.previousQuestion ?? ""),
    "fulfillment",
  );
  assert.equal(
    repeatedQuestion(
      "Thanks — I'll note shipping possible. Should the buyer pick it up, or should you post it?",
      request,
    )?.answer,
    "Shipping possible",
  );
  assert.equal(
    repeatedQuestion("Where can someone collect it?", request),
    undefined,
  );
});
test("skip resolves a paraphrased handover question too", () => {
  const request: AgentRunRequest = {
    text: "I don't know. Leave this detail unspecified and continue.",
    context: {
      intent: "listing_assist",
      previousQuestion: "How should the jersey be handed over?",
    },
  };
  assert.ok(repeatedQuestion("Pickup only or shipping possible?", request));
});

test("buyer questions are not blocked by unscoped answers about another listing", () => {
  const request: AgentRunRequest = {
    text: "I also want this chair.",
    context: {
      intent: "negotiation",
      recentMessages: [
        { role: "assistant", text: "When can you collect the desk?" },
        { role: "user", text: "Saturday at 15:00" },
      ],
    },
  };
  assert.equal(
    repeatedQuestion("When can you collect the chair?", request),
    undefined,
  );
  // Even identical wording can concern a different item.
  assert.equal(
    repeatedQuestion("When can you collect the desk?", request),
    undefined,
  );
});

test("a skipped question stays skipped when Pako rewords it or leads in with a remark", () => {
  const request: AgentRunRequest = {
    text: "Polish the description",
    context: {
      intent: "listing_assist",
      currentDraft: {
        title: "MacBook Pro with 16 GB RAM",
        description: "",
        price: 1250,
        condition: "",
        dimensions: "",
        location: "Lausanne",
        pickup: "",
        raw: "",
      },
      skippedQuestions: [
        {
          question: "Which model year or chip is this MacBook Pro?",
          listingField: "other",
        },
      ],
    },
  };
  for (const reworded of [
    "Thanks — I've noted 512 GB. Next: which model year or chip is this MacBook Pro?",
    "Which chip does it have?",
    "What model year is it?",
  ])
    assert.equal(repeatedQuestion(reworded, request)?.answer, "Skipped");
  for (const other of [
    "How much storage does it have?",
    "Is this MacBook Pro's battery still good?",
    "Which one is it?",
  ])
    assert.equal(repeatedQuestion(other, request), undefined);
});
