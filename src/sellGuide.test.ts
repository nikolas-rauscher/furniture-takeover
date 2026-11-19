import test from "node:test";
import assert from "node:assert/strict";
import type { AssistResponse } from "../shared/agent.ts";
import { buyerQuestions, recognisedLine, sellGuide } from "./sellGuide.ts";

const analysis = (
  metadata: Partial<AssistResponse["metadata"]>,
  missingDetails: string[] = [],
): AssistResponse => ({
  mode: "live",
  model: "test",
  suggestions: [],
  missingDetails,
  metadata: { keywords: [], ...metadata },
});
const facts = (overrides: Partial<Parameters<typeof sellGuide>[0]> = {}) =>
  sellGuide({
    photoCount: 1,
    photoReading: false,
    preparing: false,
    allowanceUsed: false,
    hasPlace: true,
    typing: false,
    insight: { status: "reading", noteOnly: false },
    ...overrides,
  });

test("before photos Pako waves, and listens while the student writes", () => {
  const empty = facts({ photoCount: 0, insight: { status: "empty" } });
  assert.equal(empty.mood, "wave");
  assert.equal(empty.bubble.title, "Snap what's left in your room");
  assert.equal(
    facts({ photoCount: 0, typing: true, insight: { status: "empty" } }).mood,
    "listen",
  );
});

test("while a photo loads or he looks, his line changes in one bubble", () => {
  const loading = facts({ photoReading: true });
  const looking = facts();
  const reading = facts({ insight: { status: "reading", noteOnly: true } });
  assert.equal(loading.mood, "work");
  assert.equal(loading.bubble.text, "Loading your photo…");
  assert.equal(looking.mood, "think");
  assert.equal(looking.bubble.text, "Let me have a look…");
  assert.equal(reading.bubble.text, "Reading your note…");
  assert.equal(
    new Set([loading, looking, reading].map((guide) => guide.bubble.id)).size,
    1,
  );
});

test("Pako names what he recognised and invites the tap that writes the listing", () => {
  const desk = facts({
    insight: {
      status: "ready",
      response: analysis({ title: "Desk with a wood-look top" }, [
        "Screen size",
        "RAM",
      ]),
      note: "",
    },
  });
  assert.equal(desk.mood, "happy");
  assert.equal(desk.bubble.title, "Oh, nice!");
  assert.equal(
    desk.bubble.text,
    "Desk with a wood-look top. Tap Write my listing and I'll check what similar ones sell for. Buyers often ask about screen size and RAM.",
  );
  const noted = facts({
    insight: {
      status: "ready",
      response: analysis({
        title: "IKEA desk",
        dimensions: "120×60 cm",
        condition: "Used",
      }),
      note: "ikea 120x60, used 2 years",
    },
  });
  assert.equal(noted.bubble.title, "Okay, got it!");
  assert.match(
    noted.bubble.text,
    /^IKEA desk, 120×60 cm, used\. Tap Write my listing/,
  );
  const priced = facts({
    insight: {
      status: "ready",
      response: analysis({ title: "IKEA desk", price: 40 }),
      note: "40 chf",
    },
  });
  assert.equal(
    priced.bubble.text,
    "IKEA desk for CHF 40. Tap Write my listing and I'll ask you a couple of quick things.",
    "a price from the note needs no research",
  );
  assert.notEqual(
    desk.bubble.id,
    priced.bubble.id,
    "each reaction is a new moment",
  );
});

test("without a name or a place Pako says what he needs; a failure and the used allowance have their own lines", () => {
  const unknown = facts({
    insight: { status: "ready", response: analysis({}), note: "" },
  });
  assert.equal(unknown.mood, "think");
  assert.equal(unknown.bubble.title, "Nice photo!");
  const noPlace = facts({ hasPlace: false });
  assert.equal(noPlace.mood, "listen");
  assert.equal(noPlace.bubble.title, "Where can buyers pick it up?");
  const failed = facts({
    insight: { status: "failed", error: "Offline", retry: () => {} },
  });
  assert.equal(failed.mood, "dizzy");
  assert.equal(failed.bubble.title, "Hmm, that didn't work");
  assert.equal(facts({ allowanceUsed: true }).mood, "sleep");
  assert.equal(
    facts({
      typing: true,
      insight: {
        status: "ready",
        response: analysis({ title: "Desk" }),
        note: "",
      },
    }).mood,
    "listen",
  );
});

test("buyers' questions are short phrases about the item, two at most", () => {
  assert.deepEqual(
    buyerQuestions(["Storage capacity", "RAM", "Screen size", "Condition"]),
    ["storage capacity", "RAM"],
  );
  assert.deepEqual(
    buyerQuestions([
      "What is the price?",
      "Price",
      "Pickup location",
      "Where can buyers pick them up",
      "Charger included",
    ]),
    ["charger included"],
  );
  assert.deepEqual(
    buyerQuestions(["Is the desk easy to disassemble for pickup?"]),
    [],
  );
  assert.deepEqual(
    buyerQuestions(["Battery health and number of charge cycles"]),
    [],
  );
});

test("the recognised line names the item and the facts its title leaves out", () => {
  assert.equal(recognisedLine({ title: "Desk" }), "Desk");
  assert.equal(
    recognisedLine({
      title: "IKEA desk, 120x60 cm",
      dimensions: "120x60 cm",
      condition: "Used",
    }),
    "IKEA desk, 120x60 cm, used",
  );
  assert.equal(recognisedLine({ title: "Lamp", price: 0 }), "Lamp for free");
});
