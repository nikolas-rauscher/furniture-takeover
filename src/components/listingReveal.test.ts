import assert from "node:assert/strict";
import test from "node:test";
import { revealTop } from "./listingReveal.ts";

/** The listing column on a phone while several items are listed: 514 px under the tray. */
const column = (scrollHeight: number) => ({ height: 514, scrollHeight });

test("a block below the view is brought up until its bottom shows", () => {
  assert.equal(revealTop({ top: 297, height: 284 }, column(702), 0), 79);
});

test("a block in view leaves the column where it is", () => {
  assert.equal(revealTop({ top: 265, height: 248 }, column(690), 40), 40);
});

test("a block above the view is brought down until its top shows", () => {
  assert.equal(revealTop({ top: 100, height: 200 }, column(1000), 300), 88);
});

test("a block taller than the column shows its top", () => {
  assert.equal(revealTop({ top: 265, height: 600 }, column(1000), 0), 253);
});

test("the position stays within the column's scroll range", () => {
  assert.equal(revealTop({ top: 6, height: 100 }, column(702), 0), 0);
  assert.equal(revealTop({ top: 600, height: 150 }, column(700), 0), 186);
});

test("once the listing settles, measuring from where the student left the column brings the draft back", () => {
  // Pako asked while his working line and the card's "Pako is writing…" still showed.
  const asked = revealTop({ top: 297, height: 284 }, column(702), 0);
  const settled = { top: 265, height: 248 };
  // Both lines have left: from where the column is now, nothing would move…
  assert.equal(revealTop(settled, column(690), asked), asked);
  // …from where the student left it, the settled listing needs only 11 px.
  assert.equal(revealTop(settled, column(690), 0), 11);
});
