import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPickupAction,
  pickupDay,
  type Deal,
  type DealTerms,
} from "./deal.ts";
import { pickupScenarios, type PickupStep } from "./dealScenarios.ts";

const pickupAt = "2026-11-20T17:00:00.000Z";
const later = "2026-11-21T17:00:00.000Z";
const terms: DealTerms = {
  amount: 0,
  fulfillment: "pickup",
  pickupAt,
  pickupTime: "Fri 20 Nov, 18:00",
  pickupPoint: "FMEL Vortex · outside reception",
};
const booked: Deal = {
  conversationId: "11111111-1111-4111-8111-111111111111",
  listingId: "desk",
  version: 2,
  status: "agreed",
  agreed: { terms, at: "2026-11-19T17:00:00.000Z" },
  proposal: null,
  outcome: null,
  updatedAt: "2026-11-19T17:00:00.000Z",
};
const scenarios = pickupScenarios(terms, later, booked.conversationId);
const at = (minutes: number) =>
  new Date(Date.parse(pickupAt) + minutes * 60000);
const apply = (deal: Deal | null, now: Date, step: PickupStep) =>
  applyPickupAction({
    conversationId: booked.conversationId,
    listingId: booked.listingId,
    deal,
    now,
    listingStatus: "reserved",
    ...step,
  });

test("pickup day derives boundaries without changing a booked deal", () => {
  for (const [minutes, phase, canSignal] of [
    [-181, "booked", false],
    [-180, "booked", true],
    [-121, "booked", true],
    [-120, "pickup_soon", true],
    [0, "pickup_now", true],
    [14, "pickup_now", true],
    [15, "overdue", true],
    [60, "overdue", true],
    [61, "overdue", false],
  ] as const) {
    const day = pickupDay(booked, "seller", at(minutes));
    assert.equal(day?.phase, phase);
    assert.equal(day?.canSignal, canSignal);
  }
  assert.equal(booked.version, 2);
});

test("a pickup change preserves the booking until accepted and clears old signals", () => {
  let deal = booked;
  for (const step of scenarios.handling) {
    if ("error" in step) {
      assert.throws(() => apply(deal, at(-90), step), { key: step.error });
      continue;
    }
    const result = apply(
      deal,
      at(step.action.type === "picked_up" ? 1445 : -90),
      step,
    );
    assert.equal(result.deal.version, deal.version + 1);
    assert.equal(result.event.kind, step.kind);
    assert.equal(
      result.statusChange,
      "statusChange" in step ? step.statusChange : undefined,
    );
    deal = result.deal;
    if (step.kind === "time_suggested" || step.kind === "time_kept")
      assert.equal(deal.agreed?.terms.pickupAt, pickupAt);
    if (step.kind === "time_accepted") {
      assert.equal(deal.agreed?.terms.pickupAt, later);
      assert.equal(deal.pickup?.late, null);
    }
    if (step.kind === "picked_up" && step.actor === "buyer") {
      assert.equal(deal.status, "agreed");
      assert.ok(deal.pickup?.buyerPickedUpAt);
    }
  }
  assert.equal(deal.status, "completed");
});

test("a delay moves both no-show actions to the revised time plus the grace period", () => {
  const delayed = apply(booked, at(-10), {
    actor: "buyer",
    action: { type: "late", minutes: 30 },
    body: "Running 30 minutes late.",
  }).deal;
  for (const step of scenarios.overdue) {
    assert.equal(
      pickupDay(delayed, step.actor, at(44))?.canReportNoShow,
      false,
    );
    assert.throws(() => apply(delayed, at(44), step), { key: "too_early" });
    assert.equal(apply(delayed, at(45), step).event.kind, step.kind);
  }
});

test("the seller can complete pickup from the booked time or when the buyer reports it", () => {
  const [buyerPickup, sellerPickup] = scenarios.handling.slice(-2);
  assert.throws(() => apply(booked, at(-1), sellerPickup), {
    key: "too_early",
  });
  assert.equal(apply(booked, at(0), sellerPickup).statusChange, "sold");
  const collected = apply(booked, at(-1), buyerPickup).deal;
  assert.equal(apply(collected, at(-1), sellerPickup).statusChange, "sold");
});

test("after the buyer's Picked up the follow-up can no longer release the item", () => {
  const [buyerPickup] = scenarios.handling.slice(-2);
  const collected = apply(booked, at(-1), buyerPickup).deal;
  const followUp = at(24 * 60 + 5);
  for (const actor of ["buyer", "seller"] as const) {
    assert.throws(
      () =>
        apply(collected, followUp, {
          actor,
          action: { type: "release_stale_pickup" },
          body: "No, release it",
        }),
      { key: "pickup_collected" },
    );
    const done = apply(collected, followUp, {
      actor,
      action: { type: "confirm_pickup_happened" },
      body: "Yes, it's done",
    });
    assert.equal(done.statusChange, "sold");
  }
});

test("reports need an overdue pickup and taking a release message is a separate action", () => {
  assert.throws(() => apply(booked, at(14), scenarios.earlyNoShow), {
    key: "too_early",
  });
  let deal = booked;
  for (const step of scenarios.overdue) {
    const result = apply(deal, at(15), step);
    assert.equal(result.event.kind, step.kind);
    deal = result.deal;
  }
  assert.equal(deal.outcome?.kind, "no_show");
  const result = applyPickupAction({
    ...scenarios.nextBuyer,
    deal: null,
    releasedDeal: deal,
    now: at(16),
    listingStatus: "active",
    conversationId: "next",
    listingId: booked.listingId,
  });
  assert.equal(result.deal.proposal, null);
  assert.equal(result.event.kind, "offered_again");
});
