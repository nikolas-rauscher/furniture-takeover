import assert from "node:assert/strict";
import test from "node:test";
import { orderOptions, shuffleOptions, toggleOption } from "./optionOrder.ts";
import type { StudyOption } from "./tourScript.ts";

const options: StudyOption[] = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
  { id: "nothing", label: "Nothing", last: true, exclusive: true },
  { id: "else", label: "Something else", last: true, withText: true },
];
const ids = (list: StudyOption[]) => list.map((option) => option.id);

test("options marked last stay last and in order, whatever the draw", () => {
  for (const draw of [0, 0.3, 0.6, 0.99]) {
    const order = ids(shuffleOptions(options, () => draw));
    assert.deepEqual(order.slice(-2), ["nothing", "else"]);
    assert.deepEqual([...order.slice(0, 3)].sort(), ["a", "b", "c"]);
  }
});

test("a fixed draw gives a fixed order", () => {
  assert.deepEqual(ids(shuffleOptions(options, () => 0)), [
    "b",
    "c",
    "a",
    "nothing",
    "else",
  ]);
});

test("a stored order is shown again", () => {
  assert.deepEqual(
    ids(orderOptions(options, ["c", "a", "b", "nothing", "else"])),
    ["c", "a", "b", "nothing", "else"],
  );
  assert.throws(() => orderOptions(options, ["z"]), /No option z/);
});

test("an exclusive option clears the others and is cleared by them", () => {
  assert.deepEqual(toggleOption(options, ["a", "else"], "nothing"), [
    "nothing",
  ]);
  assert.deepEqual(toggleOption(options, ["nothing"], "b"), ["b"]);
  assert.deepEqual(toggleOption(options, ["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleOption(options, ["a", "b"], "a"), ["b"]);
});
