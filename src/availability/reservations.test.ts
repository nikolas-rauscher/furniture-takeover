import test from "node:test";
import assert from "node:assert/strict";
import { HOUR_MS } from "./config.ts";
import {
  advance,
  cancelReservation,
  confirmReservation,
  declineReservation,
  emptyAvailability,
  joinWaitlist,
  listingAvailability,
  releaseOtherReservations,
  requestReservation,
  resetAvailability,
  type AvailabilityState,
  type ListingRef,
  type Transition,
} from "./reservations.ts";

const NOW = new Date("2026-03-02T09:00:00.000Z");
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR_MS);
const iso = (hours: number) => at(hours).toISOString();
const desk: ListingRef = {
  id: "desk",
  title: "Compact desk",
  status: "active",
};
const sofa: ListingRef = {
  id: "sofa",
  title: "Two-seat sofa",
  status: "reserved",
};
const lamp: ListingRef = { id: "lamp", title: "Desk lamp", status: "active" };

/** What App.setStatus would do with the returned changes. */
function applied(listings: ListingRef[], t: Transition): ListingRef[] {
  return listings.map((listing) => ({
    ...listing,
    status:
      t.statusChanges.filter((change) => change.listingId === listing.id).at(-1)
        ?.status ?? listing.status,
  }));
}
const find = (listings: ListingRef[], id: string) =>
  listings.find((listing) => listing.id === id)!;

function requested(pickupBy = "2026-03-03") {
  return requestReservation(emptyAvailability(), desk, pickupBy, NOW);
}

test("a request waits for the seller without changing the listing", () => {
  const t = requested();
  assert.deepEqual(t.statusChanges, []);
  assert.equal(t.state.reservations.length, 1);
  assert.equal(t.state.reservations[0].replyBy, iso(24));
  assert.equal(t.state.reservations[0].pickupBy, "2026-03-03");
  assert.equal(listingAvailability(t.state, desk, NOW).kind, "pending");
});

test("seller confirmation reserves the listing and holds it for 48 hours", () => {
  const t = confirmReservation(requested().state, desk, at(2));
  assert.deepEqual(t.statusChanges, [
    { listingId: "desk", status: "reserved" },
  ]);
  assert.equal(t.state.reservations[0].status, "held");
  assert.equal(t.state.reservations[0].holdUntil, iso(50));
  assert.deepEqual(t.state.originalStatus, { desk: "active" });
  const [held] = applied([desk], t);
  assert.equal(listingAvailability(t.state, held, at(2)).kind, "held");
});

test("seller decline marks the listing sold and tells the buyer", () => {
  const t = declineReservation(requested().state, desk, at(1));
  assert.deepEqual(t.statusChanges, [{ listingId: "desk", status: "sold" }]);
  assert.deepEqual(t.state.reservations, []);
  assert.deepEqual(
    t.notices.map((notice) => notice.kind),
    ["declined"],
  );
  const [sold] = applied([desk], t);
  assert.deepEqual(listingAvailability(t.state, sold, at(1)), {
    kind: "sold",
    declined: true,
  });
});

test("no seller reply by the deadline withdraws the listing", () => {
  const pending = requested().state;
  const early = advance(pending, [desk], new Date(at(24).getTime() - 60000));
  assert.equal(early.state, pending);
  assert.deepEqual(early.statusChanges, []);

  const late = advance(pending, [desk], at(24));
  assert.deepEqual(late.statusChanges, [
    { listingId: "desk", status: "withdrawn" },
  ]);
  assert.deepEqual(late.state.reservations, []);
  assert.deepEqual(
    late.notices.map((notice) => [notice.kind, notice.title]),
    [["expired", "Compact desk"]],
  );
});

test("a skipped clock applies every deadline it passes", () => {
  const t = advance(requested().state, [desk], at(48));
  assert.deepEqual(t.statusChanges, [
    { listingId: "desk", status: "withdrawn" },
  ]);
});

test("a hold that is not collected makes the listing active again", () => {
  const confirmed = confirmReservation(requested().state, desk, at(2));
  const listings = applied([desk], confirmed);
  assert.deepEqual(
    advance(confirmed.state, listings, at(49)).statusChanges,
    [],
  );

  const ended = advance(confirmed.state, listings, at(50));
  assert.deepEqual(ended.statusChanges, [
    { listingId: "desk", status: "active" },
  ]);
  assert.deepEqual(ended.state.reservations, []);
  assert.deepEqual(
    ended.notices.map((notice) => notice.kind),
    ["hold_ended"],
  );
});

test("the buyer can cancel a pending or held reservation", () => {
  const pending = requested();
  const confirmed = confirmReservation(pending.state, desk, at(1));
  const cases: [string, AvailabilityState, ListingRef, unknown[]][] = [
    ["pending: listing stays active", pending.state, desk, []],
    [
      "held: listing becomes active again",
      confirmed.state,
      find(applied([desk], confirmed), "desk"),
      [{ listingId: "desk", status: "active" }],
    ],
  ];
  for (const [name, state, listing, changes] of cases) {
    const t = cancelReservation(state, listing, at(3));
    assert.deepEqual(t.statusChanges, changes, name);
    assert.deepEqual(t.state.reservations, [], name);
  }
});

test("cancelling a held reservation hands the item to the first waiting buyer", () => {
  const confirmed = confirmReservation(requested().state, desk, at(1));
  const state: AvailabilityState = {
    ...confirmed.state,
    waitlist: [{ listingId: "desk", title: "Compact desk", joinedAt: iso(1) }],
  };
  const t = cancelReservation(state, { ...desk, status: "reserved" }, at(3));
  assert.deepEqual(t.statusChanges, [{ listingId: "desk", status: "active" }]);
  assert.equal(t.state.waitlist[0].priorityUntil, iso(15));
  assert.deepEqual(
    t.notices.map((notice) => notice.kind),
    ["available_again"],
  );
});

test("a waiting buyer gets first turn when the other reservation ends", () => {
  const joined = joinWaitlist(emptyAvailability(), sofa, NOW);
  assert.deepEqual(listingAvailability(joined.state, sofa, NOW), {
    kind: "reserved",
    position: 1,
  });

  const released = releaseOtherReservations(joined.state, [sofa, desk], at(1));
  assert.deepEqual(released.statusChanges, [
    { listingId: "sofa", status: "active" },
  ]);
  assert.deepEqual(
    released.notices.map((notice) => [notice.kind, notice.until]),
    [["available_again", iso(13)]],
  );
  const freed = find(applied([sofa], released), "sofa");
  assert.deepEqual(listingAvailability(released.state, freed, at(2)), {
    kind: "open",
    priorityUntil: iso(13),
  });

  const claimed = requestReservation(
    released.state,
    freed,
    "2026-03-03",
    at(2),
  );
  assert.deepEqual(claimed.state.waitlist, []);
  assert.deepEqual(claimed.state.notices, []);
  assert.equal(
    listingAvailability(claimed.state, freed, at(2)).kind,
    "pending",
  );
});

test("an unused priority window lapses", () => {
  const joined = joinWaitlist(emptyAvailability(), sofa, NOW);
  const released = releaseOtherReservations(joined.state, [sofa], at(1));
  const freed = applied([sofa], released);
  assert.equal(advance(released.state, freed, at(12)).state, released.state);
  const lapsed = advance(released.state, freed, at(13));
  assert.deepEqual(lapsed.state.waitlist, []);
  assert.deepEqual(lapsed.state.notices, []);
  assert.deepEqual(lapsed.statusChanges, []);
});

test("other buyers' cancellation does not touch the buyer's own hold", () => {
  const confirmed = confirmReservation(requested().state, desk, at(1));
  const listings = applied([desk, sofa], confirmed);
  const t = releaseOtherReservations(confirmed.state, listings, at(2));
  assert.deepEqual(t.statusChanges, [{ listingId: "sofa", status: "active" }]);
  assert.equal(t.state.reservations[0].status, "held");
});

test("reset restores only the statuses this feature changed", () => {
  const joined = joinWaitlist(emptyAvailability(), sofa, NOW);
  const released = releaseOtherReservations(joined.state, [sofa], at(1));
  const confirmed = confirmReservation(
    requestReservation(released.state, desk, "2026-03-03", at(1)).state,
    desk,
    at(2),
  );
  const listings = applied(applied([desk, sofa, lamp], released), confirmed);
  assert.deepEqual(
    listings.map((listing) => listing.status),
    ["reserved", "active", "active"],
  );

  const t = resetAvailability(confirmed.state, listings);
  assert.deepEqual(t.statusChanges, [
    { listingId: "sofa", status: "reserved" },
    { listingId: "desk", status: "active" },
  ]);
  assert.deepEqual(t.state, emptyAvailability());
  assert.deepEqual(
    resetAvailability(confirmed.state, [desk, sofa, lamp]).statusChanges,
    [],
    "listings already back at their original status are left alone",
  );
});

test("moves that do not apply to the current state change nothing", () => {
  const pending = requested().state;
  const confirmed = confirmReservation(pending, desk, at(1));
  const held = find(applied([desk], confirmed), "desk");
  const cases: [string, Transition][] = [
    [
      "confirm without a request",
      confirmReservation(emptyAvailability(), desk, NOW),
    ],
    [
      "decline after confirming",
      declineReservation(confirmed.state, held, at(2)),
    ],
    ["confirm twice", confirmReservation(confirmed.state, held, at(2))],
    ["request twice", requestReservation(pending, desk, "2026-03-03", NOW)],
    [
      "request an item reserved by someone else",
      requestReservation(emptyAvailability(), sofa, "2026-03-03", NOW),
    ],
    [
      "join the waitlist of an active item",
      joinWaitlist(emptyAvailability(), desk, NOW),
    ],
    [
      "cancel without a reservation",
      cancelReservation(emptyAvailability(), desk, NOW),
    ],
  ];
  for (const [name, t] of cases) {
    assert.deepEqual(t.statusChanges, [], name);
    assert.deepEqual(t.notices, [], name);
  }
  assert.equal(
    confirmReservation(confirmed.state, held, at(2)).state,
    confirmed.state,
  );
});

test("records that no longer match their listing are dropped quietly", () => {
  const pending = requested().state;
  const soldElsewhere = advance(pending, [{ ...desk, status: "sold" }], at(1));
  assert.deepEqual(soldElsewhere.state.reservations, []);
  assert.deepEqual(soldElsewhere.statusChanges, []);
  assert.deepEqual(soldElsewhere.notices, []);

  const joined = joinWaitlist(emptyAvailability(), sofa, NOW).state;
  const removed = advance(joined, [], at(1));
  assert.deepEqual(removed.state.waitlist, []);
});
