import test from "node:test";
import assert from "node:assert/strict";
import { isSearchArea } from "../../searchRequest.ts";
import {
  PICKUP_TIME,
  chatScene,
  exampleSearch,
  intentOptions,
  isComplete,
  itemById,
  items,
  offersFor,
  placeName,
  places,
  storyActs,
} from "./onboardingContent.ts";

test("an example search reads like a request and rounds the budget up to tens", () => {
  assert.equal(
    exampleSearch(["desk", "lamp"]),
    "A desk and a desk lamp under CHF 70, pickup this week",
  );
  assert.equal(
    exampleSearch(["kitchen"]),
    "Kitchen basics under CHF 30, pickup this week",
  );
  assert.equal(
    exampleSearch(["bike", "sofa", "desk"]),
    "A city bike and a small sofa under CHF 250, pickup this week",
  );
  assert.throws(() => exampleSearch([]));
});

test("the visitor's own side of the story comes first", () => {
  assert.deepEqual(storyActs("sell"), ["snap", "chat", "ask"]);
  assert.deepEqual(storyActs("find"), ["ask", "chat", "snap"]);
  assert.deepEqual(storyActs("both"), ["ask", "chat", "snap"]);
});

test("as a buyer, Pako writes to the seller and agrees on price and pickup", () => {
  const scene = chatScene("find", "desk", "vortex");
  assert.equal(scene.role, "buyer");
  assert.equal(scene.partner.name, "Léa");
  assert.equal(scene.lines[0].from, "pako");
  assert.match(scene.lines[0].text, /white study desk.*CHF 30/);
  assert.match(
    scene.lines[2].text,
    /Thursday at 18:00 at the Vortex reception/,
  );
  assert.deepEqual(scene.deal, {
    title: "White study desk",
    price: 35,
    time: PICKUP_TIME,
    meetingPoint: "Vortex reception",
  });
});

test("as a seller, the buyer writes first and Pako answers for the visitor", () => {
  const scene = chatScene("sell", "lamp", "epfl");
  assert.equal(scene.role, "seller");
  assert.equal(scene.lines[0].from, "partner");
  assert.match(scene.lines[0].text, /desk lamp.*CHF 8/);
  assert.ok(
    scene.lines.some(
      (line) =>
        line.from === "pako" && line.text.includes("the Rolex Learning Center"),
    ),
  );
  assert.equal(scene.deal.price, 10);
  assert.equal(scene.deal.meetingPoint, "Rolex Learning Center");
});

test("the student listing is the one best match and the cheapest offer", () => {
  const offers = offersFor("desk");
  assert.equal(offers[0].best, true);
  assert.equal(offers[0].source, "takeover");
  assert.equal(offers.filter((offer) => offer.best).length, 1);
  assert.deepEqual(
    offers.map((offer) => offer.price),
    [40, 55, 80],
  );
  assert.deepEqual(
    offersFor("lamp").map((offer) => offer.price),
    [12, 17, 25],
  );
});

test("the story starts only with an intent, a place and at least one item", () => {
  assert.equal(isComplete({ items: [] }), false);
  assert.equal(isComplete({ intent: "find", place: "unil", items: [] }), false);
  assert.equal(
    isComplete({ intent: "find", place: "unil", items: ["bed"] }),
    true,
  );
});

test("every option has its own id and unknown ids fail loudly", () => {
  for (const list of [intentOptions, places, items]) {
    const ids = list.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length);
  }
  assert.throws(() => itemById("table" as never), /Unknown intro option/);
});

test("every place can be stored as the search area", () => {
  for (const place of places)
    assert.ok(isSearchArea({ location: place.searchArea, radius: 5 }));
});

test("Pako names an intro place by its own name and any other area by its first part", () => {
  assert.equal(placeName("FMEL Vortex, Chavannes-près-Renens"), "Vortex");
  assert.equal(placeName("EPFL, Ecublens"), "EPFL");
  assert.equal(placeName("Lausanne"), "Lausanne");
  assert.equal(
    placeName("Avenue de Morges 12, Lausanne"),
    "Avenue de Morges 12",
  );
});
