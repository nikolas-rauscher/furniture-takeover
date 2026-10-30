import test from "node:test";
import assert from "node:assert/strict";
import { readRoute } from "./navigation.ts";

test("direct links preserve the selected workspace section on reload", () => {
  assert.equal(readRoute("#settings").view, "settings");
  assert.equal(readRoute("#listings").view, "account");
  assert.equal(readRoute("#listings/archive").accountTab, "archive");
  assert.equal(readRoute("#saved").accountTab, "favorites");
  assert.equal(readRoute("#searches").view, "searches");
});

test("listing and conversation links restore their item without crashing on bad links", () => {
  assert.equal(readRoute("#listing/desk%20one").listingId, "desk one");
  assert.equal(readRoute("#listing/desk").view, "detail");
  assert.equal(readRoute("#messages/desk").listingId, "desk");
  assert.equal(readRoute("#messages/desk").view, "messages");
  for (const hash of ["", "#unknown", "#listing", "#listing/%invalid"]) {
    assert.equal(readRoute(hash).view, "discover");
  }
});
