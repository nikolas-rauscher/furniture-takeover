import test from "node:test";
import assert from "node:assert/strict";
import { formatTimeLeft, pickupDays } from "./format.ts";
import {
  confirmReservation,
  emptyAvailability,
  requestReservation,
} from "./reservations.ts";
import { createAvailabilityRepository } from "./storage.ts";

const NOW = new Date("2026-03-02T09:00:00.000Z");

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("saved reservation state survives a reload", () => {
  const storage = memoryStorage();
  const repository = createAvailabilityRepository(storage, "state");
  const listing = { id: "desk", title: "Desk", status: "active" as const };
  const state = confirmReservation(
    requestReservation(emptyAvailability(), listing, "2026-03-03", NOW).state,
    listing,
    NOW,
  ).state;
  repository.save(state);
  assert.deepEqual(repository.load(), { state, source: "stored" });
  repository.clear();
  assert.equal(repository.load().source, "empty");
});

test("unreadable saved state falls back to empty without being overwritten", () => {
  for (const raw of [
    "{",
    "null",
    '{"version":2}',
    '{"version":1,"clockOffsetMs":-1}',
  ]) {
    const storage = memoryStorage();
    storage.setItem("state", raw);
    const restored = createAvailabilityRepository(storage, "state").load();
    assert.deepEqual(
      restored,
      { state: emptyAvailability(), source: "invalid" },
      raw,
    );
    assert.equal(storage.getItem("state"), raw, raw);
  }
});

test("time left rounds up to the minute and never goes negative", () => {
  const cases: [number, string][] = [
    [24 * 60, "24h 0m"],
    [90.5, "1h 31m"],
    [45, "45m"],
    [-5, "0m"],
  ];
  for (const [minutes, expected] of cases)
    assert.equal(
      formatTimeLeft(
        new Date(NOW.getTime() + minutes * 60000).toISOString(),
        NOW,
      ),
      expected,
    );
});

test("pickup days start from the Lausanne calendar day", () => {
  // 23:30 UTC is already the next day in Lausanne.
  assert.deepEqual(
    pickupDays(new Date("2026-03-02T23:30:00.000Z")).map(
      (option) => option.day,
    ),
    ["2026-03-03", "2026-03-04", "2026-03-05"],
  );
});
