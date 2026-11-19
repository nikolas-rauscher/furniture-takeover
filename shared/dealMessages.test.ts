import test from "node:test";
import assert from "node:assert/strict";
import {
  askToBeNextMessage,
  draftMessage,
  nudgeMessage,
} from "./dealMessages.ts";

test("the opening offer states the amount as CHF, and asks for what is unknown", () => {
  assert.equal(
    draftMessage("White study desk", {
      amount: 40,
      fulfillment: "pickup",
      pickupTime: "Thursday at 18:00",
      pickupPoint: null,
      note: null,
    }),
    "Hi, I'm interested in your White study desk. Is it still available? Would you accept CHF 40? Would pickup Thursday at 18:00 work for you? Where would you like to meet for pickup?",
  );
});

test("a nudge asks each side the question that fits it, and never mentions a price", () => {
  assert.equal(
    nudgeMessage("buyer", "desk lamp"),
    "Hi! Just checking in: is the desk lamp still available?",
  );
  assert.equal(
    nudgeMessage("seller", "desk lamp"),
    "Hi! Just checking in: are you still interested in the desk lamp?",
  );
  for (const message of [
    nudgeMessage("buyer", "desk lamp"),
    nudgeMessage("seller", "desk lamp"),
    askToBeNextMessage("desk lamp"),
  ])
    assert.doesNotMatch(message, /CHF|\d/);
});
