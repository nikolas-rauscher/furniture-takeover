import test from "node:test";
import assert from "node:assert/strict";
import { randomUuid } from "./randomUuid.ts";

const VERSION_4_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("ids are version 4 UUIDs, as the message server requires", () => {
  for (let count = 0; count < 1000; count++)
    assert.match(randomUuid(), VERSION_4_UUID);
});

test("ids do not repeat", () => {
  const ids = Array.from({ length: 10_000 }, () => randomUuid());
  assert.equal(new Set(ids).size, ids.length);
});

test("ids need no crypto.randomUUID, which plain http origins lack", (t) => {
  t.mock.method(crypto, "randomUUID", () => {
    throw new TypeError("crypto.randomUUID is not a function");
  });
  assert.match(randomUuid(), VERSION_4_UUID);
});
