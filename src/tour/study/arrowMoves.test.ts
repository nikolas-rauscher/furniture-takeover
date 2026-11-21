import assert from "node:assert/strict";
import test from "node:test";
import { arrowTracker, movesOn } from "./arrowMoves.ts";

test("a change after an arrow key is a move; a tap, Space or Enter is a pick", () => {
  const tracker = arrowTracker();
  tracker.keyDown("ArrowDown");
  assert.equal(tracker.takeMoved(), true);
  assert.equal(tracker.takeMoved(), false, "read once");
  tracker.keyDown(" ");
  assert.equal(tracker.takeMoved(), false);
  tracker.keyDown("Enter");
  assert.equal(tracker.takeMoved(), false);
  // A click has no key before it.
  assert.equal(tracker.takeMoved(), false);
});

test("only a pick moves on: a first pick, or confirming what the arrows selected", () => {
  assert.equal(
    movesOn({ added: true, moved: true, confirmsArrowSelection: false }),
    false,
  );
  assert.equal(
    movesOn({ added: true, moved: false, confirmsArrowSelection: false }),
    true,
  );
  assert.equal(
    movesOn({ added: false, moved: false, confirmsArrowSelection: true }),
    true,
  );
  assert.equal(
    movesOn({ added: false, moved: false, confirmsArrowSelection: false }),
    false,
    "changing an earlier answer still needs Continue",
  );
});
