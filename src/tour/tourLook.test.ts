import assert from "node:assert/strict";
import test from "node:test";
import { lookInAddress } from "./tourLook.ts";

test("the pitch shows the app's own screens unless the address asks for the drawn ones", () => {
  assert.equal(lookInAddress(""), "app");
  assert.equal(lookInAddress("?look=app"), "app");
  assert.equal(lookInAddress("?look=illustrated"), "illustrated");
});

test("an unknown look is an error, not the default", () => {
  assert.throws(() => lookInAddress("?look=sketch"), /Unknown tour look/);
});
