import assert from "node:assert/strict";
import test from "node:test";
import { pickupSlots, formatPickup } from "./pickupTime.ts";
import {
  messageStatesTerms,
  threadDealSnapshot,
  applyDealAction,
  dealPhase,
} from "./deal.ts";
import {
  offerMessage,
  counterMessage,
  acceptMessage,
  confirmAgreementMessage,
} from "./dealMessages.ts";
import { dealTermsFromNegotiation } from "./negotiation.ts";
const now = new Date("2026-11-19T08:00:00Z");
test("slot chips and opening offer terms use Zurich time", () => {
  for (const [available, expected] of [
    ["Weekend pickup", 4],
    ["Weekday evenings", 4],
    ["Thursday after 17:00", 2],
    ["", 3],
  ] as const) {
    const slots = pickupSlots(available, now);
    assert.equal(slots.length, expected);
    for (const s of slots) assert.equal(s.pickupTime, formatPickup(s.pickupAt));
    if (available.startsWith("Thursday"))
      assert.ok(slots[0].pickupTime.includes("17:30"));
  }
});
test("every confirmation and offer states the terms and both roles share one deal", () => {
  const terms = dealTermsFromNegotiation(
    {
      amount: 0,
      pickupTime: "tomorrow 18:00",
      fulfillment: "pickup",
      pickupPoint: "Atrium",
      note: null,
    },
    now,
  );
  assert.ok(terms.pickupAt);
  for (const text of [
    offerMessage("Desk", terms),
    counterMessage(terms),
    acceptMessage("buyer", terms),
    acceptMessage("seller", terms),
    confirmAgreementMessage(terms),
  ]) {
    assert.ok(text.includes("free"));
    assert.ok(messageStatesTerms(text, terms).ok);
  }
  const { deal } = applyDealAction({
    conversationId: "t",
    listingId: "d",
    deal: null,
    action: { type: "propose", terms },
    actor: "buyer",
    body: offerMessage("Desk", terms),
    now,
    listingStatus: "active",
  });
  const input = {
    deal,
    listing: { status: "active" as const },
    messages: [],
    turn: null,
    now,
  };
  assert.equal(dealPhase({ ...input, role: "seller" }), "offer_received");
  assert.equal(dealPhase({ ...input, role: "buyer" }), "you_confirmed");
  assert.equal(threadDealSnapshot(deal, "seller")?.proposal?.by, "them");
});
