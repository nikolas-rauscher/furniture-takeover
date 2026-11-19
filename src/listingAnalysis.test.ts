import test from "node:test";
import assert from "node:assert/strict";
import { analysisKey, analysisPlan } from "./listingAnalysis.ts";

const desk = "data:image/jpeg;base64,desk-photo-bytes";
const lamp = "data:image/jpeg;base64,lamp-photo-bytes";

test("an analysis belongs to its photos in order, the trimmed note and the place", () => {
  const key = analysisKey({
    photos: [desk, lamp],
    note: "ikea ",
    location: "EPFL",
  });
  assert.equal(
    analysisKey({ photos: [desk, lamp], note: " ikea", location: "EPFL" }),
    key,
  );
  assert.notEqual(
    analysisKey({ photos: [lamp, desk], note: "ikea", location: "EPFL" }),
    key,
    "the first photo becomes the cover",
  );
  assert.notEqual(
    analysisKey({ photos: [desk, lamp], note: "ikea", location: "UNIL" }),
    key,
  );
});

test("starting a draft reuses a finished analysis, waits for one under way, or asks for one", () => {
  assert.equal(
    analysisPlan({ readyKey: "a", inFlightKey: "b", currentKey: "a" }),
    "reuse",
  );
  assert.equal(
    analysisPlan({ readyKey: "a", inFlightKey: "b", currentKey: "b" }),
    "await",
  );
  assert.equal(analysisPlan({ readyKey: "a", currentKey: "c" }), "fetch");
  assert.equal(analysisPlan({ currentKey: "c" }), "fetch");
});
