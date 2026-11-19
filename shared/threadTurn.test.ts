import test from "node:test";
import assert from "node:assert/strict";
import {
  threadTurnRequestSchema,
  threadTurnSchema,
  type ThreadTurnRequest,
} from "./threadTurn.ts";

const request: ThreadTurnRequest = {
  intent: "thread_turn",
  trigger: "reply",
  role: "seller",
  listing: { title: "White study desk", price: 45, status: "active" },
  deal: null,
  messages: [
    {
      id: "m1",
      from: "them",
      text: "Hi! Could I get it for 40?",
      at: "2026-11-19T13:02:00.000Z",
    },
  ],
};
const accepted = (value: unknown) =>
  threadTurnRequestSchema.safeParse(value).success;

test("a reply reading needs the other student's message last", () => {
  assert.equal(accepted(request), true);
  assert.equal(
    accepted({
      ...request,
      messages: [{ ...request.messages[0], from: "me" }],
    }),
    false,
  );
  assert.equal(accepted({ ...request, messages: [] }), false);
});

test("only asking Pako takes an instruction or a draft, and asking needs one", () => {
  assert.equal(
    accepted({ ...request, trigger: "ask", instruction: "Make it friendlier" }),
    true,
  );
  assert.equal(
    accepted({
      ...request,
      trigger: "ask",
      messages: [],
      instruction: "Ask if it's still available",
    }),
    true,
  );
  assert.equal(accepted({ ...request, trigger: "ask" }), false);
  assert.equal(
    accepted({ ...request, instruction: "Make it friendlier" }),
    false,
  );
  assert.equal(accepted({ ...request, draft: "Hi" }), false);
});

test("messages are unique, in order and within Pako's reading caps", () => {
  const message = request.messages[0];
  assert.equal(accepted({ ...request, messages: [message, message] }), false);
  assert.equal(
    accepted({
      ...request,
      messages: [
        { ...message, id: "m0", at: "2026-11-19T14:00:00.000Z" },
        message,
      ],
    }),
    false,
  );
  const long = "x".repeat(4000);
  assert.equal(
    accepted({
      ...request,
      messages: ["a", "b", "c"].map((id, index) => ({
        ...message,
        id,
        text: long,
        at: `2026-11-19T13:0${index}:00.000Z`,
      })),
    }),
    false,
  );
  assert.equal(
    accepted({
      ...request,
      messages: Array.from({ length: 21 }, (_, index) => ({
        ...message,
        id: `m${index}`,
      })),
    }),
    false,
  );
  assert.equal(
    accepted({ ...request, listing: { ...request.listing, image: "x" } }),
    false,
  );
});

test("a reading holds one to three options with server ids", () => {
  const option = {
    id: "opt-1",
    label: "Meet at CHF 42",
    kind: "counter",
    message: "Could we meet in the middle at CHF 42?",
    terms: null,
  };
  const turn = {
    forMessageId: "m1",
    summary: "{other} offers CHF 40.",
    language: "en",
    stance: "offer",
    facts: {
      amount: { value: 40, quote: "Could I get it for 40?", from: "them" },
    },
    pickupAt: null,
    agreement: { status: "none", missing: [] },
    options: [option],
  };
  assert.equal(threadTurnSchema.safeParse(turn).success, true);
  assert.equal(
    threadTurnSchema.safeParse({ ...turn, options: [] }).success,
    false,
  );
  assert.equal(
    threadTurnSchema.safeParse({
      ...turn,
      options: [{ ...option, id: "opt-4" }],
    }).success,
    false,
  );
  assert.equal(
    threadTurnSchema.safeParse({ ...turn, summary: "x".repeat(201) }).success,
    false,
  );
});
