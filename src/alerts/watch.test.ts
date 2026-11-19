import assert from "node:assert/strict";
import test from "node:test";
import type { SavedSearch } from "../searchRequest.ts";
import { activateWatch, findWatch, watchSearch } from "./watch.ts";

const search = watchSearch("Desk", "Lausanne", 100)!;
const saved: SavedSearch = {
  id: "my-desk",
  title: "My desk search",
  criteria: { ...search.criteria, query: " desk " },
  paused: true,
  seen: false,
  location: " lausanne ",
  request: "Find a desk under CHF 100",
  search: {
    ...search,
    criteria: { ...search.criteria, query: " desk " },
    location: " lausanne ",
    originalRequest: "Find a desk under CHF 100",
  },
};

test("an equivalent paused watch resumes with its original record and ID", () => {
  const jobs = [saved];
  assert.equal(findWatch(jobs, search)?.paused, true);
  const active = activateWatch(jobs, search, "new-id");
  assert.deepEqual(active, [{ ...saved, paused: false }]);
  assert.equal(findWatch(active, search)?.paused, false);
  assert.equal(saved.paused, true);
});

test("an active equivalent takes precedence over a paused duplicate", () => {
  const active = { ...saved, id: "active", paused: false };
  const jobs = [saved, active];
  assert.equal(findWatch(jobs, search), active);
  assert.equal(activateWatch(jobs, search, "new-id"), jobs);
});

test("other criteria and locations do not block a general watch", () => {
  const jobs: SavedSearch[] = [
    {
      ...saved,
      id: "source",
      criteria: { ...saved.criteria, source: "takeover" },
    },
    {
      ...saved,
      id: "condition",
      criteria: { ...saved.criteria, condition: "Good" },
    },
    {
      ...saved,
      id: "pickup",
      criteria: { ...saved.criteria, pickup: "2030-06-15" },
    },
    { ...saved, id: "radius", criteria: { ...saved.criteria, radius: 5 } },
    {
      ...saved,
      id: "category",
      criteria: { ...saved.criteria, category: "Desks" },
    },
    { ...saved, id: "budget", criteria: { ...saved.criteria, maxPrice: 80 } },
    {
      ...saved,
      id: "location",
      location: "Bern",
      search: { ...search, location: "Bern" },
    },
  ].map((job) => ({ ...job, paused: false }));
  assert.equal(findWatch(jobs, search), undefined);
  const active = activateWatch(jobs, search, "new-id");
  assert.deepEqual(active.slice(0, -1), jobs);
  assert.equal(active.at(-1)?.id, "new-id");
  assert.equal(findWatch(active, search)?.paused, false);
});

test("a legacy saved search uses the current location and seed records are ignored", () => {
  const { location, search: snapshot, ...legacy } = saved;
  const seeded = { ...legacy, id: "seed-search", paused: false };
  assert.equal(findWatch([seeded, legacy], search), legacy);
  assert.equal(activateWatch([seeded, legacy], search, "new-id")[0], seeded);
});
