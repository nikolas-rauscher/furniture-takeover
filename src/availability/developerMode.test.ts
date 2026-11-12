import test from "node:test";
import assert from "node:assert/strict";
import {
  DEVELOPER_MODE_KEY,
  readDeveloperMode,
  writeDeveloperMode,
} from "./developerMode.ts";
import { emptyAvailability, skipHours } from "./reservations.ts";
import {
  AVAILABILITY_STATE_KEY,
  createAvailabilityRepository,
} from "./storage.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

test("developer tools start off and a browser preference survives reloads", () => {
  const storage = memoryStorage();
  assert.equal(readDeveloperMode(storage), false);
  writeDeveloperMode(storage, true);
  assert.equal(readDeveloperMode(storage), true);
  writeDeveloperMode(storage, false);
  assert.equal(readDeveloperMode(storage), false);
  assert.equal(storage.getItem(DEVELOPER_MODE_KEY), "false");
});

test("an existing accelerated demo stays visible until an explicit choice", () => {
  const storage = memoryStorage();
  const repository = createAvailabilityRepository(storage);
  repository.save(skipHours(emptyAvailability(), 216));
  assert.equal(readDeveloperMode(storage), true);
  assert.equal(storage.getItem(DEVELOPER_MODE_KEY), null);
  assert.equal(repository.load().state.clockOffsetMs, 216 * 60 * 60 * 1000);
  writeDeveloperMode(storage, false);
  assert.equal(readDeveloperMode(storage), false);
});

test("ordinary saved reservations do not enable developer tools", () => {
  const storage = memoryStorage();
  createAvailabilityRepository(storage).save({
    ...emptyAvailability(),
    reservations: [
      {
        listingId: "desk",
        title: "Desk",
        status: "pending",
        requestedAt: "2026-11-12T10:00:00.000Z",
        pickupBy: "2026-11-13",
        replyBy: "2026-11-13T10:00:00.000Z",
      },
    ],
  });
  assert.equal(readDeveloperMode(storage), false);
});

test("invalid demo data and unavailable browser storage leave tools off", () => {
  const storage = memoryStorage();
  storage.setItem(AVAILABILITY_STATE_KEY, '{"clockOffsetMs":777600000}');
  assert.equal(readDeveloperMode(storage), false);
  storage.setItem(DEVELOPER_MODE_KEY, "garbage");
  assert.equal(readDeveloperMode(storage), false);
  assert.equal(
    readDeveloperMode({
      ...storage,
      getItem: () => {
        throw new Error("Storage is blocked");
      },
    }),
    false,
  );
});
