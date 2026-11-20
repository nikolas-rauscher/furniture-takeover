import assert from "node:assert/strict";
import test from "node:test";
import { createSaveQueue, type SaveQueue } from "./saveQueue.ts";

const noPause = () => Promise.resolve();

/** Resolves once the queue has stopped sending. */
function settled(queue: SaveQueue) {
  return new Promise<void>((resolve) => {
    const check = () => {
      if (queue.getState().sending) return;
      unsubscribe();
      resolve();
    };
    const unsubscribe = queue.subscribe(check);
    check();
  });
}

function failingTimes(count: number, log: string[], name: string) {
  let failures = count;
  return async () => {
    if (failures > 0) {
      failures -= 1;
      throw new Error(`${name} failed`);
    }
    log.push(name);
  };
}

test("jobs are sent in order", async () => {
  const log: string[] = [];
  const queue = createSaveQueue({ attempts: 3, pause: noPause });
  queue.add({ key: "session", send: failingTimes(0, log, "session") });
  queue.add({ key: "student", send: failingTimes(0, log, "student") });
  await settled(queue);
  assert.deepEqual(log, ["session", "student"]);
  assert.deepEqual(queue.getState(), {
    unsaved: [],
    sending: false,
    error: null,
  });
});

test("a failed save is retried until it succeeds", async () => {
  const log: string[] = [];
  const pauses: number[] = [];
  const queue = createSaveQueue({
    attempts: 3,
    pause: async (attempt) => {
      pauses.push(attempt);
    },
  });
  queue.add({ key: "student", send: failingTimes(2, log, "student") });
  await settled(queue);
  assert.deepEqual(log, ["student"]);
  assert.deepEqual(pauses, [1, 2]);
  assert.deepEqual(queue.getState().unsaved, []);
});

test("after the last attempt the queue stops and keeps what is unsaved", async () => {
  const log: string[] = [];
  const queue = createSaveQueue({ attempts: 2, pause: noPause });
  queue.add({ key: "session", send: failingTimes(2, log, "session") });
  queue.add({ key: "student", send: failingTimes(0, log, "student") });
  await settled(queue);
  const stopped = queue.getState();
  assert.deepEqual(stopped.unsaved, ["session", "student"]);
  assert.equal(stopped.error?.message, "session failed");
  assert.deepEqual(log, []);

  queue.retry();
  await settled(queue);
  assert.deepEqual(log, ["session", "student"]);
  assert.deepEqual(queue.getState(), {
    unsaved: [],
    sending: false,
    error: null,
  });
});

test("a changed answer replaces the waiting one", async () => {
  const log: string[] = [];
  let online = false;
  const queue = createSaveQueue({ attempts: 1, pause: noPause });
  const send = (name: string) => async () => {
    if (!online) throw new Error("offline");
    log.push(name);
  };
  queue.add({ key: "session", send: send("session") });
  queue.add({ key: "housing", send: send("housing:first") });
  queue.add({ key: "housing", send: send("housing:second") });
  await settled(queue);
  assert.deepEqual(queue.getState().unsaved, ["session", "housing"]);
  online = true;
  queue.retry();
  await settled(queue);
  assert.deepEqual(log, ["session", "housing:second"]);
});

test("a change made while its answer is on the way is sent after it", async () => {
  const log: string[] = [];
  let release: () => void = () => {
    throw new Error("The first save has not started.");
  };
  const queue = createSaveQueue({ attempts: 1, pause: noPause });
  queue.add({
    key: "housing",
    send: () =>
      new Promise<void>((resolve) => {
        release = () => {
          log.push("housing:first");
          resolve();
        };
      }),
  });
  queue.add({ key: "housing", send: failingTimes(0, log, "housing:second") });
  release();
  await settled(queue);
  assert.deepEqual(log, ["housing:first", "housing:second"]);
});
