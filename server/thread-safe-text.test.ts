import test from "node:test";
import assert from "node:assert/strict";
import { checkSafeText } from "./thread-safe-text.ts";

test("safe text passes, with the other student's placeholder", () => {
  assert.doesNotThrow(() =>
    checkSafeText("Thanks {other}, Thursday works.", "label"),
  );
});

test("links, email addresses and phone numbers are refused", () => {
  for (const text of [
    "See https://example.com",
    "Write to me@example.com",
    "Call +41 79 123 45 67",
  ])
    assert.throws(() => checkSafeText(text, "label"), /^Error: label: remove/);
});

test("payment methods, advance payment and other placeholders are refused", () => {
  assert.throws(() => checkSafeText("Pay by TWINT", "x"), /payment/);
  assert.throws(
    () => checkSafeText("Send the money before pickup", "x"),
    /payment/,
  );
  assert.throws(() => checkSafeText("Hi {name}", "x"), /placeholder/);
});
