import assert from "node:assert/strict";
import test from "node:test";
import { defaults, type Product } from "../shared/marketplace.ts";
import {
  agentSearchRequest,
  isSavedSearches,
  isSearchArea,
  listingReviewSearch,
  newSearch,
  preferenceSearch,
  restoreSearch,
  type SavedSearch,
} from "./searchRequest.ts";

test("editing preferences preserves an item query across repeated search/save/rerun cycles", () => {
  const initial = newSearch("A desk under CHF 80", defaults, "Lausanne");
  const preferences = {
    ...initial.criteria,
    radius: 5,
    maxPrice: 0,
    pickup: "",
    condition: "Used",
    source: "takeover" as const,
  };
  const edited = preferenceSearch(preferences, "Lausanne", initial);
  const job: SavedSearch = {
    id: "saved",
    title: "A free desk",
    criteria: edited.criteria,
    location: edited.location,
    request: edited.text,
    search: edited,
    paused: false,
    seen: true,
  };
  const restored = restoreSearch(JSON.parse(JSON.stringify(job)), "Bern");
  assert.equal(restored.criteria.query, "desk");
  assert.deepEqual(restored.criteria, preferences);
  assert.deepEqual(
    preferenceSearch(restored.criteria, restored.location, restored).criteria,
    preferences,
  );
  const payload = agentSearchRequest(restored, []);
  assert.equal(payload.context?.maxPrice, 0);
  assert.equal(payload.context?.radius, 5);
  assert.equal(payload.context?.pickupBy, "");
  assert.equal(payload.context?.source, "takeover");
  assert.equal(payload.context?.condition, "Used");
});

test("cleared form query does not restore the previous item or a fixed category", () => {
  const initial = newSearch("A desk", defaults, "Lausanne");
  const edited = preferenceSearch(
    { ...initial.criteria, query: "" },
    "Lausanne",
    initial,
  );
  assert.equal(edited.criteria.query, "");
  assert.equal(edited.criteria.category, "All");
});

test("area chosen before typing is sent to the real agent and validated for persistence", () => {
  const area = { location: "Zürich", radius: 7.5 };
  const search = newSearch(
    "A white desk",
    { ...defaults, radius: area.radius },
    area.location,
  );
  const payload = agentSearchRequest(search, []);
  assert.equal(payload.context?.location, "Zürich");
  assert.equal(payload.context?.radius, 7.5);
  assert.equal(isSearchArea(JSON.parse(JSON.stringify(area))), true);
  assert.equal(isSearchArea({ location: " ", radius: 7 }), false);
  assert.equal(isSearchArea({ location: "Zürich", radius: NaN }), false);
  assert.equal(isSearchArea({ location: "Zürich", radius: 501 }), false);
  assert.equal(isSearchArea({ location: "Zürich", radius: 0 }), true);
});

test("saved follow-up keeps the full original intent and answer context", () => {
  const originalText =
    "Find a white desk under CHF 80. " + "Fits a small room. ".repeat(40);
  const original = newSearch(originalText, defaults, "Lausanne");
  const followUp = newSearch(
    "Can you compare these?",
    original.criteria,
    original.location,
    original,
    "These are the previous results.",
  );
  const job: SavedSearch = {
    id: "follow-up",
    title: "Compare desks",
    criteria: followUp.criteria,
    search: followUp,
    paused: false,
    seen: true,
  };
  const restored = restoreSearch(JSON.parse(JSON.stringify(job)), "Bern");
  const payload = agentSearchRequest(restored, []);
  assert.equal(payload.text, "Can you compare these?");
  assert.equal(payload.context?.originalRequest, originalText.trim());
  assert.equal(
    payload.context?.previousAnswer,
    "These are the previous results.",
  );
  assert.equal(payload.context?.location, "Lausanne");
  assert.equal(restored.criteria.query, original.criteria.query);
  assert.equal(isSavedSearches([job]), true);
  assert.equal(
    isSavedSearches([{ ...job, search: { text: "broken" } }]),
    false,
  );
});

test("legacy saved searches rerun their stored criteria without reparsing prose", () => {
  const criteria = { ...defaults, query: "desk", maxPrice: 80, radius: 5 };
  const legacy: SavedSearch = {
    id: "legacy",
    title: "Desk",
    criteria,
    location: "Lausanne",
    request: "desk, budget up to CHF 80, within 5 km of Lausanne",
    paused: false,
    seen: true,
  };
  assert.deepEqual(restoreSearch(legacy, "Bern").criteria, criteria);
  assert.equal(isSavedSearches([legacy]), true);
});

test("explicit source changes leave a previous own-only restriction", () => {
  const own = newSearch("A white desk, only my listings", defaults, "Lausanne");
  assert.equal(own.criteria.source, "takeover");
  assert.equal(own.criteria.query, "white desk");
  const web = newSearch("Search the web too", own.criteria, "Lausanne", own);
  assert.equal(web.criteria.source, "All");
  const ricardo = newSearch("Search Ricardo", own.criteria, "Lausanne", own);
  assert.equal(ricardo.criteria.source, "Ricardo");
  assert.equal(
    newSearch("Don't search the web", defaults, "Lausanne").criteria.source,
    "takeover",
  );
});

test("agent inventory includes active Takeover listings from every owner, without photos and bounded fields", () => {
  const active = {
    id: "own",
    title: "Desk",
    price: 0,
    description: "a".repeat(2000),
    location: "Lausanne",
    own: true,
    status: "active",
    image: "private-photo",
    source: "takeover",
  } as Product;
  const payload = agentSearchRequest(newSearch("desk", defaults, "Lausanne"), [
    active,
    { ...active, id: "removed", status: "withdrawn" },
    { ...active, id: "other", own: false },
    { ...active, id: "external", own: false, source: "Ricardo" },
    { ...active, id: "sold", status: "sold" },
  ]);
  assert.deepEqual(
    payload.inventory?.map((item) => item.id),
    ["own", "other"],
  );
  assert.equal(payload.inventory?.[0].description.length, 1500);
  assert.equal("image" in payload.inventory![0], false);
});

test("listing review bounds a long description and uses review mode without search preferences", () => {
  const item = {
    title: "Desk",
    price: 0,
    condition: "Good",
    dimensions: "100 × 50 cm",
    location: "Lausanne",
    available: "Flexible pickup",
    description: 'A desk with "quotes" and \\slashes.\n'.repeat(180),
  } as Product;
  const review = listingReviewSearch(item);
  const payload = agentSearchRequest(review, []);
  assert.ok(payload.text.length <= 4000);
  assert.ok(payload.text.includes("Price (CHF): 0"));
  assert.ok(payload.text.includes("Dimensions: 100 × 50 cm"));
  assert.ok(payload.text.endsWith("[Description shortened for review.]"));
  assert.equal(payload.context?.intent, "listing_review");
  assert.equal(payload.context?.maxPrice, undefined);
  assert.equal(payload.context?.source, undefined);
  const followUp = newSearch(
    "Can you improve the title?",
    review.criteria,
    review.location,
    review,
    "Add measurements.",
  );
  assert.equal(
    agentSearchRequest(followUp, []).context?.intent,
    "listing_review",
  );
  assert.equal(followUp.originalRequest, review.text);
});

test("short listing reviews preserve every supplied description character", () => {
  const item = {
    title: "Desk",
    price: 40,
    condition: "Used",
    dimensions: "Not specified",
    location: "Lausanne",
    available: "Flexible pickup",
    description: "White desk. Small mark on the left.",
  } as Product;
  assert.ok(listingReviewSearch(item).text.endsWith(item.description));
});

test("search requests include database demo listings without disguising them as live offers", () => {
  const item = {
    id: "demo-bike",
    title: "City bicycle",
    price: 145,
    description: "Sample offer",
    location: "Ecublens",
    own: true,
    demo: true,
    status: "active",
    image: "photo",
    source: "takeover",
  } as Product;
  const payload = agentSearchRequest(
    newSearch("bicycle", defaults, "Ecublens"),
    [item],
  );
  assert.equal(payload.inventory?.[0].id, "demo-bike");
  assert.equal(payload.inventory?.[0].demo, true);
});

test("a default budget remains unspecified until the user supplies one", () => {
  assert.equal(
    agentSearchRequest(newSearch("coffee machine", defaults, "Lausanne"), [])
      .context?.budgetSpecified,
    false,
  );
  assert.equal(
    agentSearchRequest(
      newSearch("coffee machine under CHF 100", defaults, "Lausanne"),
      [],
    ).context?.budgetSpecified,
    true,
  );
  assert.equal(
    agentSearchRequest(
      newSearch("desk", { ...defaults, maxPrice: 80 }, "Lausanne"),
      [],
    ).context?.budgetSpecified,
    true,
  );
});
