import assert from "node:assert/strict";
import test from "node:test";
import { resumeFromTab } from "./tabStorage.ts";

const KEY = "takeover-study-v3";

/** A tab whose session storage holds `kept` under the survey's key. */
function tabHolding(kept: unknown) {
  const items = new Map([[KEY, JSON.stringify(kept)]]);
  const sessionStorage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
  Object.assign(globalThis, { window: { sessionStorage } });
}

const kept = {
  progress: { source: "friends", version: "v3-3", stepId: "desk" },
  unsaved: ["desk"],
};

test("a reload continues the session from the same link in the same wording version", () => {
  tabHolding(kept);
  assert.deepEqual(resumeFromTab(KEY, "friends", "v3-3"), {
    stored: kept,
    updated: false,
  });
});

test("a reload after a new wording version starts again and says so", () => {
  tabHolding(kept);
  assert.deepEqual(resumeFromTab(KEY, "friends", "v3-4"), {
    stored: null,
    updated: true,
  });
  tabHolding({ ...kept, progress: { source: "friends", stepId: "desk" } });
  assert.deepEqual(resumeFromTab(KEY, "friends", "v3-3"), {
    stored: null,
    updated: true,
  });
});

test("a link from another channel or an empty tab starts a session of its own", () => {
  tabHolding(kept);
  assert.deepEqual(resumeFromTab(KEY, "poster-rlc", "v3-3"), {
    stored: null,
    updated: false,
  });
  assert.deepEqual(resumeFromTab("takeover-study", "friends", "v3-3"), {
    stored: null,
    updated: false,
  });
});
