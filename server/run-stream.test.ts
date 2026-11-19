import assert from "node:assert/strict";
import test from "node:test";
import type { TextStreamPart, ToolSet } from "ai";
import {
  MAX_REASONING_CHARS,
  MAX_REASONING_PARTS,
  type AgentRunEvent,
} from "../shared/runs.ts";
import { createRunStream, MAX_RUN_TEXT_CHARS } from "./run-stream.ts";

type Part = TextStreamPart<ToolSet>;

async function* chunks(...parts: Part[]) {
  yield* parts;
}

function setup() {
  const events: AgentRunEvent[] = [];
  const controller = new AbortController();
  const stream = createRunStream({
    runId: "run",
    sources: [
      {
        id: "web-1",
        title: "Chair",
        url: "https://example.com",
        snippet: "A chair",
      },
    ],
    emit: (event) => {
      events.push(event);
    },
    abort: () => controller.abort(),
  });
  return { events, stream, signal: controller.signal };
}

test("preserves split citations that refer to sources and flushes trailing text", async () => {
  const { events, stream } = setup();
  await stream.consume(
    chunks(
      { type: "text-delta", id: "text", text: "Chair [web-" },
      { type: "text-delta", id: "text", text: "1] and [web-9]. [" },
    ),
    true,
  );
  assert.deepEqual(events, [
    { type: "text_delta", text: "Chair " },
    { type: "text_delta", text: "[web-1] and . " },
  ]);
  await stream.flushText();
  assert.equal(stream.publicText, "Chair [web-1] and . [");
  assert.deepEqual(events.at(-1), { type: "text_delta", text: "[" });
});

test("names repeated reasoning parts uniquely and records stream failures", async () => {
  const { events, stream } = setup();
  const failure = new Error("stream failure");
  await stream.consume(
    chunks(
      { type: "reasoning-start", id: "model-part" },
      { type: "reasoning-delta", id: "model-part", text: "Checking" },
      { type: "reasoning-end", id: "model-part" },
      { type: "reasoning-start", id: "model-part" },
      { type: "text-delta", id: "text", text: "Hidden interim reply" },
      { type: "error", error: failure },
    ),
    false,
  );
  assert.deepEqual(events.slice(0, 2), [
    { type: "reasoning_start", id: "run-reasoning-1" },
    { type: "reasoning_delta", id: "run-reasoning-1", text: "Checking" },
  ]);
  const end = events[2];
  assert.equal(end.type, "reasoning_end");
  assert.equal(end.id, "run-reasoning-1");
  assert.ok(end.durationMs >= 0);
  assert.deepEqual(events.slice(3), [
    { type: "reasoning_start", id: "run-reasoning-2" },
  ]);
  assert.equal(stream.publicText, "");
  assert.equal(stream.failure, failure);
});

test("marks still-running statuses as failed with their original task", async () => {
  const { events, stream } = setup();
  await stream.status("complete", "Catalog", "running", "listings");
  await stream.status("complete", "Catalog", "complete");
  await stream.status("open", "Sources", "running", "web");
  await stream.failOpenStatuses();
  assert.deepEqual(events.slice(3), [
    {
      type: "status",
      id: "open",
      label: "Sources",
      state: "error",
      task: "web",
    },
  ]);
});

test("aborts over-limit text and reasoning, including hidden text", async () => {
  const cases: Part[][] = [
    [
      {
        type: "text-delta",
        id: "text",
        text: "a".repeat(MAX_RUN_TEXT_CHARS + 1),
      },
    ],
    [
      { type: "reasoning-start", id: "model-part" },
      {
        type: "reasoning-delta",
        id: "model-part",
        text: "a".repeat(MAX_REASONING_CHARS + 1),
      },
    ],
    Array.from({ length: MAX_REASONING_PARTS + 1 }, (_, index) => ({
      type: "reasoning-start",
      id: String(index),
    })),
  ];
  for (const parts of cases) {
    const { stream, signal } = setup();
    await assert.rejects(stream.consume(chunks(...parts), false), {
      code: "OUTPUT_LIMIT",
    });
    assert.equal(signal.aborted, true);
  }
});
