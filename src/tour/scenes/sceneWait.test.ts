import assert from "node:assert/strict";
import test from "node:test";
import { pause, waitFor } from "./sceneWait.ts";

const running = () => new AbortController().signal;

test("a wait returns what is already there without pausing", async () => {
  const started = Date.now();
  const found = await waitFor(() => "sheet", {
    what: "The offer sheet",
    timeoutMs: 1000,
    signal: running(),
  });
  assert.equal(found, "sheet");
  assert.ok(Date.now() - started < 40);
});

test("a wait returns what appears while it waits", async () => {
  const appearsAt = Date.now() + 120;
  const found = await waitFor(() => (Date.now() >= appearsAt ? 7 : null), {
    what: "The offer sheet",
    timeoutMs: 1000,
    signal: running(),
  });
  assert.equal(found, 7);
});

test("a wait that runs out names what never appeared", async () => {
  const started = Date.now();
  await assert.rejects(
    waitFor(() => null, {
      what: 'The element ".offer-editor"',
      timeoutMs: 150,
      signal: running(),
    }),
    { message: 'The element ".offer-editor" did not appear within 150 ms.' },
  );
  assert.ok(Date.now() - started >= 150);
});

test("a stopped round ends the wait with the round's reason", async () => {
  const round = new AbortController();
  const reason = new Error("The round left the screen.");
  setTimeout(() => round.abort(reason), 80);
  await assert.rejects(
    waitFor(() => null, {
      what: "The offer sheet",
      timeoutMs: 5000,
      signal: round.signal,
    }),
    reason,
  );
});

test("a pause in a round already stopped rejects at once", async () => {
  const round = new AbortController();
  round.abort(new Error("Stopped."));
  await assert.rejects(pause(1000, round.signal), { message: "Stopped." });
});
