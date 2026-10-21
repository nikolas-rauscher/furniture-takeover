import test from "node:test";
import assert from "node:assert/strict";
import {
  discardNegotiation,
  markNegotiationSent,
  newNegotiation,
  prepareNegotiation,
  reviseNegotiation,
  negotiationSchema,
} from "../shared/negotiation.ts";
import {
  applyNegotiationUpdate,
  reconcileDeliveredDrafts,
  createNegotiationRepository,
} from "./negotiationRepository.ts";

test("separate answers, corrections and draft invalidation preserve the latest buyer terms", () => {
  let value = newNegotiation("a", "desk");
  value = reviseNegotiation(value, { amount: 70 }, 1);
  value = reviseNegotiation(
    value,
    { fulfillment: "pickup", pickupTime: "Tuesday 18:00" },
    2,
  );
  value = reviseNegotiation(
    value,
    { pickupTime: "Saturday 15:00", pickupPoint: "EPFL library entrance" },
    3,
  );
  value = prepareNegotiation(value, "Desk", 4);
  assert.match(value.draft!.message, /CHF 70/);
  assert.match(value.draft!.message, /Saturday 15:00/);
  assert.doesNotMatch(value.draft!.message, /Tuesday/);
  assert.match(
    value.draft!.message,
    /Could we meet at EPFL library entrance\?/,
  );
  value = reviseNegotiation(value, { amount: 75 }, 5);
  assert.equal(value.draft, undefined);
  assert.equal(value.terms.pickupTime, "Saturday 15:00");
  assert.throws(() => prepareNegotiation(value, "Desk", 5));
});
test("unknown seller facts stay questions and shipping clears pickup proposals", () => {
  let value = reviseNegotiation(
    newNegotiation("a", "desk"),
    { amount: 0, fulfillment: "pickup" },
    1,
  );
  value = prepareNegotiation(value, "Desk", 2);
  assert.match(value.draft!.message, /CHF 0/);
  assert.match(value.draft!.message, /Where would you like to meet/);
  value = reviseNegotiation(
    value,
    { fulfillment: "shipping", pickupTime: "Saturday", pickupPoint: "EPFL" },
    3,
  );
  assert.equal(value.terms.pickupTime, null);
  assert.equal(value.terms.pickupPoint, null);
  value = prepareNegotiation(value, "Desk", 4);
  assert.match(value.draft!.message, /total including shipping/);
  assert.doesNotMatch(value.draft!.message, /EPFL|Saturday/);
});
test("storage restores proposals and rejects stale, cross-item, discarded and forged states", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const repo = createNegotiationRepository(storage, "proposals");
  let value = newNegotiation("a", "desk");
  repo.save(value, 0);
  const next = reviseNegotiation(value, { amount: 70 }, 1);
  repo.save(next, 1);
  const restored = createNegotiationRepository(storage, "proposals");
  assert.equal(restored.list()[0].terms.amount, 70);
  assert.throws(() =>
    repo.save(reviseNegotiation(value, { amount: 80 }, 1), 1),
  );
  assert.throws(() => repo.save({ ...next, listingId: "bike", version: 3 }, 2));
  applyNegotiationUpdate(repo, {
    type: "negotiation_update",
    previousVersion: 1,
    negotiation: next,
  });
  const discarded = discardNegotiation(next, 2);
  repo.save(discarded, 2);
  assert.throws(() => reviseNegotiation(discarded, { amount: 90 }, 3));
  assert.equal(newNegotiation("b", "bike").terms.amount, null);
  assert.equal(
    negotiationSchema.safeParse({ ...next, status: "confirmed" }).success,
    false,
  );
  assert.equal(
    negotiationSchema.safeParse({
      ...next,
      draft: { version: 1, message: "old" },
    }).success,
    false,
  );
});
test("storage failure does not claim a committed proposal", () => {
  const repo = createNegotiationRepository(
    {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    },
    "a",
  );
  assert.throws(() => repo.save(newNegotiation("a", "desk"), 0), /quota/);
});

test("continuing an unchanged proposal preserves the manually reviewed message", () => {
  const value = prepareNegotiation(
    newNegotiation("a", "desk"),
    "Desk",
    1,
    "Hello! I would like to discuss collection.",
  );
  assert.equal(
    prepareNegotiation(value, "Desk", 2).draft?.message,
    value.draft?.message,
  );
  const changed = reviseNegotiation(value, { amount: 30 }, 2);
  assert.match(prepareNegotiation(changed, "Desk", 3).draft!.message, /CHF 30/);
});


test("successful delivery closes a proposal durably and a stale agent cannot reopen it", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const repo = createNegotiationRepository(storage, "proposals");
  const initial = newNegotiation("sent-offer", "chair");
  repo.save(initial, 0);
  const draft = prepareNegotiation(initial, "Chair", 1);
  repo.save(draft, 1);
  assert.equal(repo.list()[0].status, "draft");
  const sent = markNegotiationSent(draft, draft.version);
  repo.save(sent, draft.version);
  const restored = createNegotiationRepository(storage, "proposals").list();
  assert.equal(restored.filter((item) => item.status === "draft").length, 0);
  assert.equal(restored[0].draft?.message, draft.draft?.message);
  assert.throws(() => repo.save({ ...sent, status: "draft", version: sent.version + 1, draft: undefined }, sent.version));
});

test("legacy repair requires matching buyer delivery and preserves edited or unsent drafts", () => {
  const data = new Map<string, string>();
  const repo = createNegotiationRepository({ getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } }, "proposals");
  for (const id of ["delivered", "seller-only", "unsent", "edited"]) {
    const initial = newNegotiation(id, id);
    repo.save(initial, 0);
    repo.save(prepareNegotiation(initial, "Chair", 1, "Hello seller"), 1);
  }
  const snapshot = repo.list();
  const edited = snapshot.find((item) => item.id === "edited")!;
  repo.save(prepareNegotiation(edited, "Chair", 2, "Different message"), 2);
  reconcileDeliveredDrafts(repo, snapshot, ["delivered", "seller-only", "edited"].map((id) => ({ id, listingId: id, title: "Chair", seller: "Seller", messages: [{ id: "msg-1", sender: id === "seller-only" ? "seller" as const : "buyer" as const, text: "Hello seller", createdAt: "2026-10-13T12:00:00Z" }] })));
  assert.equal(repo.list().find((item) => item.id === "delivered")?.status, "sent");
  assert.deepEqual(repo.list().filter((item) => item.status === "draft").map((item) => item.id).sort(), ["edited", "seller-only", "unsent"]);
});
