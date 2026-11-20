import test from "node:test";
import assert from "node:assert/strict";
import { checkSafeText, withoutContactDetails } from "./thread-safe-text.ts";

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

test("contact details are removed from a message before it reaches the model", () => {
  assert.equal(
    withoutContactDetails(
      "Text me on 079 123 45 67 or +41 79 123 45 67, or mail lea@epfl.ch.",
    ),
    "Text me on [contact removed] or [contact removed], or mail [contact removed].",
  );
  const terms =
    "CHF 30, Fri 20 Nov, 18:00 at Atrium, on 2026-11-20 or 20.11.2026";
  assert.equal(withoutContactDetails(terms), terms);
});
