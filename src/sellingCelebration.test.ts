import test from "node:test";
import assert from "node:assert/strict";
import { batchStepNote, celebrationFor } from "./sellingCelebration.ts";

test("one listing is celebrated as before, several with their count", () => {
  assert.deepEqual(celebrationFor(1, true), {
    title: "It's live!",
    text: "Students nearby can see your listing now.",
  });
  assert.equal(celebrationFor(1, false).title, "Saved!");
  assert.equal(celebrationFor(3, true).title, "3 listings are live!");
  assert.equal(celebrationFor(2, false).title, "2 listings saved!");
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
