import test from "node:test";
import assert from "node:assert/strict";
import {
  dealTermsSchema,
  messageStatesTerms,
  missingTerms,
  type DealTerms,
} from "./deal.ts";

const none: DealTerms = {
  amount: null,
  fulfillment: null,
  pickupAt: null,
  pickupTime: null,
  pickupPoint: null,
};
const pickup: DealTerms = {
  amount: 40,
  fulfillment: "pickup",
  pickupAt: "2026-11-20T17:00:00.000Z",
  pickupTime: "Fri 20 Nov, 18:00",
  pickupPoint: "FMEL Vortex · outside reception",
};

test("a message states an amount as CHF and its digits, with Swiss thousands separators", () => {
  const thousand = { ...none, amount: 1200 };
  for (const body of ["CHF 1,200?", "CHF 1'200", "chf1200", "CHF 1 200"])
    assert.deepEqual(messageStatesTerms(body, thousand), { ok: true }, body);
  assert.deepEqual(
    messageStatesTerms("Would you take CHF 400?", {
      ...none,
      amount: 40,
    }),
    { ok: false, missing: ["amount"] },
  );
  assert.deepEqual(
    messageStatesTerms("Would you take 40?", {
      ...none,
      amount: 40,
    }),
    { ok: false, missing: ["amount"] },
  );
  assert.deepEqual(
    messageStatesTerms("Would you take CHF 40?", { ...none, amount: 40 }),
    { ok: true },
  );
});

test("a free item is stated as CHF 0 or in words", () => {
  const free = { ...none, amount: 0 };
  for (const body of ["It's free!", "C'est gratuit.", "Kostenlos", "CHF 0"])
    assert.deepEqual(messageStatesTerms(body, free), { ok: true }, body);
  assert.deepEqual(messageStatesTerms("CHF 05", free), {
    ok: false,
    missing: ["amount"],
  });
});

test("a pickup is stated by its Zurich clock time, or by its words without one", () => {
  assert.deepEqual(
    messageStatesTerms(
      "Deal! CHF 40, Fri 20 Nov, 18:00 at fmel vortex · outside reception.",
      pickup,
    ),
    { ok: true },
  );
  assert.deepEqual(
    messageStatesTerms("Deal! CHF 40 on Friday at the Vortex.", pickup),
    { ok: false, missing: ["time", "point"] },
  );
  assert.deepEqual(
    messageStatesTerms("See you tomorrow evening", {
      ...none,
      pickupTime: "Tomorrow evening",
    }),
    { ok: true },
  );
});

test("terms are complete with a price and either shipping or a concrete pickup", () => {
  assert.deepEqual(missingTerms(pickup), []);
  assert.deepEqual(
    missingTerms({ ...none, amount: 30, fulfillment: "shipping" }),
    [],
  );
  assert.deepEqual(missingTerms({ ...pickup, pickupAt: null }), ["pickupTime"]);
  assert.deepEqual(missingTerms(none), [
    "amount",
    "fulfillment",
    "pickupTime",
    "pickupPoint",
  ]);
});

test("a pickup instant always comes with the words both students read", () => {
  assert.equal(
    dealTermsSchema.safeParse({ ...pickup, pickupTime: null }).success,
    false,
  );
  assert.equal(
    dealTermsSchema.safeParse({ ...pickup, amount: 40.5 }).success,
    false,
  );
});
