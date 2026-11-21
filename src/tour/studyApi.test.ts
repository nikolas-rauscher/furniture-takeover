import assert from "node:assert/strict";
import test from "node:test";
import {
  isFinalRefusal,
  readResults,
  readRetryAfter,
  retryDelayMs,
  saveEvents,
  StudyRequestError,
} from "./studyApi.ts";

const refusal = (status: number, retryAfterMs: number | null = null) =>
  new StudyRequestError("Refused.", status, retryAfterMs);

test("a refused request carries its status and the wait the server asked for", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response('{"error":{"code":"STUDY_BUSY"}}', {
        status: 429,
        headers: { "Retry-After": "42" },
      }),
  );
  const events = {
    session: "6f1c1f9e-5b7a-4c1e-9a1d-2f3b4c5d6e7f",
    events: [
      {
        seq: 0,
        kind: "shown" as const,
        step: "who",
        detail: null,
        at: "2026-11-30T10:00:00.000Z",
      },
    ],
  };
  await assert.rejects(saveEvents(events), (error) => {
    assert.ok(error instanceof StudyRequestError);
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterMs, 42_000);
    assert.match(error.message, /save events 0 to 0 \(429\)/);
    return true;
  });
});

test("Retry-After is read in seconds or as an HTTP date", () => {
  const now = Date.parse("2026-11-30T10:00:00Z");
  assert.equal(readRetryAfter("120", now), 120_000);
  assert.equal(readRetryAfter("Mon, 30 Nov 2026 10:00:30 GMT", now), 30_000);
  assert.equal(readRetryAfter("Mon, 30 Nov 2026 09:00:00 GMT", now), 0);
  for (const unreadable of [null, "", "soon"])
    assert.equal(readRetryAfter(unreadable, now), null, String(unreadable));
});

test("client errors are final, except a timeout and a rate limit", () => {
  for (const status of [400, 403, 404, 413, 415])
    assert.equal(isFinalRefusal(refusal(status)), true, String(status));
  for (const status of [408, 429, 500, 502, 503])
    assert.equal(isFinalRefusal(refusal(status)), false, String(status));
  assert.equal(isFinalRefusal(new TypeError("Failed to fetch")), false);
});

test("a busy or unavailable server's wait is kept up to a minute; otherwise the pause doubles", () => {
  assert.equal(retryDelayMs(1, refusal(429, 30_000)), 30_000);
  assert.equal(retryDelayMs(1, refusal(503, 7_200_000)), 60_000);
  assert.equal(retryDelayMs(2, refusal(503, 0)), 0);
  assert.equal(retryDelayMs(3, refusal(500, 30_000)), 3_200);
  assert.equal(retryDelayMs(1, refusal(429)), 800);
  assert.deepEqual(
    [1, 2, 3].map((attempt) => retryDelayMs(attempt, new TypeError("Offline"))),
    [800, 1_600, 3_200],
  );
});

test("the shared results are asked for the participant's wording version", async (t) => {
  const asked: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    asked.push(url);
    return Response.json({ ready: false });
  });
  assert.deepEqual(await readResults("v3-3"), { ready: false });
  assert.deepEqual(asked, ["/api/study/results?version=v3-3"]);
});
