import assert from "node:assert/strict";
import test from "node:test";
import { draftResult } from "./draftCheck.ts";

test("a draft sent as written keeps Friday", () => {
  assert.equal(
    draftResult("I could pick it up on Friday at 17:30 at FMEL Atrium."),
    "friday-kept",
  );
});

test("short and French forms of Friday count as kept", () => {
  assert.equal(draftResult("Pickup fri 17:30?"), "friday-kept");
  assert.equal(draftResult("Je passe vendredi."), "friday-kept");
});

test("a corrected day counts as fixed", () => {
  assert.equal(
    draftResult("I could pick it up on Saturday at 17:30."),
    "friday-fixed",
  );
  assert.equal(draftResult(""), "friday-fixed");
});

test("words that only contain the letters do not count", () => {
  assert.equal(draftResult("Is the desk fried?"), "friday-fixed");
});

test("nothing sent is its own result", () => {
  assert.equal(draftResult(null), "not-sent");
});
