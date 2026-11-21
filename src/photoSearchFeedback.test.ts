import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  photoSearchClarification,
  photoSearchFailure,
} from "./photoSearchFeedback.ts";

test("an unrecognised photo asks for an item without treating it as a failure", () => {
  const notice = photoSearchClarification();
  assert.equal(notice.kind, "clarification");
  assert.equal(notice.mood, "think");
  assert.match(notice.line, /search box.*clearer photo/);
  assert.doesNotMatch(notice.line, /furniture|error|failed/i);
});

test("technical failures retain their actionable error and have a fallback", () => {
  assert.deepEqual(
    photoSearchFailure(new Error("Check your connection and retry.")),
    {
      kind: "error",
      mood: "dizzy",
      line: "Check your connection and retry.",
    },
  );
  assert.match(photoSearchFailure(null).line, /another photo or describe/);
});

test("new searches clear notices and cancel pending photo recognition", () => {
  const session = readFileSync(
    new URL("./hooks/useSearchSession.ts", import.meta.url),
    "utf8",
  );
  const search = session.slice(
    session.indexOf("async function runSearch("),
    session.indexOf("async function searchByPhoto("),
  );
  assert.match(search, /photoRequest\.current\?\.abort\(\)/);
  assert.match(search, /setPhotoNotice\(null\)/);
  const photo = session.slice(
    session.indexOf("async function searchByPhoto("),
    session.indexOf("function continueOffer("),
  );
  assert.match(photo, /setPhotoNotice\(null\)/);
  assert.match(
    photo,
    /if \(controller.signal.aborted\) return;\s+if \(!item\)/,
  );
});
