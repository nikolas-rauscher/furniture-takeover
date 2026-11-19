import test from "node:test";
import assert from "node:assert/strict";
import type { Deal, DealTerms } from "../shared/deal.ts";
import {
  acceptMessage,
  askToConfirmMessage,
  cancelDealMessage,
  confirmAgreementMessage,
  declineMessage,
  withdrawMessage,
} from "../shared/dealMessages.ts";
import type { ThreadTurn } from "../shared/threadTurn.ts";
import {
  cardPhase,
  counterPrices,
  dealOptions,
  meetingPointChoices,
  nearbyMeetingPoint,
  priceChoices,
  type DealOption,
} from "./dealOptions.ts";

const now = new Date("2026-11-19T13:05:00.000Z");
const listing = {
  title: "White study desk",
  price: 45,
  status: "active" as const,
};
const complete: DealTerms = {
  amount: 40,
  fulfillment: "pickup",
  pickupAt: "2026-11-20T17:00:00.000Z",
  pickupTime: "Fri 20 Nov, 18:00",
  pickupPoint: "FMEL Vortex · outside reception",
};
const partial: DealTerms = {
  ...complete,
  pickupAt: null,
  pickupTime: null,
  pickupPoint: null,
};

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    conversationId: "c1",
    listingId: "l1",
    version: 1,
    status: "open",
    proposal: null,
    agreed: null,
    outcome: null,
    updatedAt: now.toISOString(),
    ...overrides,
  };
}
const offerBy = (by: "buyer" | "seller", terms = complete) =>
  deal({ proposal: { by, terms, messageId: "m1" } });

function turn(overrides: Partial<ThreadTurn> = {}): ThreadTurn {
  return {
    forMessageId: "m2",
    summary: "{other} agrees to CHF 40 on Friday at 18:00 at the Vortex.",
    language: "en",
    stance: "accepts",
    facts: {
      amount: { value: 40, quote: "40 is fine", from: "them" },
      pickupTime: {
        value: "Friday 18:00",
        quote: "Friday 18:00",
        from: "them",
      },
      pickupPoint: {
        value: "FMEL Vortex · outside reception",
        quote: "FMEL Vortex · outside reception",
        from: "them",
      },
    },
    pickupAt: "2026-11-20T17:00:00.000Z",
    agreement: { status: "complete", missing: [] },
    options: [
      {
        id: "opt-1",
        label: "Confirm",
        kind: "accept",
        message: "Great!",
        terms: null,
      },
    ],
    ...overrides,
  };
}

const options = (input: Partial<Parameters<typeof dealOptions>[0]>) =>
  dealOptions({
    phase: "talking",
    deal: null,
    listing,
    role: "buyer",
    otherName: "Léa",
    turn: null,
    now,
    ...input,
  });
const ids = (list: DealOption[]) => list.map((option) => option.id);

test("a complete offer from the other side is confirmed in one tap that says what it sends", () => {
  const forBuyer = options({
    phase: "offer_received",
    deal: offerBy("seller"),
  });
  assert.deepEqual(forBuyer.primary, {
    kind: "act",
    id: "confirm",
    label: "Confirm pickup",
    action: { type: "accept", terms: complete },
    message: acceptMessage("buyer", complete),
  });
  assert.deepEqual(ids(forBuyer.secondary), ["counter", "decline"]);
  const forSeller = options({
    phase: "offer_received",
    deal: offerBy("buyer"),
    role: "seller",
    otherName: "Arjun",
  });
  assert.equal(forSeller.primary?.label, "Confirm sale");
  assert.equal(
    forSeller.primary?.kind === "act" && forSeller.primary.message,
    acceptMessage("seller", complete),
  );
  const shipped = { ...partial, fulfillment: "shipping" as const };
  assert.equal(
    options({ phase: "offer_received", deal: offerBy("seller", shipped) })
      .primary?.label,
    "Confirm purchase",
  );
});

test("declining asks first and sends the decline template", () => {
  const decline = options({
    phase: "offer_received",
    deal: offerBy("seller"),
  }).secondary.find((option) => option.id === "decline");
  assert.deepEqual(decline, {
    kind: "act",
    id: "decline",
    label: "Decline",
    action: { type: "decline" },
    message: declineMessage(),
    confirm: "Decline Léa's offer?",
  });
});

test("an incomplete offer opens the offer card for what it leaves open", () => {
  const result = options({
    phase: "partial_received",
    deal: offerBy("seller", partial),
  });
  assert.deepEqual(result.primary, {
    kind: "edit",
    id: "complete",
    label: "Choose time & place",
    entry: { mode: "complete", terms: partial },
  });
  const priceOnly = { ...complete, amount: null };
  assert.equal(
    options({ phase: "partial_received", deal: offerBy("seller", priceOnly) })
      .primary?.label,
    "Choose a price",
  );
});

test("terms that look agreed are confirmed as Pako read them, or need a time first", () => {
  const read: DealTerms = {
    amount: 40,
    fulfillment: "pickup",
    pickupAt: "2026-11-20T17:00:00.000Z",
    pickupTime: "Friday 18:00",
    pickupPoint: "FMEL Vortex · outside reception",
  };
  const agreed = options({ phase: "looks_agreed", turn: turn() });
  assert.deepEqual(agreed.primary, {
    kind: "act",
    id: "confirm",
    label: "Confirm pickup",
    action: { type: "propose", terms: read },
    message: confirmAgreementMessage(read),
  });
  assert.deepEqual(ids(agreed.secondary), ["change"]);
  const noTime = options({
    phase: "looks_agreed",
    turn: turn({
      pickupAt: null,
      agreement: { status: "partial", missing: ["pickupTime"] },
    }),
  });
  assert.equal(noTime.primary?.label, "Pick a time to confirm");
  assert.equal(
    noTime.primary?.kind === "edit" && noTime.primary.entry.mode,
    "confirm",
  );
  const past = options({
    phase: "looks_agreed",
    turn: turn({ pickupAt: "2026-11-19T12:00:00.000Z" }),
  });
  assert.equal(past.primary?.label, "Pick a time to confirm");
});

test("an acceptance with only the time open already looks agreed", () => {
  const timeOpen = turn({
    agreement: { status: "partial", missing: ["pickupTime"] },
  });
  assert.equal(cardPhase("your_turn", timeOpen), "looks_agreed");
  const placeOpen = turn({
    agreement: { status: "partial", missing: ["pickupPoint"] },
  });
  assert.equal(cardPhase("your_turn", placeOpen), "your_turn");
  assert.equal(cardPhase("offer_received", timeOpen), "offer_received");
});

test("my pending offer can change or be withdrawn, and an acceptance in words asks for the confirmation", () => {
  const waiting = options({ phase: "you_confirmed", deal: offerBy("buyer") });
  assert.equal(waiting.primary, undefined);
  assert.deepEqual(ids(waiting.secondary), ["change", "withdraw"]);
  const withdraw = waiting.secondary[1];
  assert.equal(withdraw.kind === "act" && withdraw.message, withdrawMessage());
  const accepted = options({
    phase: "you_confirmed",
    deal: offerBy("buyer"),
    turn: turn(),
  });
  assert.deepEqual(accepted.secondary.at(-1), {
    kind: "write",
    id: "ask-confirm",
    label: "Ask Léa to confirm",
    message: askToConfirmMessage(),
  });
});

test("an agreed deal can be cancelled after a question that names what changes", () => {
  const agreed = deal({
    status: "agreed",
    agreed: { terms: complete, at: now.toISOString() },
  });
  const [cancel] = options({
    phase: "agreed",
    deal: agreed,
    role: "seller",
    otherName: "Arjun",
  }).secondary;
  assert.deepEqual(cancel, {
    kind: "act",
    id: "cancel",
    label: "Cancel deal",
    action: { type: "cancel", reason: "changed_mind" },
    message: cancelDealMessage(),
    confirm:
      "Cancel the deal with Arjun? The White study desk becomes available again.",
  });
});

test("a buyer without an offer is offered one; sellers and gone listings are not", () => {
  assert.equal(options({ phase: "talking" }).primary?.label, "Make an offer");
  assert.equal(
    options({ phase: "your_turn", listing: { ...listing, price: 0 } }).primary
      ?.label,
    "Plan pickup",
  );
  assert.deepEqual(options({ phase: "talking", role: "seller" }), {
    secondary: [],
  });
  assert.deepEqual(
    options({ phase: "gone", listing: { ...listing, status: "reserved" } }),
    { secondary: [] },
  );
  assert.deepEqual(
    ids(
      options({ phase: "cancelled", deal: deal({ status: "cancelled" }) })
        .secondary,
    ),
    ["similar"],
  );
});

test("first offers start at the asking price and step down; free items have no price", () => {
  assert.deepEqual(priceChoices({ asking: 45 }), [45, 40, 35]);
  assert.deepEqual(priceChoices({ asking: 8 }), [8, 7, 6]);
  assert.deepEqual(priceChoices({ asking: 0 }), []);
});

test("counter prices lie strictly between both sides' latest prices", () => {
  for (const counter of [
    { theirs: 40, mine: 45 },
    { theirs: 45, mine: 30 },
    { theirs: 120, mine: 80 },
  ]) {
    const prices = priceChoices({ asking: 45, counter });
    assert.ok(prices.length > 0);
    const low = Math.min(counter.theirs, counter.mine);
    const high = Math.max(counter.theirs, counter.mine);
    assert.ok(
      prices.every((price) => price > low && price < high),
      String(prices),
    );
  }
  assert.deepEqual(
    priceChoices({ asking: 45, counter: { theirs: 40, mine: 41 } }),
    [],
  );
  assert.deepEqual(
    priceChoices({ asking: 0, counter: { theirs: 0, mine: 0 } }),
    [],
  );
});

test("without an offer of their own, a seller counters from the asking price and a buyer from below", () => {
  assert.deepEqual(
    counterPrices({ role: "seller", theirs: 35, mineBefore: null, asking: 45 }),
    { theirs: 35, mine: 45 },
  );
  assert.deepEqual(
    counterPrices({ role: "buyer", theirs: 45, mineBefore: null, asking: 45 }),
    { theirs: 45, mine: 35 },
  );
  assert.deepEqual(
    counterPrices({ role: "buyer", theirs: 45, mineBefore: 38, asking: 45 }),
    { theirs: 45, mine: 38 },
  );
});

test("meeting points to tap come once each, and the student's area names its campus point", () => {
  assert.deepEqual(
    meetingPointChoices(
      "Rolex Learning Center",
      undefined,
      "Rolex Learning Center",
      null,
    ),
    ["Rolex Learning Center"],
  );
  assert.equal(
    nearbyMeetingPoint("FMEL Vortex, Chavannes-près-Renens"),
    "FMEL Vortex · outside reception",
  );
  assert.equal(nearbyMeetingPoint("EPFL, Ecublens"), "Rolex Learning Center");
  assert.equal(nearbyMeetingPoint("UNIL, Dorigny"), "UNIL-Mouline metro");
  assert.equal(nearbyMeetingPoint("Geneva"), undefined);
});
