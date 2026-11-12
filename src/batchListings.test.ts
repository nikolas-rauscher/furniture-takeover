import assert from "node:assert/strict";
import test from "node:test";
import {
  batchItem,
  itemsFromGroups,
  missingDetails,
  movePhoto,
  readyItems,
  removePhoto,
} from "./batchListings.ts";

const photos = ["a", "b", "c", "d"];

test("sorted groups become one item per piece, keeping the cover first", () => {
  const items = itemsFromGroups(
    photos,
    [
      { photos: [1, 0], label: "Pale desk" },
      { photos: [2], label: "" },
      { photos: [3], label: "Blue armchair" },
    ],
    "Lausanne",
  );
  assert.deepEqual(
    items.map((item) => [item.label, item.draft.image, item.draft.images]),
    [
      ["Pale desk", "b", ["b", "a"]],
      ["", "c", ["c"]],
      ["Blue armchair", "d", ["d"]],
    ],
  );
  assert.ok(items.every((item) => item.draft.location === "Lausanne"));
});

test("moving photos merges items, splits them and drops emptied items", () => {
  const items = [
    batchItem(["a", "b"], "Lausanne", "Desk", "desk"),
    batchItem(["c"], "Lausanne", "Chair", "chair"),
  ];
  const merged = movePhoto(items, "c", "desk", "Lausanne");
  assert.deepEqual(
    merged.map((item) => item.draft.images),
    [["a", "b", "c"]],
  );
  const split = movePhoto(merged, "a", null, "Lausanne");
  assert.deepEqual(
    split.map((item) => [item.draft.image, item.draft.images]),
    [
      ["b", ["b", "c"]],
      ["a", ["a"]],
    ],
  );
  assert.equal(movePhoto(items, "a", "desk", "Lausanne"), items);
});

test("a changed photo set needs a new draft and a full item accepts no more", () => {
  const drafted = {
    ...batchItem(["a"], "Lausanne", "", "one"),
    status: "ready" as const,
  };
  const full = batchItem(
    ["1", "2", "3", "4", "5", "6"],
    "Lausanne",
    "",
    "full",
  );
  assert.deepEqual(movePhoto([drafted, full], "a", "full", "Lausanne"), [
    drafted,
    full,
  ]);
  const [changed] = removePhoto(
    [{ ...drafted, draft: { ...drafted.draft, images: ["a", "b"] } }],
    "b",
  );
  assert.equal(changed.status, "sorted");
  assert.deepEqual(removePhoto([drafted], "a"), []);
});

test("only drafted items with every required detail are ready to save", () => {
  const complete = {
    ...batchItem(["a"], "Lausanne"),
    status: "ready" as const,
  };
  complete.draft = {
    ...complete.draft,
    title: "Desk",
    description: "Pale desk.",
    price: "40",
  };
  const noPrice = { ...complete, draft: { ...complete.draft, price: "" } };
  const notDrafted = { ...complete, status: "drafting" as const };
  assert.deepEqual(readyItems([complete, noPrice, notDrafted]), [complete]);
  assert.deepEqual(missingDetails(noPrice.draft), ["price"]);
  assert.deepEqual(missingDetails(complete.draft), []);
});
