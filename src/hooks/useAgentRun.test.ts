import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAgentRunEvent,
  answerAgentQuestion,
  beginAgentRun,
  emptyAgentRunState,
  type AgentRunState,
} from "./useAgentRun.ts";

const initial: AgentRunState = {
  ...emptyAgentRunState(),
  id: "local-1",
  status: "running",
  text: "",
  sources: [],
  steps: [],
  error: null,
};

test("inventory matches are authoritative per-run snapshots and never leak into a new run", () => {
  const matches = applyAgentRunEvent(initial, {
    type: "inventory_matches",
    ids: ["own-bike"],
  });
  assert.deepEqual(matches.inventoryMatchIds, ["own-bike"]);
  assert.deepEqual(
    applyAgentRunEvent(matches, { type: "inventory_matches", ids: [] })
      .inventoryMatchIds,
    [],
  );
  assert.equal(
    beginAgentRun(matches, "Find a lamp", "new-run").inventoryMatchIds,
    null,
  );
  assert.equal(
    beginAgentRun(matches, "Try again", "retry-run", true, true)
      .inventoryMatchIds,
    null,
  );
});

test("a question is visible immediately and survives a successful question-only completion", () => {
  const question = {
    type: "question" as const,
    id: "question-1",
    question: "What is your budget?",
    choices: ["Under CHF 50", "Under CHF 100"],
  };
  const asking = applyAgentRunEvent(initial, question);
  assert.equal(asking.questions[0].question, question.question);
  assert.equal(asking.status, "running");
  const completed = applyAgentRunEvent(asking, {
    type: "complete",
    text: question.question,
    sources: [],
    runId: "run-question",
  });
  assert.equal(completed.status, "complete");
  assert.equal(completed.error, null);
  assert.deepEqual(completed.questions, [question]);
});

test("follow-ups retain the answered question, while retry and reset do not duplicate conversation", () => {
  const first = beginAgentRun(emptyAgentRunState(), "Find a desk", "run-1");
  const asked = applyAgentRunEvent(first, {
    type: "question",
    id: "q-1",
    question: "What is your budget?",
  });
  const answered = answerAgentQuestion(asked, "q-1", "Under CHF 80");
  const next = beginAgentRun(answered, "Under CHF 80", "run-2");
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].request, "Find a desk");
  assert.equal(next.history[0].answers["q-1"], "Under CHF 80");
  assert.equal(next.questions.length, 0);
  assert.equal(next.answers["q-1"], undefined);
  const retry = beginAgentRun(next, "Under CHF 80", "run-3", true, true);
  assert.equal(retry.history.length, 1);
  assert.equal(
    beginAgentRun(answered, "Start over", "run-4", false).history.length,
    0,
  );
  assert.equal(emptyAgentRunState().history.length, 0);
});

test("structured proposals remain un-applied state data, including a researched price", () => {
  const action = {
    type: "listing_patch" as const,
    id: "price-1",
    patch: { price: 80 },
    reason: "Comparable asking prices.",
    evidence: [
      { kind: "source" as const, sourceId: "web-1", quote: "Asking CHF 80" },
    ],
    requiresAcceptance: true,
  };
  const proposed = applyAgentRunEvent(initial, action);
  assert.deepEqual(proposed.actions, [action]);
  assert.equal(
    proposed.actions[0].type === "listing_patch" &&
      proposed.actions[0].requiresAcceptance,
    true,
  );
  const failed = applyAgentRunEvent(proposed, {
    type: "error",
    code: "SEARCH_FAILED",
    message: "Research stopped.",
  });
  assert.equal(failed.actions.length, 1);
});

test("a tool completion updates the existing real activity step in place", () => {
  const running = applyAgentRunEvent(initial, {
    type: "status",
    id: "tool-1",
    label: "Searching listings",
    state: "running",
  });
  const done = applyAgentRunEvent(running, {
    type: "status",
    id: "tool-1",
    label: "Searching listings",
    state: "complete",
  });
  assert.equal(done.steps.length, 1);
  assert.equal(done.steps[0].state, "complete");
  assert.equal(initial.steps.length, 0);
});

test("canonical completion replaces streamed text and sources instead of duplicating them", () => {
  const partial = applyAgentRunEvent(initial, {
    type: "text_delta",
    text: "A partial",
  });
  const result = applyAgentRunEvent(partial, {
    type: "complete",
    text: "The complete response.",
    sources: [],
    runId: "server-1",
  });
  assert.equal(result.text, "The complete response.");
  assert.equal(result.id, "server-1");
  assert.equal(result.status, "complete");
});

test("completion removes all earlier source cards when the final source scope is empty", () => {
  const streamed = applyAgentRunEvent(initial, {
    type: "sources",
    sources: [
      {
        id: "web-1",
        title: "Old platform offer",
        url: "https://old.example.com/offer",
        snippet: "Earlier search result",
      },
    ],
  });
  const finished = applyAgentRunEvent(streamed, {
    type: "complete",
    text: "No offers on the requested platform.",
    sources: [],
    runId: "final-scope",
  });
  assert.deepEqual(finished.sources, []);
  assert.equal(streamed.sources.length, 1);
});

test("source snapshots update the existing result", () => {
  const source = {
    id: "web-1",
    title: "Chair",
    url: "https://example.com",
    snippet: "A chair",
  };
  const first = applyAgentRunEvent(initial, {
    type: "sources",
    sources: [source],
  });
  const second = applyAgentRunEvent(first, {
    type: "sources",
    sources: [{ ...source, snippet: "Updated snippet" }],
  });
  assert.equal(second.sources.length, 1);
  assert.equal(second.sources[0].snippet, "Updated snippet");
});

test("a source-scope reset removes old cards before completion and later snapshots keep only new cards", () => {
  const oldSource = {
    id: "web-1",
    title: "Old offer",
    url: "https://old.example.com/offer",
    snippet: "Old platform",
  };
  const newSource = {
    id: "web-2",
    title: "Requested platform offer",
    url: "https://new.example.com/offer",
    snippet: "New platform",
  };
  const oldScope = applyAgentRunEvent(initial, {
    type: "sources",
    sources: [oldSource],
  });
  const cleared = applyAgentRunEvent(oldScope, {
    type: "sources",
    sources: [],
  });
  assert.equal(cleared.status, "running");
  assert.deepEqual(cleared.sources, []);
  const nextScope = applyAgentRunEvent(cleared, {
    type: "sources",
    sources: [newSource],
  });
  assert.deepEqual(nextScope.sources, [newSource]);
});

test("a failure keeps useful partial text and sources for review", () => {
  const partial = applyAgentRunEvent(initial, {
    type: "text_delta",
    text: "Available information",
  });
  const failed = applyAgentRunEvent(partial, {
    type: "error",
    code: "UNAVAILABLE",
    message: "Please try again.",
  });
  assert.equal(failed.status, "error");
  assert.equal(failed.text, "Available information");
  assert.equal(failed.error, "Please try again.");
});

test("completion and follow-ups keep a stable UI turn and its listing cards", () => {
  const started = beginAgentRun(
    emptyAgentRunState(),
    "Find a desk",
    "client-key",
  );
  const matched = applyAgentRunEvent(started, {
    type: "inventory_matches",
    ids: ["desk-1"],
  });
  const completed = applyAgentRunEvent(matched, {
    type: "complete",
    text: "One desk",
    sources: [],
    runId: "server-id",
  });
  assert.equal(completed.turnKey, "client-key");
  const next = beginAgentRun(completed, "I'll take it", "next-key");
  assert.equal(next.history[0].turnKey, "client-key");
  assert.deepEqual(next.history[0].inventoryMatchIds, ["desk-1"]);
  assert.equal(next.inventoryMatchIds, null);
});

test("tool-created message drafts stay with their turn and revisions do not rewrite history", () => {
  const proposal = {
    schemaVersion: 1 as const,
    id: "proposal-1", listingId: "chair-1", version: 2,
    status: "draft" as const,
    terms: { amount: 25, fulfillment: "pickup" as const, pickupTime: "Tomorrow", pickupPoint: null, note: null },
    evidence: {},
    draft: { message: "Hi, may I collect the chair tomorrow for CHF 25?", version: 2 },
  };
  const ready = applyAgentRunEvent(initial, { type: "negotiation_update", previousVersion: 1, negotiation: proposal });
  assert.equal(ready.proposal?.draft?.message, proposal.draft.message);
  const next = beginAgentRun(ready, "Make that Saturday", "next-turn");
  assert.equal(next.history[0]?.proposal?.draft?.message, proposal.draft.message);
  assert.equal(next.proposal, undefined);
  const { draft: _draft, ...withoutDraft } = proposal;
  const revised = applyAgentRunEvent(next, { type: "negotiation_update", previousVersion: 2, negotiation: { ...withoutDraft, version: 3, terms: { ...proposal.terms, pickupTime: "Saturday" } } });
  assert.equal(revised.proposal?.draft, undefined);
  assert.equal(revised.history[0]?.proposal?.terms.pickupTime, "Tomorrow");
  assert.equal(beginAgentRun(revised, "New search", "reset-turn", false).history.length, 0);
});
