import assert from "node:assert/strict";
import test from "node:test";
import { numberPick } from "./numberKey.ts";

const press = (
  key: string,
  extra: Partial<Parameters<typeof numberPick>[0]> = {},
) => ({
  key,
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  target: null,
  ...extra,
});

test("a number key picks the option with that number", () => {
  assert.equal(numberPick(press("1"), 3), 1);
  assert.equal(numberPick(press("3"), 3), 3);
  assert.equal(numberPick(press("4"), 3), null, "past the last option");
  assert.equal(numberPick(press("0"), 3), null);
  assert.equal(numberPick(press("a"), 3), null);
});

test("a held key's repeats and modified keys pick nothing", () => {
  assert.equal(numberPick(press("1", { repeat: true }), 3), null);
  assert.equal(numberPick(press("1", { ctrlKey: true }), 3), null);
  assert.equal(numberPick(press("1", { altKey: true }), 3), null);
  assert.equal(numberPick(press("1", { metaKey: true }), 3), null);
});

test("a number typed into a field picks nothing", () => {
  const field = {
    closest: (selector: string) => (selector.includes("textarea") ? {} : null),
  };
  assert.equal(
    numberPick(press("1", { target: field as unknown as EventTarget }), 3),
    null,
  );
});
