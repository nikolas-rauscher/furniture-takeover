import assert from "node:assert/strict";
import test from "node:test";
import { browserLanguage } from "./language.ts";

test("the first browser language the page speaks is preselected", () => {
  assert.equal(browserLanguage(["de-CH", "en"]), "de");
  assert.equal(browserLanguage(["it-CH", "fr-FR", "en"]), "fr");
  assert.equal(browserLanguage(["FR"]), "fr");
});

test("English is the default when the browser speaks none of them", () => {
  assert.equal(browserLanguage(["it-CH", "es"]), "en");
  assert.equal(browserLanguage([]), "en");
});
