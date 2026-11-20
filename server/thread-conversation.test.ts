import test from "node:test";
import assert from "node:assert/strict";
import type { ThreadTurnRequest } from "../shared/threadTurn.ts";
import {
  amountAllowed,
  namesPlace,
  pointAllowed,
  shippingAllowed,
  timeAllowed,
} from "./thread-conversation.ts";

const vortex = "FMEL Vortex · outside reception";
const request: ThreadTurnRequest = {
  intent: "thread_turn",
  trigger: "reply",
  role: "buyer",
  listing: {
    title: "White study desk",
    price: 45,
    location: "Ecublens",
    pickup: "Weekday evenings",
    pickupPoint: vortex,
    status: "active",
  },
  deal: null,
  messages: [
    {
      id: "m1",
      from: "me",
      text: "Would you take CHF 30? I could pick it up Thursday at 18:00.",
      at: "2026-11-18T09:00:00.000Z",
    },
    {
      id: "m2",
      from: "them",
      text: "30 is low. 45 and you can ship it to me.",
      at: "2026-11-18T10:30:00.000Z",
    },
  ],
};

test("an amount is allowed when the student or the listing named it", () => {
  assert.equal(amountAllowed(30, "answer", request), true);
  assert.equal(amountAllowed(45, "answer", request), true);
  assert.equal(amountAllowed(38, "answer", request), false);
});

test("a counter-offer may name a whole franc between the two sides", () => {
  assert.equal(amountAllowed(38, "counter", request), true);
  assert.equal(amountAllowed(30, "counter", request), true);
  assert.equal(amountAllowed(46, "counter", request), false);
  assert.equal(amountAllowed(29, "counter", request), false);
});

test("a free listing has no amount but zero", () => {
  const free = { ...request, listing: { ...request.listing, price: 0 } };
  assert.equal(amountAllowed(0, "counter", free), true);
  assert.equal(amountAllowed(30, "counter", free), false);
});

test("a known meeting point may be named by one of its own words", () => {
  assert.equal(namesPlace("see you at the Vortex", vortex, request), true);
  assert.equal(namesPlace("see you outside", vortex, request), false);
  assert.equal(pointAllowed(vortex, request), true);
  assert.equal(pointAllowed("Flon station", request), false);
});

test("only the student's own words allow a time or shipping", () => {
  assert.equal(timeAllowed("Thursday at 18:00", request), true);
  assert.equal(timeAllowed("Friday at 18:00", request), false);
  assert.equal(shippingAllowed(request), false);
  const offersShipping: ThreadTurnRequest = {
    ...request,
    draft: "I can ship it by post.",
  };
  assert.equal(shippingAllowed(offersShipping), true);
});
