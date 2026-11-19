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
  assert.match(notice.description, /search box.*clearer photo/);
  assert.doesNotMatch(
    notice.title + notice.description,
    /furniture|error|failed/i,
  );
});

test("technical failures retain their actionable error and have a fallback", () => {
  assert.deepEqual(
    photoSearchFailure(new Error("Check your connection and retry.")),
    {
      kind: "error",
      title: "Photo search couldn't finish",
      description: "Check your connection and retry.",
    },
  );
  assert.match(photoSearchFailure(null).description, /again.*search box/);
});

test("new searches clear notices and cancel pending photo recognition", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const search = app.slice(
    app.indexOf("async function runSearch("),
    app.indexOf("async function searchByPhoto("),
  );
  assert.match(search, /photoSearchRequest\.current\?\.abort\(\)/);
  assert.match(search, /setPhotoSearchNotice\(null\)/);
  const photo = app.slice(
    app.indexOf("async function searchByPhoto("),
    app.indexOf("function continueOffer("),
  );
  assert.match(photo, /setPhotoSearchNotice\(null\)/);
  assert.match(
    photo,
    /if \(controller.signal.aborted\) return;\s+if \(!item\)/,
  );
});
