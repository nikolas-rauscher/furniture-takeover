import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { requestThreadTurn, threadTurnRequest } from "./threads.ts";
import { products } from "../testing/fixtures.ts";
import type { ThreadMessage } from "../pakoThread.ts";

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
    messages: [
      { ...message(1, "them"), structured: true },
      message(2, "them"),
    ],
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
