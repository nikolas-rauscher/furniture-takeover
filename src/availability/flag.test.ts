import test from "node:test";
import assert from "node:assert/strict";
import { AVAILABILITY_FLAG_KEY, resolveAvailabilityFlag } from "./flag.ts";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(AVAILABILITY_FLAG_KEY, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("the URL turns the prototype on or off and the choice is remembered", () => {
  const cases: [
    string,
    string,
    string | undefined,
    boolean,
    boolean,
    string | undefined,
  ][] = [
    ["off by default", "", undefined, false, false, undefined],
    [
      "reserve turns it on",
      "?availability=reserve",
      undefined,
      true,
      false,
      "reserve",
    ],
    [
      "remembered without the parameter",
      "?q=desk",
      "reserve",
      true,
      false,
      "reserve",
    ],
    [
      "off clears the stored flag",
      "?availability=off",
      "reserve",
      false,
      true,
      undefined,
    ],
    [
      "another variant's value turns this one off",
      "?availability=badge",
      "reserve",
      false,
      true,
      undefined,
    ],
  ];
  for (const [name, search, stored, enabled, cleanup, after] of cases) {
    const storage = memoryStorage(stored);
    assert.deepEqual(
      resolveAvailabilityFlag(search, storage),
      { enabled, cleanup },
      name,
    );
    assert.equal(storage.values.get(AVAILABILITY_FLAG_KEY), after, name);
  }
});

test("blocked storage still honours the URL for this page load", () => {
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(resolveAvailabilityFlag("?availability=reserve", blocked), {
    enabled: true,
    cleanup: false,
  });
  assert.deepEqual(resolveAvailabilityFlag("", blocked), {
    enabled: false,
    cleanup: false,
  });
});
