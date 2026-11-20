import assert from "node:assert/strict";
import test from "node:test";
import { activityLines } from "./activityLines.ts";
import type { AgentRunStep } from "./hooks/useAgentRun.ts";

const step = (
  id: string,
  label: string,
  state: AgentRunStep["state"],
  task: AgentRunStep["task"] = "listing",
  detail?: string,
): AgentRunStep => ({
  type: "status",
  id,
  label,
  state,
  task,
  ...(detail ? { detail } : {}),
});

test("a step Pako took again shows once, where it first appeared, in its latest state", () => {
  const lines = activityLines(
    [
      step("read", "Reading your listing details", "complete", "request"),
      step(
        "web-1",
        "Checking comparable prices online",
        "complete",
        "web",
        "Desk",
      ),
      step(
        "web-2",
        "Checking comparable prices online",
        "complete",
        "web",
        "Desk",
      ),
      step("price-1", "Suggesting a price", "needs_input"),
      step("price-2", "Suggesting a price", "needs_input"),
      step("fill", "Filling in your listing", "complete"),
    ],
    undefined,
    "listing",
  );
  assert.deepEqual(
    lines.map((line) => line.id),
    ["web-2", "price-2", "fill"],
  );
});

test("a repeated step still running keeps its line running", () => {
  const [line] = activityLines(
    [
      step("web-1", "Searching the web: desk", "running", "web"),
      step("web-2", "Searching the web: bureau", "complete", "web"),
    ],
    "Lausanne",
    "search",
  );
  assert.equal(line.state, "running");
});

test("without work steps, the request steps make up the activity", () => {
  const read = step("read", "Reading your request", "complete", "request");
  assert.deepEqual(activityLines([read], undefined, "search"), [read]);
});
