import test from "node:test";
import assert from "node:assert/strict";
import type { DealTerms } from "../shared/deal.ts";
import { pickupSlots } from "../shared/pickupTime.ts";
import { NO_TERMS, priceChoices, type OfferMode } from "./dealOptions.ts";
import { priceNamedInSearch } from "./components/namedOfferPrice.ts";
import { newNegotiation } from "../shared/negotiation.ts";
import {
  proposalLine,
  proposeOffer,
  type ChangedTerms,
} from "./offerProposal.ts";

/** Thursday 19 November 2026, 14:05 in Lausanne. */
const now = new Date("2026-11-19T13:05:00.000Z");
const OCHETTES = "FMEL Ochettes · outside entrance";
const UNCHANGED: ChangedTerms = { price: false, time: false, place: false };

function propose({
  mode = "offer",
  terms = NO_TERMS,
  asking = 200,
  available = "Weekend pickup",
  namedPrice = null,
  counter,
  listingPoint = OCHETTES,
  homePoint,
}: {
  mode?: OfferMode;
  terms?: DealTerms;
  asking?: number;
  available?: string;
  namedPrice?: number | null;
  counter?: Parameters<typeof proposeOffer>[0]["counter"];
  listingPoint?: string | null;
  homePoint?: string;
}) {
  const proposal = proposeOffer({
    mode,
    terms,
    asking,
    counter,
    counterChoices: priceChoices({ asking, counter }),
    namedPrice,
    slots: pickupSlots(available, now),
    listingPoint: listingPoint ?? undefined,
    homePoint,
    now,
  });
  const line = (changed = UNCHANGED, role: "buyer" | "seller" = "buyer") =>
    proposalLine(proposal, changed, {
      mode,
      role,
      otherName: "Léa",
      available,
      shipping: terms.fulfillment === "shipping",
      now,
    });
  return { proposal, line };
}

test("a first offer starts 10% under the asking price at the earliest weekend slot and the listing's point", () => {
  const { proposal, line } = propose({});
  assert.equal(proposal.amount, 180);
  assert.equal(proposal.slot?.pickupAt, "2026-11-21T10:00:00.000Z");
  assert.equal(proposal.place, OCHETTES);
  assert.equal(
    line(),
    "I'd offer CHF 180, about 10% under the asking price, so there's room to meet in the middle. Saturday 11:00 fits the seller's weekend pickup, at FMEL Ochettes, the listing's meeting point.",
  );
});

test("a cheap item keeps its asking price, and a free one only plans the pickup", () => {
  assert.equal(
    propose({ asking: 5, available: "Flexible pickup" }).line(),
    "I'd offer the asking price of CHF 5, since there's little room under it. Tomorrow 18:00 fits the seller's flexible pickup, at FMEL Ochettes, the listing's meeting point.",
  );
  const free = propose({ asking: 0 });
  assert.equal(free.proposal.amount, 0);
  assert.match(
    free.line(),
    /^It's free, so there's only the pickup to plan\. /,
  );
});

test("a price the student named in the search chat leads the offer", () => {
  const { proposal, line } = propose({ namedPrice: 150 });
  assert.equal(proposal.amount, 150);
  assert.match(
    line(),
    /^I'd offer CHF 150, the price you named when we searched\./,
  );
});

test("without a listing point, Pako meets near where the student searches", () => {
  const { proposal, line } = propose({
    listingPoint: null,
    homePoint: "Rolex Learning Center",
  });
  assert.equal(proposal.place, "Rolex Learning Center");
  assert.match(line(), /at Rolex Learning Center, near where you search\.$/);
});

test("a counter lies between both prices and keeps the time and place the other student named", () => {
  const theirs: DealTerms = {
    amount: 120,
    fulfillment: "pickup",
    pickupAt: "2026-11-20T17:00:00.000Z",
    pickupTime: "Fri 20 Nov, 18:00",
    pickupPoint: OCHETTES,
  };
  const { proposal, line } = propose({
    mode: "counter",
    terms: theirs,
    counter: { theirs: 120, mine: 160, mineFrom: "offer" },
  });
  assert.equal(proposal.amount, 140);
  assert.equal(proposal.slot?.pickupAt, theirs.pickupAt);
  assert.equal(
    line(),
    "I'd counter with CHF 140, between Léa's CHF 120 and your CHF 160. Tomorrow 18:00 at FMEL Ochettes stays as Léa suggested.",
  );
  const seller = propose({
    mode: "counter",
    terms: theirs,
    counter: { theirs: 120, mine: 200, mineFrom: "asking" },
  });
  assert.match(
    seller.line(UNCHANGED, "seller"),
    /^I'd counter with CHF 160, between Léa's CHF 120 and your asking price of CHF 200\./,
  );
});

test("terms the student changed drop out of Pako's line", () => {
  const { line } = propose({});
  assert.equal(
    line({ price: true, time: false, place: false }),
    "Saturday 11:00 fits the seller's weekend pickup, at FMEL Ochettes, the listing's meeting point.",
  );
  assert.equal(
    line({ price: true, time: true, place: true }),
    "Got it. Your changes are in the message.",
  );
});

test("confirming terms read from the messages waits for the student's own time", () => {
  const read: DealTerms = {
    ...NO_TERMS,
    amount: 40,
    fulfillment: "pickup",
    pickupPoint: OCHETTES,
  };
  const { proposal, line } = propose({
    mode: "confirm",
    terms: read,
    asking: 45,
  });
  assert.equal(proposal.slot, null);
  assert.equal(
    line(),
    "I read CHF 40 in your messages. We'd meet at FMEL Ochettes. Pick a pickup time and I'll add it.",
  );
});

test("only a price the student wrote in the search chat counts as named", () => {
  const draft = newNegotiation("n-1", "desk");
  const named = {
    ...draft,
    terms: { ...draft.terms, amount: 150 },
    evidence: { amount: { origin: "buyer" as const, quote: "I'd pay 150" } },
  };
  assert.equal(priceNamedInSearch([named], "desk"), 150);
  assert.equal(priceNamedInSearch([named], "lamp"), null);
  const fromListing = {
    ...named,
    evidence: { amount: { origin: "listing" as const, quote: "CHF 180" } },
  };
  assert.equal(priceNamedInSearch([fromListing], "desk"), null);
  assert.equal(
    priceNamedInSearch([{ ...named, status: "sent" }], "desk"),
    null,
  );
});
