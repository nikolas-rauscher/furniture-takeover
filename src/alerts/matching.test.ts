import test from "node:test";
import assert from "node:assert/strict";
import { listingInventory } from "../../shared/listingInventory.ts";
import { defaults, type Product } from "../../shared/marketplace.ts";
import { products } from "../testing/fixtures.ts";
import { inventorySearch } from "../../server/agent-tools.ts";
import {
  demandLadder,
  hasBudget,
  NO_BUDGET,
  similarListings,
  dismissAlert,
  emptyAlerts,
  isAlertsState,
  markAlertsRead,
  MAX_UNREAD_PER_SEARCH,
  unreadCount,
  updateAlerts,
} from "./matching.ts";

const now = new Date("2026-10-20T10:00:00Z");
const desk = products.find((item) => item.id === "desk")!;
const job = {
  id: "job",
  criteria: { ...defaults, query: "desk" },
  paused: false,
};
const listing = (id: string, changes: Partial<Product> = {}): Product => ({
  ...desk,
  id,
  title: `Desk ${id}`,
  ...changes,
});
const run = (
  state: ReturnType<typeof emptyAlerts>,
  listings: Product[],
  jobs = [job],
) => updateAlerts(state, jobs, listings, now);

test("saved watches and discovery share supported marketplace vocabulary", () => {
  for (const [query, title] of [
    ["bureau", "White desk"],
    ["coffee machine", "Espresso machine"],
    ["vélo", "City bicycle"],
    ["schreibtische", "Office desks"],
    ["bookshelves", "Storage shelf"],
  ]) {
    const item = listing("new", { title, category: "All" });
    const criteria = { ...job.criteria, query };
    const jobs = [{ ...job, criteria }];
    const baseline = run(emptyAlerts(), [], jobs);
    assert.deepEqual(
      inventorySearch(listingInventory([item]), query).map((p) => p.id),
      [item.id],
    );
    assert.deepEqual(
      run(baseline, [item], jobs).alerts.map((a) => a.listingId),
      [item.id],
    );
  }
});

test("the first pass records a baseline and never alerts for existing listings", () => {
  const state = run(emptyAlerts(), [listing("a")]);
  assert.equal(state.alerts.length, 0);
  assert.deepEqual(state.baselines.job.listingIds, ["a"]);
});

test("a newly listed matching item raises one alert with a factual reason", () => {
  const first = run(emptyAlerts(), [listing("a")]);
  const second = run(first, [listing("a"), listing("b")]);
  assert.equal(second.alerts.length, 1);
  assert.equal(second.alerts[0].listingId, "b");
  assert.match(second.alerts[0].reason, /CHF 65/);
  // Running again with the same listings creates no duplicate.
  assert.equal(run(second, [listing("a"), listing("b")]), second);
});

test("non-matching, reserved and withdrawn listings do not alert", () => {
  const first = run(emptyAlerts(), []);
  const next = run(first, [
    listing("lamp", { title: "Lamp", category: "Lamps" }),
    listing("expensive", { price: 900 }),
    listing("held", { status: "reserved" }),
    listing("gone", { status: "withdrawn" }),
  ]);
  assert.equal(next.alerts.length, 0);
});

test("an item that becomes active again alerts once", () => {
  const first = run(emptyAlerts(), [listing("a", { status: "reserved" })]);
  assert.equal(first.baselines.job.listingIds.length, 0);
  const back = run(first, [listing("a")]);
  assert.equal(back.alerts[0]?.listingId, "a");
});

test("a paused search stays quiet and does not flood on resume", () => {
  const paused = { ...job, paused: true };
  const first = run(emptyAlerts(), [], [paused]);
  const during = run(first, [listing("a")], [paused]);
  assert.equal(during.alerts.length, 0);
  assert.equal(run(during, [listing("a")]).alerts.length, 0);
});

test("editing the search restarts from a silent baseline", () => {
  const first = run(emptyAlerts(), [listing("a")]);
  const edited = { ...job, criteria: { ...job.criteria, maxPrice: 400 } };
  assert.equal(
    run(first, [listing("a"), listing("b")], [edited]).alerts.length,
    0,
  );
});

test("unread alerts per search are capped, and held-back items alert later", () => {
  const empty = run(emptyAlerts(), []);
  const many = Array.from({ length: MAX_UNREAD_PER_SEARCH + 2 }, (_, i) =>
    listing(`n${i}`),
  );
  const capped = run(empty, many);
  assert.equal(capped.alerts.length, MAX_UNREAD_PER_SEARCH);
  const read = markAlertsRead(capped);
  assert.equal(unreadCount(read), 0);
  assert.equal(run(read, many).alerts.length, MAX_UNREAD_PER_SEARCH + 2);
});

test("unavailable or non-matching alerts release the unread cap immediately", () => {
  const matches = Array.from({ length: MAX_UNREAD_PER_SEARCH }, (_, i) =>
    listing(`old${i}`),
  );
  const capped = run(run(emptyAlerts(), []), matches);
  const unavailable: Product[][] = [
    ...(["sold", "reserved", "withdrawn"] as const).map((status) =>
      matches.map((item) => ({ ...item, status })),
    ),
    [], // Removed from the catalog entirely.
    matches.map((item) => ({ ...item, price: 900 })),
  ];
  for (const stale of unavailable) {
    const listings = [...stale, listing("new")];
    const next = run(capped, listings);
    assert.deepEqual(
      next.alerts.map((alert) => alert.listingId),
      ["new"],
    );
    assert.equal(unreadCount(next), 1);
    assert.deepEqual(next.baselines.job.listingIds, ["new"]);
    assert.equal(run(next, listings), next);
  }
});

test("a retired match alerts once when it becomes active again", () => {
  const active = [listing("a")];
  const alerted = run(run(emptyAlerts(), []), active);
  const retired = run(alerted, [listing("a", { status: "sold" })]);
  assert.deepEqual(retired.alerts, []);
  assert.deepEqual(retired.baselines.job.listingIds, []);
  const returned = run(retired, active);
  assert.equal(unreadCount(returned), 1);
  assert.deepEqual(
    returned.alerts.map((alert) => alert.listingId),
    ["a"],
  );
  assert.equal(run(returned, active), returned);
});

test("retiring alerts preserves read and dismissed matches in the baseline", () => {
  const matches = [listing("read"), listing("dismissed"), listing("stale")];
  const alerted = run(run(emptyAlerts(), []), matches);
  const read = markAlertsRead(alerted, (alert) => alert.listingId === "read");
  const dismissed = dismissAlert(
    read,
    read.alerts.find((alert) => alert.listingId === "dismissed")!.id,
  );
  const active = matches.slice(0, 2);
  const next = run(dismissed, active);
  assert.deepEqual(
    next.alerts.map((alert) => [alert.listingId, alert.read]),
    [["read", true]],
  );
  assert.equal(unreadCount(next), 0);
  assert.deepEqual(next.baselines.job.listingIds, ["read", "dismissed"]);
  assert.equal(run(next, active), next);
});

test("retirement keeps search edits and paused resumptions silent", () => {
  const alerted = run(run(emptyAlerts(), []), [listing("old")]);
  const edited = { ...job, criteria: { ...job.criteria, maxPrice: 40 } };
  const editedListings = [listing("old"), listing("existing", { price: 30 })];
  const reset = run(alerted, editedListings, [edited]);
  assert.deepEqual(reset.alerts, []);
  assert.deepEqual(reset.baselines.job.listingIds, ["existing"]);
  assert.equal(run(reset, editedListings, [edited]), reset);

  const paused = { ...job, paused: true };
  const during = run(alerted, [listing("old", { status: "sold" })], [paused]);
  assert.deepEqual(during.alerts, []);
  const returnedWhilePaused = run(during, [listing("old")], [paused]);
  assert.equal(run(returnedWhilePaused, [listing("old")]).alerts.length, 0);
});

test("deleting a search removes its alerts and baseline", () => {
  const first = run(emptyAlerts(), []);
  const withAlert = run(first, [listing("a")]);
  const without = run(withAlert, [listing("a")], []);
  assert.deepEqual(without.alerts, []);
  assert.deepEqual(without.baselines, {});
});

test("read and dismiss change only the targeted alert", () => {
  const state = run(run(emptyAlerts(), []), [listing("a"), listing("b")]);
  const [first] = state.alerts;
  assert.equal(unreadCount(markAlertsRead(state, (a) => a.id === first.id)), 1);
  assert.equal(dismissAlert(state, first.id).alerts.length, 1);
});

test("stored alert data is validated before use", () => {
  assert.equal(isAlertsState(emptyAlerts()), true);
  for (const bad of [null, {}, { version: 1, baselines: {}, alerts: [{}] }])
    assert.equal(isAlertsState(bad), false);
});

const draft = { title: "White desk", price: 65 };
const budget = (maxPrice: number, id = "j") => ({
  ...job,
  id,
  criteria: { ...job.criteria, maxPrice },
});

test("demand ladder counts what the asking price and lower prices would alert", () => {
  const jobs = [budget(70, "a"), budget(60, "b"), budget(40, "c")];
  assert.deepEqual(demandLadder(jobs, draft), {
    rungs: [
      { price: 65, count: 1 },
      { price: 58.5, count: 2 },
      { price: 52, count: 2 },
    ],
    noLimit: 0,
  });
});

test("demand ladder ignores paused, non-matching and invalid drafts", () => {
  const lamps = { ...job, criteria: { ...job.criteria, query: "lamp" } };
  const jobs = [budget(100), { ...budget(100, "p"), paused: true }, lamps];
  assert.equal(demandLadder(jobs, draft).rungs[0].count, 1);
  assert.ok(
    demandLadder(jobs, { title: " ", price: 40 }).rungs.every(
      (rung) => rung.count === 0,
    ),
  );
  assert.deepEqual(
    demandLadder(jobs, { title: "Desk", price: Number.NaN }).rungs,
    [],
  );
});

test("seller demand respects the pickup deadline used by actual alerts", () => {
  const deadline = {
    ...budget(100),
    criteria: { ...budget(100).criteria, pickup: "2026-11-20" },
  };
  for (const [pickupBy, expected] of [
    ["2026-11-25", 0],
    ["2026-11-20", 1],
    ["2026-11-15", 1],
  ] as const) {
    const hypothetical = { ...draft, pickupBy };
    assert.equal(
      demandLadder([deadline], hypothetical).rungs[0].count,
      expected,
    );
    const baseline = run(emptyAlerts(), [], [deadline]);
    assert.equal(
      run(baseline, [listing("new", hypothetical)], [deadline]).alerts.length,
      expected,
    );
  }
});

test("a free listing has a single rung", () => {
  assert.deepEqual(
    demandLadder([budget(0)], { title: "Desk", price: 0 }).rungs,
    [{ price: 0, count: 1 }],
  );
});

test("demand previews keep cent prices and exact buyer budget boundaries", () => {
  const exact = demandLadder([budget(49.5)], { title: "Desk", price: 49.5 });
  assert.deepEqual(exact.rungs[0], { price: 49.5, count: 1 });
  assert.deepEqual(
    demandLadder([budget(49.49)], { title: "Desk", price: 49.5 }).rungs[0],
    { price: 49.5, count: 0 },
  );
  assert.deepEqual(
    exact.rungs.map((rung) => rung.price),
    [49.5, 44.55, 39.6],
  );
});

test("searches without a stated price limit are reported separately", () => {
  const anyBudget = budget(NO_BUDGET, "any");
  const unspecified = budget(defaults.maxPrice, "default");
  const stated = budget(300, "stated");
  assert.equal(hasBudget(anyBudget.criteria), false);
  assert.equal(hasBudget(unspecified.criteria), false);
  assert.equal(hasBudget(stated.criteria), true);
  const ladder = demandLadder([anyBudget, unspecified, stated], draft);
  assert.equal(ladder.rungs[0].count, 3);
  assert.equal(ladder.noLimit, 2);
});

test("an alert reason mentions a price limit only when one was stated", () => {
  const listings = [listing("a")];
  const baseline = (maxPrice: number) => {
    const j = budget(maxPrice);
    const first = run(emptyAlerts(), [], [j]);
    return run(first, listings, [j]).alerts[0].reason;
  };
  assert.match(baseline(80), /limit CHF 80/);
  assert.doesNotMatch(baseline(NO_BUDGET), /limit/);
});

test("similar listings summarise active items of the same kind", () => {
  const items = [
    listing("a", { title: "Study desk", price: 40 }),
    listing("b", { title: "Home office desk", price: 110 }),
    listing("c", { title: "White desk", price: 65 }),
    listing("sold", { title: "Old desk", price: 5, status: "sold" }),
    listing("lamp", { title: "Desk lamp", category: "Lamps", price: 15 }),
  ];
  assert.deepEqual(similarListings(items, "Compact white desk"), {
    count: 3,
    min: 40,
    max: 110,
    median: 65,
  });
  assert.equal(similarListings(items, "White desk", "b")?.median, null);
  assert.equal(similarListings(items, "Grand piano"), null);
  assert.equal(similarListings(items, "  "), null);
});
