import assert from "node:assert/strict";
import test from "node:test";
import type { Product } from "./marketplace.ts";
import { relatedListings } from "./relatedListings.ts";

const product = (
  id: string,
  title: string,
  extra: Partial<Product> = {},
): Product => ({
  id,
  title,
  price: 50,
  tags: [],
  category: "",
  image: "",
  location: "Lausanne",
  distance: 0,
  condition: "Good",
  dimensions: "Not specified",
  source: "takeover",
  seller: "Seller",
  initials: "SE",
  description: "",
  available: "Flexible",
  pickupBy: "",
  status: "active",
  ...extra,
});

test("uses arbitrary free-form text and tags, never categories or known product IDs", () => {
  const target = product("target", "Portable microscope", {
    tags: ["Laboratory", "Optics"],
  });
  const related = product("any-new-id", "Precision optics", {
    tags: ["Laboratory"],
  });
  const unrelated = product("unrelated", "Wool blanket", { category: "same" });
  assert.deepEqual(
    relatedListings({ ...target, category: "same" }, [unrelated, related]).map(
      (item) => item.id,
    ),
    [related.id],
  );
});

test("same prices, locations and generic descriptions do not fill recommendations", () => {
  const notice =
    "Sample listing for testing; price and pickup details are fictional. This seller cannot reply.";
  const target = product("target", "Microscope", {
    description: notice,
    tags: ["Demo"],
  });
  assert.deepEqual(
    relatedListings(target, [
      product("unrelated", "Wool blanket", {
        description: notice,
        tags: ["Demo"],
      }),
    ]),
    [],
  );
});

test("excludes the selected item and inactive records, deduplicates and respects the limit", () => {
  const target = product("target", "Reading lamp");
  const first = product("a", "Reading lamp");
  const second = product("b", "Reading lamp");
  const inactive = ["sold", "reserved", "withdrawn"].map((status) =>
    product(status, "Reading lamp", { status: status as Product["status"] }),
  );
  assert.deepEqual(
    relatedListings(target, [target, ...inactive, first, first, second], 2).map(
      (item) => item.id,
    ),
    ["a", "b"],
  );
  assert.deepEqual(
    relatedListings(target, [first, second], 1).map((item) => item.id),
    ["a"],
  );
  assert.deepEqual(relatedListings(target, [first], 0), []);
});

test("price affinity sorts equally relevant items without outranking stronger text relevance", () => {
  const target = product("target", "Portable microscope", { price: 100 });
  const near = product("near", "Portable microscope", { price: 95 });
  const far = product("far", "Portable microscope", { price: 300 });
  const weak = product("weak", "Portable wool blanket", { price: 100 });
  assert.deepEqual(
    relatedListings(target, [weak, far, near]).map((item) => item.id),
    ["near", "far", "weak"],
  );
});

test("normalizes case, accents and simple plurals and does not mutate the catalog", () => {
  const target = product("target", "CAFÉ Tables");
  const candidate = product("other", "Café table");
  const catalog = Object.freeze([candidate]);
  assert.equal(relatedListings(target, catalog)[0], candidate);
  assert.equal(candidate.title, "Café table");
});

test("supports description evidence while excluding shared provenance", () => {
  const target = product("target", "Model Alpha", {
    description:
      "Adjustable microscope with optical lenses.\n\nSample listing for testing; fictional.",
  });
  const candidate = product("other", "Model Beta", {
    description: "Optical lenses for microscope.",
  });
  assert.deepEqual(relatedListings(target, [candidate]), [candidate]);
  assert.deepEqual(
    relatedListings(product("empty", "", { description: "" }), [candidate]),
    [],
  );
});
