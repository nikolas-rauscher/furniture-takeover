import test from "node:test";
import assert from "node:assert/strict";
import {
  pakoReadDecision,
  theirQuotes,
  threadNotice,
  withName,
  type ThreadMessage,
} from "./pakoThread.ts";
import type { ThreadTurn } from "../shared/threadTurn.ts";

const theirs = { id: "m2", from: "them" } as const;
const ready = {
  latest: theirs,
  loaded: true,
  handledId: undefined,
  visible: true,
  autoRead: true,
  remaining: undefined,
  online: true,
};

test("Pako reads a new reply by himself only in a visible, loaded thread, once", () => {
  assert.equal(pakoReadDecision(ready), "read");
  assert.equal(pakoReadDecision({ ...ready, remaining: 6 }), "read");
  for (const waiting of [
    { latest: { id: "m3", from: "me" } as const },
    { latest: undefined },
    { loaded: false },
    { visible: false },
    { handledId: "m2" },
    { latest: { ...theirs, structured: true } },
  ])
    assert.equal(pakoReadDecision({ ...ready, ...waiting }), "idle");
});

test("without automatic reading or with few readings left, Pako waits for a tap", () => {
  assert.equal(pakoReadDecision({ ...ready, autoRead: false }), "paused");
  assert.equal(pakoReadDecision({ ...ready, remaining: 5 }), "paused");
  assert.equal(pakoReadDecision({ ...ready, remaining: 0 }), "asleep");
  assert.equal(pakoReadDecision({ ...ready, online: false }), "offline");
});

const at = (hoursAgo: number) =>
  new Date(
    Date.parse("2026-11-19T12:00:00.000Z") - hoursAgo * 3_600_000,
  ).toISOString();
const now = new Date("2026-11-19T12:00:00.000Z");
const mine = (hoursAgo: number): ThreadMessage => ({
  id: "m1",
  from: "me",
  text: "Is it still available?",
  at: at(hoursAgo),
});

test("a buyer hears when the item is gone, and either side can nudge after a day", () => {
  const notice = (changes: Partial<Parameters<typeof threadNotice>[0]>) =>
    threadNotice({
      role: "buyer",
      title: "White study desk",
      listingStatus: "active",
      dealStatus: undefined,
      agreedWith: undefined,
      messages: [mine(25)],
      now,
      canNudge: true,
      ...changes,
    });
  assert.deepEqual(notice({ listingStatus: "reserved" }), {
    kind: "gone",
    status: "reserved",
  });
  assert.deepEqual(notice({}), { kind: "no_answer", hoursWaiting: 25 });
  // An agreed deal reserved the item for this buyer: nothing is gone and nothing waits for an answer.
  for (const dealStatus of ["agreed", "completed"] as const)
    assert.equal(notice({ listingStatus: "reserved", dealStatus }), null);
  assert.deepEqual(notice({ listingStatus: "reserved", dealStatus: "open" }), {
    kind: "gone",
    status: "reserved",
  });
  assert.deepEqual(notice({ role: "seller", listingStatus: "sold" }), {
    kind: "no_answer",
    hoursWaiting: 25,
  });
  assert.equal(notice({ messages: [mine(23)] }), null);
  assert.equal(notice({ canNudge: false }), null);
  assert.equal(
    notice({ messages: [mine(30), { ...mine(25), id: "m2", from: "them" }] }),
    null,
  );
});

test("a seller who agreed with another buyer is reminded to tell this one, once", () => {
  const notice = (changes: Partial<Parameters<typeof threadNotice>[0]>) =>
    threadNotice({
      role: "seller",
      title: "White study desk",
      listingStatus: "reserved",
      dealStatus: "open",
      agreedWith: "Arjun",
      messages: [{ ...mine(2), from: "them" }],
      now,
      canNudge: true,
      ...changes,
    });
  assert.deepEqual(notice({}), { kind: "agreed_elsewhere", agreedWith: "Arjun" });
  const told = {
    ...mine(1),
    id: "m2",
    text: "Sorry, the White study desk is now reserved for someone else. I'll let you know if that changes.",
  };
  assert.equal(notice({ messages: [{ ...mine(30), from: "them" }, told] }), null);
  assert.equal(notice({ agreedWith: undefined }), null);
  assert.equal(notice({ role: "buyer" })?.kind, "gone");
});

test("Pako's words name the other student, and quote only what they said", () => {
  assert.equal(withName("{other} offers CHF 45.", "Léa"), "Léa offers CHF 45.");
  const turn = {
    facts: {
      amount: { value: 45, quote: "45 and it's yours", from: "them" },
      pickupTime: { value: "Thursday", quote: "Thursday", from: "me" },
      pickupPoint: {
        value: "Vortex",
        quote: "45 and it's yours",
        from: "them",
      },
    },
  } as unknown as ThreadTurn;
  assert.deepEqual(theirQuotes(turn), ["45 and it's yours"]);
});
