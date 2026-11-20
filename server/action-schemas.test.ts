import test from "node:test";
import assert from "node:assert/strict";
import { questionSchema } from "./action-schemas.ts";

test("agent price controls validate bounds without imposing a valuation", () => {
  const input = { type: "price", min: 0, max: 100, step: 1, value: 20 };
  assert.deepEqual(
    questionSchema.parse({ question: "Choose an asking price", input }).input,
    input,
  );
  for (const invalid of [
    { ...input, value: 101 },
    { ...input, min: 100 },
    { ...input, step: 0 },
    { ...input, max: 10001 },
  ]) {
    assert.equal(
      questionSchema.safeParse({
        question: "Choose an asking price",
        input: invalid,
      }).success,
      false,
    );
  }
});
