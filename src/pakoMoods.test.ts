import test from "node:test";
import assert from "node:assert/strict";
import type { AgentRunStep } from "./hooks/useAgentRun.ts";
import type { AgentTaskKind } from "../shared/runs.ts";
import {
  agentTurnPako,
  homeGuide,
  isReaction,
  workingLine,
} from "./pakoMoods.ts";

const step = (
  id: string,
  state: AgentRunStep["state"],
  task?: AgentTaskKind,
  label = id,
): AgentRunStep => ({
  type: "status",
  id,
  label,
  state,
  ...(task ? { task } : {}),
});

/** The server checks the catalog before the agent starts reading the request. */
const catalogChecked = step("takeover-catalog", "complete", "listings");
const reading = step("step-0", "running");

const turn = (
  overrides: Partial<Parameters<typeof agentTurnPako>[0]> = {},
) => ({
  status: "running" as const,
  steps: [],
  text: "",
  inventoryMatchIds: null,
  sources: [],
  ...overrides,
});
const quiet = { textShown: "", typing: false };

test("Pako thinks until the agent reaches for a tool of its own", () => {
  assert.deepEqual(agentTurnPako(turn(), quiet), {
    mood: "think",
    talking: false,
  });
  assert.equal(
    agentTurnPako(turn({ steps: [catalogChecked, reading] }), quiet).mood,
    "think",
  );
  assert.equal(
    agentTurnPako(
      turn({ steps: [step("takeover-catalog", "running", "listings")] }),
      quiet,
    ).mood,
    "think",
  );
});

test("Pako keeps the mood of the latest tool while the agent reviews its results", () => {
  const searching = [
    catalogChecked,
    reading,
    step("inventory", "running", "listings"),
  ];
  assert.equal(agentTurnPako(turn({ steps: searching }), quiet).mood, "search");
  const reviewing = [
    catalogChecked,
    step("step-0", "complete"),
    step("inventory", "complete", "listings"),
    step("step-1", "running"),
  ];
  assert.equal(agentTurnPako(turn({ steps: reviewing }), quiet).mood, "search");
  assert.equal(
    agentTurnPako(
      turn({ steps: [...reviewing, step("patch", "running", "listing")] }),
      quiet,
    ).mood,
    "work",
  );
  assert.equal(
    agentTurnPako(
      turn({ steps: [reading, step("ask", "running", "request")] }),
      quiet,
    ).mood,
    "think",
  );
});

test("Pako talks while the answer streams in and until it is fully shown", () => {
  const writing = turn({
    steps: [reading, step("inventory", "complete", "listings")],
    text: "Two desks",
  });
  assert.deepEqual(agentTurnPako(writing, quiet), {
    mood: "idle",
    talking: true,
  });
  assert.deepEqual(
    agentTurnPako(
      { ...writing, steps: [...writing.steps, step("web", "running", "web")] },
      quiet,
    ),
    { mood: "search", talking: false },
  );
  const answered = turn({ ...writing, status: "complete", text: "Two desks." });
  assert.equal(
    agentTurnPako(answered, { textShown: "Two", typing: false }).talking,
    true,
  );
  assert.equal(
    agentTurnPako(answered, { textShown: "Two desks.", typing: false }).talking,
    false,
  );
});

test("Pako is happy about results, sad about an empty search and dizzy after an error", () => {
  const searched = [reading, step("inventory", "complete", "listings")];
  const ended = (overrides: Partial<Parameters<typeof agentTurnPako>[0]>) =>
    agentTurnPako(
      turn({ status: "complete", steps: searched, ...overrides }),
      quiet,
    ).mood;
  assert.equal(ended({ inventoryMatchIds: ["desk-1"] }), "happy");
  assert.equal(
    ended({
      inventoryMatchIds: [],
      sources: [
        { id: "web-1", title: "Desk", url: "https://example.com", snippet: "" },
      ],
    }),
    "happy",
  );
  assert.equal(ended({ inventoryMatchIds: [] }), "sad");
  assert.equal(ended({ inventoryMatchIds: null }), "sad");
  assert.equal(
    ended({
      steps: [catalogChecked, reading, step("draft", "complete", "proposal")],
    }),
    "happy",
    "an offer draft is not an empty search, even after the catalog check",
  );
  assert.equal(
    agentTurnPako(turn({ status: "error", steps: searched }), quiet).mood,
    "dizzy",
  );
  assert.equal(agentTurnPako(turn({ status: "idle" }), quiet).mood, "idle");
});

test("once a turn has ended, Pako listens while a follow-up is typed", () => {
  const typing = { textShown: "", typing: true };
  assert.equal(
    agentTurnPako(turn({ status: "complete" }), typing).mood,
    "listen",
  );
  assert.equal(agentTurnPako(turn({ status: "error" }), typing).mood, "listen");
  assert.equal(agentTurnPako(turn(), typing).mood, "think");
});

test("only reactions to a moment pass; states last as long as their cause", () => {
  assert.deepEqual((["happy", "sad", "dizzy"] as const).map(isReaction), [
    true,
    true,
    true,
  ]);
  assert.deepEqual(
    (
      ["idle", "wave", "listen", "think", "search", "work", "sleep"] as const
    ).map(isReaction),
    [false, false, false, false, false, false, false],
  );
});

test("the home guide sleeps once the allowance is used, thinks while suggestions load and listens while typing", () => {
  const guide = (overrides: Partial<Parameters<typeof homeGuide>[0]>) =>
    homeGuide({
      allowanceUsed: false,
      suggestionsLoading: false,
      typing: false,
      location: "EPFL, Ecublens",
      ...overrides,
    });
  assert.deepEqual(guide({}), {
    mood: "wave",
    line: "Tell me what you need. I'll search around EPFL, Ecublens.",
  });
  assert.equal(guide({ typing: true }).mood, "listen");
  assert.equal(guide({ typing: true, suggestionsLoading: true }).mood, "think");
  assert.deepEqual(guide({ allowanceUsed: true, typing: true }), {
    mood: "sleep",
    line: "I'm out of searches for today. See you tomorrow!",
  });
});

test("Pako's working line reads the request, names the latest search in the intro's words and then writes", () => {
  const line = (steps: AgentRunStep[], text = "") =>
    workingLine({ steps, text }, "Vortex");
  assert.equal(line([]), "Reading your request…");
  assert.equal(
    line([catalogChecked, reading]),
    "Reading your request…",
    "the server's catalog check is not a step the agent chose",
  );
  const listings = step(
    "inventory",
    "running",
    "listings",
    "Searching takeover listings: desk",
  );
  assert.equal(
    line([catalogChecked, reading, listings]),
    "Searching student listings near Vortex…",
  );
  assert.equal(
    workingLine({ steps: [reading, listings], text: "" }),
    "Searching student listings…",
  );
  const reviewing = [
    catalogChecked,
    step("step-0", "complete"),
    { ...listings, state: "complete" as const },
    step("step-1", "running"),
  ];
  assert.equal(
    line(reviewing),
    "Searching student listings near Vortex…",
    "the line stays with the latest tool while the agent reviews it, like his mood",
  );
  assert.equal(
    line([
      ...reviewing,
      step("pick", "complete", "listings", "Selecting takeover matches"),
    ]),
    "Picking the best matches…",
  );
  const web = step(
    "web",
    "running",
    "web",
    "Searching the web: bureau Lausanne",
  );
  assert.equal(line([...reviewing, web]), "Checking other second-hand sites…");
  assert.equal(
    line([
      ...reviewing,
      step("draft", "running", "proposal", "Preparing your draft"),
    ]),
    "Preparing your draft…",
  );
  assert.equal(line(reviewing, "Two desks"), "Writing my answer…");
  assert.equal(
    line([...reviewing, web], "Two desks"),
    "Checking other second-hand sites…",
    "a search started after the first words still names the search",
  );
});
