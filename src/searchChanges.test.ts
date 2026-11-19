import test from "node:test";
import assert from "node:assert/strict";
import { searchChangeSummary } from "./searchChanges.ts";

test("a free-only budget reads as what the student asked for", () => {
  assert.equal(
    searchChangeSummary({ maxPrice: 0 }),
    "I'm looking for free items only.",
  );
});

test("each changed preference gets its own sentence", () => {
  assert.equal(
    searchChangeSummary({ radius: 2, source: "takeover", maxPrice: 80 }),
    "I set your budget to CHF 80. I set the distance to 2 km. I'm searching Takeover only.",
  );
});

test("removed limits say so instead of printing placeholder values", () => {
  assert.equal(
    searchChangeSummary({ maxPrice: 1_000_000, pickupBy: "" }),
    "I removed the price limit. I removed the collection date.",
  );
});

test("dates, conditions and places read naturally", () => {
  assert.equal(
    searchChangeSummary({
      pickupBy: "2026-11-21",
      condition: "Very good",
      location: "UNIL, Chamberonne",
    }),
    "You can collect by 21 Nov. I'm looking for items in very good condition. I'm searching around UNIL, Chamberonne.",
  );
});
