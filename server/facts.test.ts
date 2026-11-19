import test from "node:test";
import assert from "node:assert/strict";
import { appPrices, bareAmount, explicitPrice } from "./facts.ts";

test("prices written with thousands separators keep their value", () => {
  assert.equal(explicitPrice("MacBook Pro. Asking CHF 1,250."), 1250);
  assert.equal(explicitPrice("Asking 1'250 CHF"), 1250);
  assert.equal(explicitPrice("Price: 12,50 CHF"), 12.5);
  assert.equal(explicitPrice("Asking CHF 1250"), 1250);
  assert.equal(bareAmount(" 1,250 "), 1250);
  assert.equal(bareAmount("40"), 40);
  assert.equal(bareAmount("about 40"), null);
});

test("listing text writes CHF amounts the way the app shows prices", () => {
  assert.equal(
    appPrices("Asking CHF 1250. Bought for 2400 CHF, so CHF 450 is firm."),
    "Asking CHF 1,250. Bought for 2,400 CHF, so CHF 450 is firm.",
  );
  assert.equal(appPrices("CHF 1,250 or CHF 1250.50"), "CHF 1,250 or CHF 1250.50");
  assert.equal(appPrices("A 2019 model, 1440 x 900"), "A 2019 model, 1440 x 900");
});
