import assert from "node:assert/strict";
import test from "node:test";
import { plainPrice, priceDropWords, priceText } from "./priceText.ts";
import type { SavedListing } from "../shared/marketplace.ts";

test("prices read the way students write them and show as the app writes them", () => {
  assert.equal(priceText(1250), "1,250");
  assert.equal(priceText(45), "45");
  assert.equal(plainPrice(" 1,250 "), "1250");
  assert.equal(plainPrice("1'250"), "1250");
  assert.equal(plainPrice("10,000"), "10000");
  assert.equal(plainPrice("12,50"), "12.50");
  assert.equal(plainPrice("1250.5"), "1250.5");
  assert.equal(Number(plainPrice(priceText(1250))), 1250);
});

test("a saved item names its price drop only when the saved price is known", () => {
  const saved = (price: number, priceAtSave: number | null) =>
    ({
      price,
      priceAtSave,
      priceDropped: priceAtSave !== null && price < priceAtSave,
    }) as SavedListing;
  assert.equal(
    priceDropWords(saved(30, 40)),
    "CHF 10 less than when you saved it",
  );
  assert.equal(priceDropWords(saved(0, 40)), "Now free, down from CHF 40");
  assert.equal(priceDropWords(saved(30, null)), null);
  assert.equal(priceDropWords(saved(45, 40)), null);
});
