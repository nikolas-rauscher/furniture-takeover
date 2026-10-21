import { products } from "../src/testing/fixtures.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSearch as parseSearchAtDate,
  filterProducts,
  defaults,
  migrateSaved,
  listingTitle,
  parsePickupDate,
} from "./marketplace.ts";

// Calendar examples use a fixed Monday, independent of when CI runs.
const parseSearch = (text: string, base = defaults) =>
  parseSearchAtDate(text, base, "2026-10-12");
test("unverified legacy distances cannot exclude local offers or prove radius matches", () => {
  const item = { ...products[0], location: "Berlin", distance: 0 };
  const criteria = { ...defaults, radius: 1 };
  // These are candidates requiring a pickup-distance check, not verified radius matches.
  assert.equal(filterProducts([item], criteria).length, 1);
  assert.equal(
    filterProducts([{ ...item, distance: 400 }], criteria).length,
    1,
  );
});
for (const text of [
  "Ich suche einen Schreibtisch bis 80 CHF, maximal 5 km entfernt, bis Friday",
  "I need a desk under CHF 80, within 5 km, pickup by Friday",
]) {
  test(`extracts independent budget, radius and pickup date: ${text}`, () => {
    const criteria = parseSearch(text);
    assert.equal(criteria.category, "All");
    assert.equal(criteria.maxPrice, 80);
    assert.equal(criteria.radius, 5);
    assert.equal(criteria.pickup, "2026-10-16");
    assert.deepEqual(
      filterProducts(products, criteria).map((p) => p.id),
      ["desk", "desk2"],
    );
  });
}

test("item identity survives budget-first, currency and collection clauses", () => {
  for (const phrase of [
    "Under CHF 80, a white desk within 5 km",
    "I need a white desk for CHF 80 nearby",
    "White desk, ready to collect by Friday, under CHF 80",
  ]) {
    const c = parseSearch(phrase);
    assert.equal(c.query.toLowerCase(), "white desk", phrase);
    assert.equal(c.maxPrice, 80, phrase);
    assert.deepEqual(
      filterProducts(products, c).map((p) => p.id),
      ["desk"],
      phrase,
    );
  }
});

test("natural conditions and source refinements do not replace item identity", () => {
  const c = parseSearch(
    "in very good condition from Ricardo",
    parseSearch("desk under CHF 80"),
  );
  assert.equal(c.query, "desk");
  assert.equal(c.condition, "Very good");
  assert.equal(c.source, "Ricardo");
  assert.deepEqual(
    filterProducts(products, c).map((p) => p.id),
    ["desk2"],
  );
});

test("pickup dates handle explicit dates, next week and calendar boundaries", () => {
  assert.equal(parseSearch("desk, pickup by 2026-10-21").pickup, "2026-10-21");
  assert.equal(
    parseSearch("by next Friday", parseSearch("white desk")).query,
    "white desk",
  );
  assert.equal(parseSearch("by next Friday").pickup, "2026-10-23");
  assert.equal(parsePickupDate("tomorrow", "2026-10-31"), "2026-11-01");
  assert.equal(parsePickupDate("Friday", "2026-10-17"), "2026-10-23");
  assert.equal(parsePickupDate("2026-02-31"), undefined);
});

test("flexible pickup and any budget explicitly clear previous restrictions", () => {
  const original = parseSearch("white desk under CHF 80, pickup by Friday");
  const refined = parseSearch("pickup flexible, any budget", original);
  assert.equal(refined.query, "white desk");
  assert.equal(refined.pickup, "");
  assert.equal(refined.maxPrice, 1_000_000);
});

test("non-Latin item queries stay specific instead of matching all listings", () => {
  assert.deepEqual(filterProducts(products, parseSearch("书桌")), []);
  const desk = {
    ...products[1],
    id: "chinese-desk",
    title: "书桌",
    category: "",
  };
  assert.deepEqual(
    filterProducts([desk], parseSearch("书桌")).map((p) => p.id),
    ["chinese-desk"],
  );
  assert.deepEqual(filterProducts(products, { ...defaults, query: "???" }), []);
});

for (const [text, expectedTitle] of [
  ["Coat stand, CHF 30", "Coat stand"],
  ["Hat stand, CHF 20", "Hat stand"],
  ["Selling my oak wardrobe, asking CHF 120", "Oak wardrobe"],
  ["Bench for the garden, CHF 50", "Bench for the garden"],
  ["Oak wardrobe, CHF 120, pickup Friday", "Oak wardrobe"],
  ["Desk, CHF 65. Collection by Friday.", "Desk"],
  ["", "Furniture for sale"],
]) {
  test(`listing title preserves item words: ${JSON.stringify(text)}`, () => {
    assert.equal(listingTitle(text), expectedTitle);
  });
}

for (const [text, expectedBudget] of [
  ["Sofa bis 5 km", 500],
  ["Chair within 5 km", 500],
  ["Sofa under 150 CHF", 150],
  ["Lamp under 25", 25],
] as const) {
  test(`distinguishes budgets from distance: ${text}`, () => {
    assert.equal(parseSearch(text).maxPrice, expectedBudget);
  });
}

test("filters source, price, availability, condition and radius together", () => {
  assert.deepEqual(
    filterProducts(products, {
      ...defaults,
      category: "Desks",
      source: "takeover",
      maxPrice: 70,
      radius: 5,
      pickup: "2026-10-16",
    }).map((p) => p.id),
    ["desk"],
  );
  assert.equal(
    filterProducts(products, {
      ...defaults,
      category: "Desks",
      condition: "Very good",
      maxPrice: 70,
    }).length,
    0,
  );
});
test("free offers and empty results retain a zero budget", () => {
  const c = parseSearch("Sofa bis 0 CHF");
  assert.equal(c.maxPrice, 0);
  assert.equal(filterProducts(products, c).length, 0);
});
for (const text of [
  "Kühlschrank",
  "Ich suche einen Kühlschrank",
  "I need a fridge under CHF 100",
]) {
  test(`unmatched item never returns fallback furniture: ${text}`, () => {
    assert.deepEqual(filterProducts(products, parseSearch(text)), []);
  });
}

test("withdrawn listings never appear", () =>
  assert.equal(
    filterProducts([{ ...products[0], status: "withdrawn" }], defaults).length,
    0,
  ));

test("saved German search labels migrate without changing user-authored text", () => {
  const saved = {
    title: "My custom search",
    criteria: {
      category: "Schreibtische",
      condition: "Sehr gut",
      source: "Alle",
    },
    description: "My original notes",
  };
  const result = migrateSaved(saved);
  assert.equal(result.criteria.category, "Desks");
  assert.equal(result.criteria.condition, "Very good");
  assert.equal(result.criteria.source, "All");
  assert.equal(result.title, saved.title);
  assert.equal(result.description, saved.description);
});

test("a new furniture type can be found without a predefined category", () => {
  const wardrobe = {
    ...products[0],
    id: "wardrobe",
    title: "Oak wardrobe",
    category: "",
    description: "Two doors and an oak finish.",
    price: 120,
  };
  assert.deepEqual(
    filterProducts(
      [wardrobe],
      parseSearch("I need an oak wardrobe under CHF 150"),
    ).map((p) => p.id),
    ["wardrobe"],
  );
  assert.deepEqual(
    filterProducts([wardrobe], { ...defaults, query: "wardrobes oak" }).map(
      (p) => p.id,
    ),
    ["wardrobe"],
  );
});
test("free-form listings remain searchable without a category assignment", () => {
  const desk = { ...products[1], category: "" };
  assert.deepEqual(
    filterProducts([desk], parseSearch("desk under CHF 80")).map((p) => p.id),
    ["desk"],
  );
});
test("descriptive searches retain modifiers instead of collapsing to a category", () => {
  assert.deepEqual(
    filterProducts(
      products,
      parseSearch("I need a white desk under CHF 80"),
    ).map((p) => p.id),
    ["desk"],
  );
  assert.deepEqual(
    filterProducts(products, parseSearch("a green sofa")).map((p) => p.id),
    ["sofa"],
  );
});

test("budget and distance follow-ups preserve the original item and its modifiers", () => {
  const base = parseSearch("white desk under CHF 80");
  const budget = parseSearch("under CHF 100", base);
  assert.equal(budget.query, "white desk");
  assert.equal(budget.maxPrice, 100);
  assert.deepEqual(
    filterProducts(products, budget).map((p) => p.id),
    ["desk"],
  );
  const distance = parseSearch("within 5 km", budget);
  assert.equal(distance.query, "white desk");
  assert.equal(distance.radius, 5);
  assert.equal(distance.maxPrice, 100);
  assert.deepEqual(
    filterProducts(products, distance).map((p) => p.id),
    ["desk"],
  );
});

test("explicit broad requests clear the previous item while retaining constraints", () => {
  const base = parseSearch("white desk under CHF 80");
  for (const request of [
    "all furniture",
    "anything",
    "show me all furniture",
    "alle Möbel",
  ]) {
    const c = parseSearch(request, base);
    assert.equal(c.query, "", request);
    assert.equal(c.category, "All");
    assert.equal(c.maxPrice, 80);
    assert.ok(
      filterProducts(products, c).some((p) => p.id === "lamp"),
      request,
    );
  }
  assert.equal(parseSearch("all furniture under CHF 100", base).maxPrice, 100);
  assert.equal(parseSearch("all furniture under CHF 100", base).query, "");
});

test("constraint refinements retain legacy saved item labels and allow a new item", () => {
  const c = parseSearch("within 5 km", {
    ...defaults,
    category: "Desks",
    maxPrice: 80,
  });
  assert.equal(c.query, "Desks");
  assert.equal(c.category, "All");
  assert.deepEqual(
    filterProducts(products, c).map((p) => p.id),
    ["desk", "desk2"],
  );
  assert.equal(parseSearch("a reading lamp", c).query, "reading lamp");
  const german = parseSearch(
    "unter 100 CHF",
    parseSearch("weißer Schreibtisch bis 80 CHF"),
  );
  assert.equal(german.query, "weißer Schreibtisch");
  assert.equal(german.maxPrice, 100);
});

test("accessories mentioned in descriptions do not become listing identities", () => {
  assert.deepEqual(
    filterProducts(products, parseSearch("chair")).map((p) => p.id),
    ["chair", "armchair"],
  );
  for (const query of ["monitor", "accessories", "books", "plants"]) {
    assert.deepEqual(
      filterProducts(products, parseSearch(query)).map((p) => p.id),
      [],
      query,
    );
  }
  // An item remains searchable by its actual title even if another listing
  // mentions it as an excluded accessory.
  const monitor = {
    ...products[1],
    id: "monitor",
    title: "White monitor",
    category: "",
  };
  assert.deepEqual(
    filterProducts([...products, monitor], parseSearch("white monitor")).map(
      (p) => p.id,
    ),
    ["monitor"],
  );
});

test("plain Find and Search for requests keep local item matches", () => {
  for (const text of [
    "Find a white desk under CHF 80",
    "Search for a white desk under CHF 80",
  ]) {
    const criteria = parseSearch(text);
    assert.equal(criteria.query, "white desk");
    assert.equal(criteria.maxPrice, 80);
    assert.ok(
      filterProducts(products, criteria).some((item) =>
        /white desk/i.test(item.title),
      ),
    );
  }
});

test("supported marketplace source phrases are preferences rather than item keywords", () => {
  for (const source of ["eBay", "Kleinanzeigen", "Tutti", "Petitesannonces"]) {
    const criteria = parseSearch(`Find a desk on ${source}`);
    assert.equal(criteria.query, "desk");
    assert.equal(criteria.source, source);
  }
});
