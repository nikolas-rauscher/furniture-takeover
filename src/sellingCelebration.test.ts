import test from "node:test";
import assert from "node:assert/strict";
import { batchStepNote, celebrationFor } from "./sellingCelebration.ts";

test("a published listing is for students nearby, a saved one stays on this device", () => {
  assert.deepEqual(celebrationFor(1, true), {
    title: "Listing published",
    text: "Students nearby can see your listing now.",
  });
  assert.deepEqual(celebrationFor(1, false), {
    title: "Saved on this device",
    text: "Other students can't see it.",
  });
  assert.equal(celebrationFor(3, true).title, "3 listings published");
  assert.equal(
    celebrationFor(2, false).title,
    "2 listings saved on this device",
  );
});

test("between two listings Pako names the one just finished and the next", () => {
  const note = (outcome: "saved" | "skipped", title: string, cloud = false) =>
    batchStepNote({ outcome, title, next: 2, total: 3, cloud });
  assert.equal(
    note("saved", "Ladder-back chair"),
    "Saved “Ladder-back chair”. Next up: listing 2 of 3.",
  );
  assert.equal(
    note("saved", "Ladder-back chair", true),
    "Published “Ladder-back chair”. Next up: listing 2 of 3.",
  );
  assert.equal(
    note("skipped", "  "),
    "Skipped this one. Next up: listing 2 of 3.",
  );
});
