import assert from "node:assert/strict";
import test from "node:test";
import { plainPrice, priceText } from "./priceText.ts";

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
