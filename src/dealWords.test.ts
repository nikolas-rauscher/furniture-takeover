import test from "node:test";
import assert from "node:assert/strict";
import type { Deal, DealTerms } from "../shared/deal.ts";
import {
  attachedTermsNote,
  awayPhase,
  dealStrip,
  dealView,
  eventChip,
  openTerms,
  reservedForChip,
  shownTerms,
  slotLabel,
  termPrice,
  termsSummary,
  threadDealNote,
} from "./dealWords.ts";

const terms: DealTerms = {
  amount: 40,
  fulfillment: "pickup",
  pickupAt: "2026-11-20T17:00:00.000Z",
  pickupTime: "Friday 18:00",
  pickupPoint: "FMEL Vortex · outside reception",
};
const listing = { price: 45, status: "active" as const };

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    conversationId: "c1",
    listingId: "l1",
    version: 1,
    status: "open",
    proposal: null,
    agreed: null,
    outcome: null,
    updatedAt: "2026-11-19T13:00:00.000Z",
    ...overrides,
  };
}
const strip = (input: Partial<Parameters<typeof dealStrip>[0]>) =>
  dealStrip({
    phase: "talking",
    deal: null,
    role: "buyer",
    other: "Léa",
    listing,
    now: new Date("2026-11-19T13:00:00.000Z"),
    ...input,
  });

test("terms read briefly in the strip and in full elsewhere", () => {
  assert.equal(
    termsSummary(terms, "brief"),
    "CHF 40 · Fri 18:00 · FMEL Vortex",
  );
  assert.equal(
    termsSummary(terms, "full"),
    "CHF 40 · Fri 20 Nov, 18:00 · FMEL Vortex",
  );
  assert.equal(
    termsSummary(
      {
        ...terms,
        fulfillment: "shipping",
        pickupAt: null,
        pickupTime: null,
        pickupPoint: null,
      },
      "brief",
    ),
    "CHF 40 · Shipping",
  );
  assert.equal(termPrice(0), "Free");
  assert.equal(termPrice(1250), "CHF 1,250");
  assert.equal(shownTerms(terms).pickupTime, "Fri 20 Nov, 18:00");
});

test("an incomplete offer says what it leaves open", () => {
  assert.equal(
    openTerms({
      ...terms,
      pickupAt: null,
      pickupTime: null,
      pickupPoint: null,
    }),
    "time and place open",
  );
  assert.equal(openTerms({ ...terms, amount: null }), "price open");
  assert.equal(openTerms(terms), "");
});

test("the strip names whose move it is, from each side", () => {
  const mine = deal({ proposal: { by: "buyer", terms, messageId: "m1" } });
  assert.deepEqual(strip({ phase: "you_confirmed", deal: mine }), {
    lead: "Your offer",
    detail: "CHF 40 · Fri 18:00 · FMEL Vortex",
    status: "Léa's turn",
    tone: "waiting",
  });
  assert.deepEqual(
    strip({
      phase: "offer_received",
      deal: mine,
      role: "seller",
      other: "Arjun",
    }),
    {
      lead: "Arjun offers",
      detail: "CHF 40 · Fri 18:00 · FMEL Vortex",
      tone: "needs",
    },
  );
  const open = deal({
    proposal: {
      by: "seller",
      terms: { ...terms, pickupAt: null, pickupTime: null, pickupPoint: null },
      messageId: "m1",
    },
  });
  assert.equal(
    strip({ phase: "partial_received", deal: open })?.detail,
    "CHF 40 · time and place open",
  );
  assert.equal(
    strip({ phase: "no_answer", deal: mine })?.status,
    "No answer yet",
  );
});

test("an agreed deal shows the booked pickup; a closed one says who ended it", () => {
  const agreed = deal({
    status: "agreed",
    agreed: { terms, at: "2026-11-19T13:00:00.000Z" },
  });
  assert.deepEqual(strip({ phase: "agreed", deal: agreed }), {
    lead: "Pickup booked",
    detail: "Fri 20 Nov, 18:00 · FMEL Vortex",
    tone: "booked",
  });
  const cancelled = (by: "buyer" | "seller") =>
    deal({
      status: "cancelled",
      outcome: { kind: "cancelled", by, at: "2026-11-19T14:00:00.000Z" },
    });
  assert.equal(
    strip({ phase: "cancelled", deal: cancelled("buyer") })?.detail,
    "You cancelled",
  );
  assert.equal(
    strip({ phase: "cancelled", deal: cancelled("seller") })?.detail,
    "Léa cancelled",
  );
  assert.equal(
    strip({
      phase: "gone",
      deal: deal(),
      listing: { ...listing, status: "reserved" },
    })?.lead,
    "Reserved for someone else",
  );
});

test("a buyer without an offer sees the asking price; a seller sees nothing yet", () => {
  assert.deepEqual(strip({}), {
    lead: "No offer yet",
    detail: "Asking CHF 45",
    tone: "start",
  });
  assert.equal(
    strip({ listing: { price: 0, status: "active" } })?.detail,
    "Free",
  );
  assert.equal(strip({ role: "seller" }), null);
  assert.equal(
    strip({ phase: "gone", listing: { ...listing, status: "sold" } }),
    null,
  );
});

test("event chips name what changed", () => {
  assert.equal(
    eventChip({ kind: "proposed", terms }),
    "Offer · CHF 40 · Fri 20 Nov, 18:00 · FMEL Vortex",
  );
  assert.equal(
    eventChip({ kind: "accepted", terms }),
    "Agreed ✓ · CHF 40 · Fri 20 Nov, 18:00",
  );
  assert.equal(
    eventChip({ kind: "superseded", terms: null }),
    "Offers closed · reserved for someone else",
  );
  assert.equal(
    eventChip({ kind: "withdrawn", terms: null }),
    "Offer withdrawn",
  );
});

test("terms travel with a message only while it states them", () => {
  const text =
    "Deal! CHF 40, Fri 20 Nov, 18:00 at FMEL Vortex · outside reception.";
  assert.deepEqual(attachedTermsNote(text, terms), {
    states: true,
    line: "Also updates the deal: CHF 40 · Fri 20 Nov, 18:00 · FMEL Vortex",
  });
  assert.deepEqual(attachedTermsNote("Deal! See you Friday.", terms), {
    states: false,
    line: "Your text no longer mentions CHF 40, so it will be sent as a normal message without updating the deal.",
  });
  assert.equal(
    attachedTermsNote("CHF 40 at FMEL Vortex · outside reception", terms).line,
    "Your text no longer mentions 18:00, so it will be sent as a normal message without updating the deal.",
  );
});

test("pickup chips say today and tomorrow, then the weekday, then the date", () => {
  const now = new Date("2026-11-19T13:05:00.000Z");
  assert.equal(slotLabel("2026-11-19T17:00:00.000Z", now), "Today 18:00");
  assert.equal(slotLabel("2026-11-20T17:00:00.000Z", now), "Tomorrow 18:00");
  assert.equal(slotLabel("2026-11-21T10:00:00.000Z", now), "Sat 11:00");
  assert.equal(slotLabel("2026-11-27T17:00:00.000Z", now), "Fri 27 Nov, 18:00");
  // Zurich's midnight decides the day, not UTC's.
  assert.equal(slotLabel("2026-11-19T23:30:00.000Z", now), "Tomorrow 00:30");
});

test("a thread card names its deal in a few words", () => {
  const NOW = new Date("2026-11-19T13:05:00.000Z");
  const offer = deal({ proposal: { by: "seller", terms, messageId: "m1" } });
  assert.equal(threadDealNote(offer, "buyer", NOW), "Offer · CHF 40");
  assert.equal(threadDealNote(offer, "seller", NOW), "Your offer · CHF 40");
  assert.equal(
    threadDealNote(
      deal({
        status: "agreed",
        agreed: { terms, at: "2026-11-19T13:00:00.000Z" },
      }),
      "buyer",
      NOW,
    ),
    "Agreed · Fri 18:00",
  );
  assert.equal(
    threadDealNote(deal({ status: "cancelled" }), "buyer", NOW),
    "Deal cancelled",
  );
  assert.equal(threadDealNote(deal(), "buyer", NOW), undefined);
  assert.equal(threadDealNote(null, "buyer", NOW), undefined);
  const booked = deal({
    status: "agreed",
    agreed: { terms, at: "2026-11-19T13:00:00.000Z" },
  });
  const after = (hours: number) =>
    new Date(Date.parse(terms.pickupAt!) + hours * 3_600_000);
  assert.equal(
    threadDealNote(booked, "seller", after(25)),
    "Did the pickup happen?",
  );
  assert.equal(
    threadDealNote(
      deal({
        status: "cancelled",
        outcome: {
          kind: "pickup_expired",
          by: null,
          at: "2026-11-22T17:00:00.000Z",
        },
      }),
      "buyer",
      NOW,
    ),
    "Reservation released",
  );
});

test("away from its thread a deal reads as its strip, and a thread without an offer has none", () => {
  const view = (changes: Partial<Deal>) =>
    dealView({
      deal: deal(changes),
      role: "buyer",
      other: "Léa",
      listing,
      now: new Date("2026-11-19T13:05:00.000Z"),
    });
  assert.deepEqual(
    view({ proposal: { by: "seller", terms, messageId: "m1" } }),
    {
      lead: "Léa offers",
      detail: "CHF 40 · Fri 18:00 · FMEL Vortex",
      tone: "needs",
    },
  );
  assert.equal(
    view({
      status: "agreed",
      agreed: { terms, at: "2026-11-19T13:00:00.000Z" },
    })?.tone,
    "booked",
  );
  assert.equal(view({}), null);
});

test("away from its thread, an offer whose message waited a day says so", () => {
  const offer = deal({ proposal: { by: "buyer", terms, messageId: "m1" } });
  const sent = (at: string) => ({
    id: "m1",
    from: "me" as const,
    text: "CHF 40?",
    at,
    structured: true,
  });
  const away = (latest?: ReturnType<typeof sent>) => ({
    deal: offer,
    role: "buyer" as const,
    listing,
    latest,
    now: new Date("2026-11-19T13:05:00.000Z"),
  });
  assert.equal(awayPhase(away(sent("2026-11-18T12:00:00.000Z"))), "no_answer");
  assert.equal(
    dealView({ ...away(sent("2026-11-18T12:00:00.000Z")), other: "Léa" })
      ?.status,
    "No answer yet",
  );
  assert.equal(
    awayPhase(away(sent("2026-11-19T09:00:00.000Z"))),
    "you_confirmed",
  );
  assert.equal(awayPhase(away()), "you_confirmed");
});

test("a seller's reserved listing names the buyer and the pickup", () => {
  assert.equal(
    reservedForChip("Arjun", terms),
    "Reserved for Arjun · Fri 18:00",
  );
  assert.equal(
    reservedForChip("Arjun", {
      ...terms,
      fulfillment: "shipping",
      pickupAt: null,
    }),
    "Reserved for Arjun",
  );
});
