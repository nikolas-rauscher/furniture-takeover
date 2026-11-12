import assert from "node:assert/strict";
import test from "node:test";
import { transportGuidance } from "./transportGuidance.ts";

test("furniture with measurements that fit in a typical estate-car load area gets a cautious estimate", () => {
  assert.deepEqual(transportGuidance("White desk", "120 × 60 × 75 cm"), {
    label: "Transport estimate",
    message: "An estate car may be enough.",
    note: "Check your vehicle's usable cargo space and loading opening; this is only an estimate.",
  });
});

test("furniture that exceeds the estimated cargo envelope recommends a van", () => {
  assert.equal(
    transportGuidance("Wardrobe", "220 × 100 × 80 cm")?.message,
    "A van is likely needed.",
  );
});

test("dimensions with mixed orientation and metric units are handled", () => {
  assert.equal(
    transportGuidance("Bureau", "1.8 m × 80 cm × 750 mm")?.message,
    "An estate car may be enough.",
  );
});

test("missing or ambiguous measurements request confirmation instead of guessing", () => {
  assert.equal(
    transportGuidance("Desk", "Ask the seller")?.message,
    "Confirm the width × depth × height in cm with the seller.",
  );
  assert.equal(
    transportGuidance("Desk", "120 × 60 × 75")?.message,
    "Confirm the width × depth × height in cm with the seller.",
  );
});

test("non-furniture items do not receive a furniture transport estimate", () => {
  assert.equal(transportGuidance("City bicycle", "180 × 80 × 50 cm"), null);
});
