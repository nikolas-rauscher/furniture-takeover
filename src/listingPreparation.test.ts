import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareListingDraft,
  listingMeasurementField,
} from "./listingPreparation.ts";
import type { ListingDraft } from "./components/SellFlow";

const book: ListingDraft = {
  image: "photo",
  raw: "",
  title: "Book",
  description: "",
  price: "",
  condition: "",
  dimensions: "",
  location: "Ecublens",
  pickup: "",
  category: "All",
};

test("photo review preserves specific title, confirmed price and custom condition", () => {
  const result = prepareListingDraft(book, {
    title: "Gregs Tagebuch, volumes 11 and 16",
    description: "Two German books by Jeff Kinney.",
    price: 5,
    condition: "Good, normal signs of use",
    keywords: ["German books"],
  });
  assert.equal(result.title, "Gregs Tagebuch, volumes 11 and 16");
  assert.equal(result.price, "5");
  assert.equal(result.condition, "Good, normal signs of use");
  assert.equal(listingMeasurementField(result), null);
});
test("reanalyzing does not clear confirmed seller facts when analysis lacks them", () => {
  const result = prepareListingDraft(
    {
      ...book,
      price: "0",
      condition: "Good",
      description: "Two books, with a torn cover.",
    },
    { title: "Two books", price: null, condition: null, keywords: [] },
  );
  assert.equal(result.price, "0");
  assert.equal(result.condition, "Good");
  assert.equal(result.description, "Two books, with a torn cover.");
});
test("measurements follow the actual item and keep supplied book measurements editable", () => {
  assert.equal(
    listingMeasurementField({ ...book, title: "City bicycle" })?.label,
    "Frame size",
  );
  assert.equal(
    listingMeasurementField({ ...book, title: "White desk" })?.label,
    "Measurements",
  );
  assert.equal(
    listingMeasurementField({ ...book, dimensions: "A4" })?.label,
    "Measurements",
  );
});
