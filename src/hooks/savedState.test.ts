import test from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../../shared/marketplace.ts";
import { products } from "../testing/fixtures.ts";
import {
  isConversations,
  isFavoriteIds,
  isProducts,
  isSearchJobs,
  restoreSavedValue,
} from "./savedState.ts";

test("invalid or truncated storage cannot replace a safe fallback", () => {
  const fallback = ["desk"];
  for (const serialized of ['{"broken":true}', "[null]", "[12]", "{", "null"]) {
    const restored = restoreSavedValue(serialized, fallback, isFavoriteIds);
    assert.equal(restored.value, fallback);
    assert.equal(restored.source, "invalid");
  }
  assert.equal(
    restoreSavedValue(null, fallback, isFavoriteIds).source,
    "empty",
  );
});

test("valid empty saved data remains empty rather than restoring demo defaults", () => {
  assert.deepEqual(restoreSavedValue("[]", ["desk"], isFavoriteIds), {
    value: [],
    source: "stored",
  });
});

test("old saved labels migrate before record validation", () => {
  const stored = [
    {
      id: "job",
      title: "My desk",
      criteria: { ...defaults, category: "Schreibtische", condition: "Gut" },
      paused: false,
      seen: true,
    },
  ];
  const result = restoreSavedValue(JSON.stringify(stored), [], isSearchJobs);
  assert.equal(result.source, "stored");
  assert.equal(result.value[0].criteria.category, "Desks");
  assert.equal(result.value[0].criteria.condition, "Good");
});

test("malformed nested search criteria and messages are rejected", () => {
  assert.equal(
    isSearchJobs([
      {
        id: "bad",
        title: "Bad",
        criteria: { ...defaults, maxPrice: "cheap" },
        paused: false,
        seen: false,
      },
    ]),
    false,
  );
  assert.equal(
    isConversations([
      {
        id: "bad",
        productId: "desk",
        name: "A",
        date: "",
        confirmed: false,
        messages: [null],
      },
    ]),
    false,
  );
  assert.equal(
    isConversations([
      {
        id: "ok",
        productId: "desk",
        name: "A",
        date: "",
        confirmed: false,
        messages: [{ text: "Hello", mine: true }],
      },
    ]),
    true,
  );
});

test("saved listings require usable finite numeric values and known statuses", () => {
  assert.equal(isProducts(products), true);
  for (const price of [NaN, Infinity, -1, "65", null]) {
    assert.equal(isProducts([{ ...products[0], price }]), false);
  }
  assert.equal(isProducts([{ ...products[0], status: "missing" }]), false);
  assert.equal(isProducts([{ ...products[0], title: {} }]), false);
});

test("agent-selected source preferences survive saved search reload without a fixed source enum", () => {
  const job = {
    id: "source",
    title: "Desk on eBay",
    criteria: { ...defaults, source: "eBay" },
    paused: false,
    seen: true,
  };
  assert.equal(
    restoreSavedValue(JSON.stringify([job]), [], isSearchJobs).value[0]
      ?.criteria.source,
    "eBay",
  );
  for (const source of ["", " ".repeat(3), "x".repeat(121), 4, null]) {
    assert.equal(
      isSearchJobs([{ ...job, criteria: { ...job.criteria, source } }]),
      false,
    );
  }
});
