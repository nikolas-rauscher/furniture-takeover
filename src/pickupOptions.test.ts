import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyPickupSignals,
  messageStatesTerms,
  pickupDay,
  type Deal,
  type DealRole,
  type DealTerms,
} from "../shared/deal.ts";
import { pickupCountdown, dealStrip, threadNewsText } from "./dealWords.ts";
import { pickupGuide } from "./pakoMoods.ts";
import { changeSend, movedTerms, pickupChoices } from "./pickupOptions.ts";

const terms: DealTerms = {
  amount: 40,
  fulfillment: "pickup",
  pickupAt: "2026-11-20T17:00:00.000Z",
  pickupTime: "Fri 20 Nov, 18:00",
  pickupPoint: "FMEL Vortex · outside reception",
};
const pickupAt = Date.parse(terms.pickupAt!);
const minutes = (offset: number) => new Date(pickupAt + offset * 60_000);

function booked(overrides: Partial<Deal> = {}): Deal {
  return {
    conversationId: "c1",
    listingId: "l1",
    version: 3,
    status: "agreed",
    proposal: null,
    agreed: { terms, at: "2026-11-19T10:00:00.000Z" },
    outcome: null,
    updatedAt: "2026-11-19T10:00:00.000Z",
    pickup: emptyPickupSignals(),
    ...overrides,
  };
}

function choicesAt(offset: number, role: DealRole = "buyer", deal = booked()) {
  const day = pickupDay(deal, role, minutes(offset))!;
  return pickupChoices({ day, deal, role, other: "Léa", title: "desk" });
}
const ids = (choices: ReturnType<typeof choicesAt>) => ({
  primary: choices.primary?.id,
  secondary: choices.secondary.map((choice) => choice.id),
});

test("the countdown stays calm: in, now, then overdue", () => {
  const at = (offset: number) =>
    pickupCountdown(pickupDay(booked(), "buyer", minutes(offset))!);
  assert.equal(at(-130), "Pickup in 2 h 10 min");
  assert.equal(at(-40.5), "Pickup in 41 min");
  assert.equal(at(-120), "Pickup in 2 h");
  assert.equal(at(-3 * 24 * 60), "Pickup in 3 days");
  assert.equal(at(5), "Pickup now");
  assert.equal(at(15), "15 min overdue");
  assert.equal(at(75), "1 h 15 min overdue");
});

test("each phase offers what pickup day allows, one main action at most", () => {
  assert.deepEqual(ids(choicesAt(-24 * 60)), {
    primary: undefined,
    secondary: ["on_my_way", "change_time", "cant_make_it"],
  });
  assert.equal(
    choicesAt(-24 * 60).secondary[0].unavailable,
    "You can send this from 3 h before pickup.",
  );
  assert.deepEqual(ids(choicesAt(-60)), {
    primary: "on_my_way",
    secondary: ["late", "change_time", "cant_make_it"],
  });
  assert.deepEqual(ids(choicesAt(5)), {
    primary: "picked_up",
    secondary: ["on_my_way", "late", "cant_make_it"],
  });
  assert.deepEqual(ids(choicesAt(20, "seller")), {
    primary: "picked_up",
    secondary: ["no_show", "late", "cant_make_it"],
  });
  assert.equal(choicesAt(20, "seller").primary?.label, "Mark sold");
  assert.equal(
    choicesAt(20, "seller").secondary[0].label,
    "Léa didn't show up",
  );
});

test("a no-show is reported first, then the item is released on its own tap", () => {
  const reported = booked({
    pickup: {
      ...emptyPickupSignals(),
      noShow: { by: "seller", at: minutes(16).toISOString() },
    },
  });
  const choices = choicesAt(20, "seller", reported);
  const release = choices.secondary[0];
  assert.equal(release.id, "release");
  assert.equal(release.label, "Release the item");
  assert.match(release.confirm!, /goes back on sale/);
  assert.deepEqual(release.send?.action, { type: "release_no_show" });
});

test("a sent signal says when, and the buyer waits for the seller to mark it sold", () => {
  const onWay = booked({
    pickup: {
      ...emptyPickupSignals(),
      onWay: { buyer: "2026-11-20T16:40:00.000Z", seller: null },
    },
  });
  const soon = choicesAt(-30, "buyer", onWay);
  assert.equal(soon.primary, undefined);
  assert.equal(soon.secondary[0].unavailable, "You told Léa at 17:40.");
  const reported = booked({
    pickup: {
      ...emptyPickupSignals(),
      buyerPickedUpAt: minutes(2).toISOString(),
    },
  });
  assert.equal(
    choicesAt(3, "buyer", reported).primary?.unavailable,
    "Waiting for Léa to mark it sold.",
  );
  assert.deepEqual(ids(choicesAt(3, "seller", reported)), {
    primary: "picked_up",
    secondary: [],
  });
});

test("a new time is answered first and every time message states the terms", () => {
  const later = movedTerms(terms, "2026-11-21T17:00:00.000Z");
  assert.equal(later.pickupTime, "Sat 21 Nov, 18:00");
  assert.ok(messageStatesTerms(changeSend(later).message, later).ok);
  const changed = booked({
    proposal: { terms: later, by: "seller", messageId: "m2" },
  });
  const received = choicesAt(-60, "buyer", changed);
  assert.deepEqual(ids(received), {
    primary: "accept_time",
    secondary: ["keep_time", "cant_make_it"],
  });
  assert.ok(messageStatesTerms(received.primary!.send!.message, later).ok);
  assert.equal(received.secondary[0].label, "Keep Fri 18:00");
  assert.deepEqual(ids(choicesAt(-60, "seller", changed)), {
    primary: undefined,
    secondary: ["withdraw_time", "cant_make_it"],
  });
});

test("the strip counts down on pickup day and names a new time to answer", () => {
  const strip = (deal: Deal, offset: number) =>
    dealStrip({
      phase: "agreed",
      deal,
      role: "buyer",
      other: "Léa",
      listing: { price: 45, status: "reserved" },
      now: minutes(offset),
    });
  assert.equal(strip(booked(), -24 * 60)?.lead, "Pickup booked");
  assert.deepEqual(strip(booked(), -100), {
    lead: "Pickup in 1 h 40 min",
    detail: "18:00 · FMEL Vortex",
    tone: "needs",
  });
  const later = movedTerms(terms, "2026-11-21T17:00:00.000Z");
  assert.equal(
    strip(
      booked({ proposal: { terms: later, by: "seller", messageId: "m2" } }),
      -24 * 60,
    )?.lead,
    "Léa suggests a new time",
  );
});

test("pickup news reads from the reader's side and never guesses pronouns", () => {
  const reader = { role: "buyer" as const, other: "Léa" };
  const row = (
    kind: Parameters<typeof threadNewsText>[0]["kind"],
    actor: DealRole,
    extra = {},
  ) => threadNewsText({ kind, terms: null, actor, ...extra }, reader);
  assert.equal(row("on_my_way", "seller"), "Léa is on the way");
  assert.equal(row("on_my_way", "buyer"), "You're on the way");
  assert.equal(
    row("late", "seller", { minutes: 20 }),
    "Léa is about 20 min late",
  );
  assert.equal(row("picked_up", "seller"), "Sold ✓");
  assert.equal(row("picked_up", "buyer"), "You picked it up ✓");
  assert.throws(() => threadNewsText({ kind: "late", terms: null }, reader));
  assert.equal(
    threadNewsText({ kind: "declined", terms: null }, reader),
    "Declined",
  );
});

test("Pako's pickup line answers the other student's news before the clock", () => {
  const guide = (deal: Deal, offset: number, role: DealRole = "buyer") =>
    pickupGuide({
      day: pickupDay(deal, role, minutes(offset))!,
      deal,
      role,
      other: "Léa",
      title: "desk",
    });
  assert.deepEqual(guide(booked(), -100), {
    mood: "wave",
    line: "Tap On my way when you leave, so Léa knows.",
  });
  const late = booked({
    pickup: {
      ...emptyPickupSignals(),
      late: { minutes: 10, by: "seller", at: minutes(-5).toISOString() },
    },
  });
  assert.equal(
    guide(late, -2).line,
    "Léa is running late, so expect them around 18:10.",
  );
  assert.equal(guide(booked(), 20).line, "Did you meet Léa?");
  const reported = booked({
    pickup: {
      ...emptyPickupSignals(),
      buyerPickedUpAt: minutes(2).toISOString(),
    },
  });
  assert.equal(
    guide(reported, 3, "seller").line,
    "Léa says they picked it up. Mark it sold to finish.",
  );
});
