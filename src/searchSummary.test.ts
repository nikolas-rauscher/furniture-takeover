import test from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../shared/marketplace.ts";
import {
  activePreferences,
  compactPreferences,
  shortPlace,
} from "./searchSummary.ts";

test("the search pill names an area by its first part, without FMEL", () => {
  assert.equal(shortPlace("EPFL, Ecublens"), "EPFL");
  assert.equal(shortPlace("FMEL Vortex, Chavannes-près-Renens"), "Vortex");
});

test("the compact line names budget, distance and sources", () => {
  assert.equal(
    compactPreferences(defaults),
    "Any budget · 20 km · All sources",
  );
  assert.equal(
    compactPreferences({ ...defaults, maxPrice: 0, source: "takeover" }),
    "Free only · 20 km · takeover",
  );
});

test("the full line spells out every preference of the running search", () => {
  const search = {
    text: "desk",
    originalRequest: "desk",
    location: "EPFL",
    criteria: {
      ...defaults,
      maxPrice: 80,
      radius: 5,
      condition: "Good",
      source: "takeover",
    },
  };
  assert.equal(
    activePreferences(search),
    "Up to CHF 80 · 5 km of EPFL · Flexible pickup · Good condition · takeover only",
  );
});
