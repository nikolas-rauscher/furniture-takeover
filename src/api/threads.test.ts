import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { requestThreadTurn, threadTurnRequest } from "./threads.ts";
import { products } from "../testing/fixtures.ts";
import type { ThreadMessage } from "../pakoThread.ts";
import { threadTurnRequestSchema } from "../../shared/threadTurn.ts";

const desk = {
  ...products[1],
  pickupPoint: {
    name: "FMEL Vortex · outside reception",
    address: "Route de Praz-Véguey 29",
    area: "Chavannes",
    sourceUrl: "https://example.ch",
  },
};
const message = (
  index: number,
  from: "me" | "them",
  text = `Message ${index}`,
): ThreadMessage => ({
  id: `m${index}`,
  from,
  text,
  at: new Date(Date.UTC(2026, 10, 19, 12, index)).toISOString(),
});

test("Pako reads the listing's facts and the newest messages that fit, oldest first", () => {
  const messages = Array.from({ length: 25 }, (_, index) =>
    message(index, index % 2 ? "them" : "me"),
  );
  const request = threadTurnRequest({
    role: "buyer",
    listing: desk,
    messages,
    deal: null,
  });
  assert.equal(request.trigger, "reply");
  assert.deepEqual(
    request.messages.map((item) => item.id),
    messages.slice(5).map((item) => item.id),
  );
  assert.equal(request.listing.pickupPoint, "FMEL Vortex · outside reception");
  assert.equal(request.listing.pickup, "Pickup by Friday; 2026-10-16");
  const sent = JSON.stringify(request);
  assert.doesNotMatch(sent, /images|Noah|Route de Praz/);
  const long = threadTurnRequest({
    role: "buyer",
    listing: desk,
    messages: [
      message(1, "me", "a".repeat(4000)),
      message(2, "them", "b".repeat(4000)),
      message(3, "them", "c".repeat(100)),
    ],
    deal: null,
  });
  assert.deepEqual(
    long.messages.map((item) => item.id),
    ["m2", "m3"],
  );
});

test("Pako reads the deal as the student sees it and which messages carry their terms", () => {
  const deal = {
    status: "open" as const,
    agreed: null,
    proposal: {
      by: "them" as const,
      terms: {
        amount: 40,
        fulfillment: "pickup" as const,
        pickupAt: null,
        pickupTime: null,
        pickupPoint: null,
      },
    },
  };
  const request = threadTurnRequest({
    role: "buyer",
    listing: desk,
    messages: [{ ...message(1, "them"), structured: true }, message(2, "them")],
    deal,
  });
  assert.deepEqual(request.deal, deal);
  assert.deepEqual(
    request.messages.map((item) => item.structured),
    [true, undefined],
  );
});

test("asking Pako sends the instruction and the draft being written", () => {
  const request = threadTurnRequest({
    role: "seller",
    listing: desk,
    messages: [message(1, "them")],
    deal: null,
    ask: { instruction: "Make it friendlier", draft: "  No.  " },
  });
  assert.equal(request.trigger, "ask");
  assert.equal(request.instruction, "Make it friendlier");
  assert.equal(request.draft, "No.");
  const empty = threadTurnRequest({
    role: "seller",
    listing: desk,
    messages: [],
    deal: null,
    ask: { instruction: "Ask if it's still available", draft: " " },
  });
  assert.equal("draft" in empty, false);
});

test("account reply readings serialize PostgREST timestamps after pickup changes", () => {
  const request = threadTurnRequest({
    role: "buyer",
    listing: { ...desk, status: "reserved" },
    deal: {
      status: "agreed",
      agreed: {
        amount: 12,
        fulfillment: "pickup",
        pickupAt: "2026-11-20T11:02:00.000Z",
        pickupTime: "Fri 20 Nov, 12:02",
        pickupPoint: "Rolex Learning Center",
      },
      proposal: null,
    },
    messages: [
      ["them", "Counter-offer: CHF 12"],
      ["me", "Agreed"],
      ["them", "Rescheduled to 12:02"],
      ["me", "Running 10 minutes late"],
      ["them", "Can you meet at the entrance?"],
    ].map(([from, body], index) => ({
      id: `m${index}`,
      from: from as "me" | "them",
      text: body,
      at: `2026-11-20T10:0${index}:00.123456+00:00`,
      structured: index < 4,
    })),
  });
  assert.equal(request.messages.at(-1)?.at, "2026-11-20T10:04:00.123Z");
  assert.equal(threadTurnRequestSchema.safeParse(request).success, true);
});

const reading = {
  forMessageId: "m1",
  summary: "{other} offers CHF 40.",
  language: "en",
  stance: "offer",
  facts: {},
  pickupAt: null,
  agreement: { status: "none", missing: [] },
  options: [
    {
      id: "opt-1",
      label: "Accept",
      kind: "accept",
      message: "Deal at CHF 40!",
      terms: null,
    },
  ],
};

function answering(t: TestContext, status: number, body: unknown) {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify(body), { status }),
  );
}

test("a reading is checked before it is shown, and errors keep their code", async (t) => {
  const request = threadTurnRequest({
    role: "seller",
    listing: desk,
    messages: [message(1, "them")],
    deal: null,
  });
  answering(t, 200, {
    turn: reading,
    allowance: { limit: 150, remaining: 12, resetAt: "2026-11-20T00:00:00Z" },
  });
  assert.equal((await requestThreadTurn(request)).allowance?.remaining, 12);
  t.mock.restoreAll();
  answering(t, 200, { turn: { ...reading, options: [] } });
  await assert.rejects(requestThreadTurn(request), {
    code: "INVALID_RESPONSE",
  });
  t.mock.restoreAll();
  answering(t, 429, {
    error: {
      code: "THREAD_QUOTA_EXCEEDED",
      message: "Pako has read all the replies he can for today.",
    },
  });
  await assert.rejects(requestThreadTurn(request), {
    code: "THREAD_QUOTA_EXCEEDED",
    status: 429,
  });
});

test("a rejected reply reading shows and logs the server's reason", async (t) => {
  const message = "A reply reading needs the other student's message last.";
  const warn = t.mock.method(console, "warn", () => {});
  answering(t, 400, { error: { code: "INVALID_THREAD_REQUEST", message } });
  await assert.rejects(
    requestThreadTurn(
      threadTurnRequest({
        role: "buyer",
        listing: desk,
        messages: [],
        deal: null,
      }),
    ),
    { code: "INVALID_THREAD_REQUEST", message, status: 400 },
  );
  assert.deepEqual(warn.mock.calls[0].arguments, [
    `[agent] /api/agent/thread 400 INVALID_THREAD_REQUEST: ${message}`,
  ]);
});
