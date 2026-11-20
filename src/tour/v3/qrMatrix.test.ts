import assert from "node:assert/strict";
import test from "node:test";
import { qrModules } from "./qrMatrix.ts";

const finderAt = (modules: boolean[][], row: number, column: number) =>
  [0, 1, 2, 3, 4, 5, 6].map((dy) =>
    [0, 1, 2, 3, 4, 5, 6]
      .map((dx) => (modules[row + dy][column + dx] ? "1" : "0"))
      .join(""),
  );

const FINDER = [
  "1111111",
  "1000001",
  "1011101",
  "1011101",
  "1011101",
  "1000001",
  "1111111",
];

test("a short link fits a small version with finders in three corners", () => {
  const modules = qrModules("https://takeover.example/tour?s=friend");
  const size = modules.length;
  assert.equal(size, 29, "version 3");
  assert.deepEqual(finderAt(modules, 0, 0), FINDER);
  assert.deepEqual(finderAt(modules, 0, size - 7), FINDER);
  assert.deepEqual(finderAt(modules, size - 7, 0), FINDER);
  assert.equal(modules[size - 8][8], true, "dark module");
});

test("the version grows with the link and stops at version 10", () => {
  assert.equal(qrModules("x".repeat(100)).length, 17 + 4 * 6);
  assert.throws(() => qrModules("x".repeat(400)), /too long/);
});

test("the same link always gives the same code", () => {
  const link = "https://takeover.example/tour?s=friend";
  assert.deepEqual(qrModules(link), qrModules(link));
});
