import assert from "node:assert/strict";
import test from "node:test";
import { isAgentBusy, retryOnceWhenBusy } from "./busyRetry.ts";

const busy = () =>
  Object.assign(new Error("Pako is busy."), { code: "TOO_MANY_REQUESTS" });

test("a busy request is tried once more, then the second answer stands", async () => {
  let calls = 0;
  let retries = 0;
  const signal = new AbortController().signal;
  const onRetry = () => retries++;
  assert.equal(
    await retryOnceWhenBusy(
      async () => (++calls === 1 ? Promise.reject(busy()) : "read"),
      { signal, onRetry },
    ),
    "read",
  );
  assert.deepEqual([calls, retries], [2, 1]);
  calls = 0;
  await assert.rejects(
    retryOnceWhenBusy(
      async () => {
        calls++;
        throw busy();
      },
      { signal, onRetry },
    ),
    isAgentBusy,
  );
  assert.equal(calls, 2);
});

test("other failures are not retried", async () => {
  let calls = 0;
  const signal = new AbortController().signal;
  await assert.rejects(
    retryOnceWhenBusy(
      async () => {
        calls++;
        throw new Error("offline");
      },
      { signal, onRetry: () => {} },
    ),
    /offline/,
  );
  assert.equal(calls, 1);
});
