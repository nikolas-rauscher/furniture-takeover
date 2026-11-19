import test from "node:test";
import assert from "node:assert/strict";
import type { AgentRunStep } from "./hooks/useAgentRun.ts";
import type { AgentTaskKind } from "../shared/runs.ts";
import {
  agentTurnPako,
  foundNothing,
  homeGuide,
  isReaction,
  settledSteps,
  showedResults,
  stepsSummary,
  stepWords,
  turnAnnouncement,
  workingLine,
} from "./pakoMoods.ts";
import {
  photoSearchClarification,
  photoSearchFailure,
} from "./photoSearchFeedback.ts";

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
  questions: [],
  answers: {},
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

const guide = (overrides: Partial<Parameters<typeof homeGuide>[0]>) =>
  homeGuide({
    allowanceUsed: false,
    photo: null,
    unreadMatches: 0,
    suggestionsLoading: false,
    typing: false,
    location: "EPFL, Ecublens",
    ...overrides,
  });

test("the home guide sleeps once the allowance is used, thinks while suggestions load and listens while typing", () => {
  assert.deepEqual(guide({}), {
    mood: "wave",
    line: "Tell me what you need. I'll search around EPFL, Ecublens.",
    newMatches: false,
  });
  assert.equal(guide({ typing: true }).mood, "listen");
  assert.equal(guide({ typing: true, suggestionsLoading: true }).mood, "think");
  assert.deepEqual(guide({ allowanceUsed: true, typing: true }), {
    mood: "sleep",
    line: "I'm out of searches for today. See you tomorrow!",
    newMatches: false,
  });
});

test("new matches lead the home guide's line while his mood follows the search box", () => {
  assert.deepEqual(guide({ unreadMatches: 2 }), {
    mood: "happy",
    line: "I found 2 new matches for your saved searches.",
    newMatches: true,
  });
  assert.equal(
    guide({ unreadMatches: 1 }).line,
    "I found a new match for your saved searches.",
  );
  assert.deepEqual(guide({ unreadMatches: 2, typing: true }), {
    mood: "listen",
    line: "I found 2 new matches for your saved searches.",
    newMatches: true,
  });
  assert.equal(
    guide({ unreadMatches: 2, allowanceUsed: true }).newMatches,
    false,
    "a sleeping Pako has no news",
  );
});

test("a photo search speaks first on home: Pako listens to a drag, looks at the photo, then says what he needs", () => {
  assert.deepEqual(guide({ photo: "dragging", unreadMatches: 2 }), {
    mood: "listen",
    line: "Drop your photo here. I'll find similar things.",
    newMatches: false,
  });
  assert.deepEqual(guide({ photo: "reading", typing: true }), {
    mood: "search",
    line: "Let me look at your photo…",
    newMatches: false,
  });
  assert.deepEqual(guide({ photo: photoSearchClarification() }), {
    mood: "think",
    line: photoSearchClarification().line,
    newMatches: false,
  });
  assert.equal(
    guide({ photo: photoSearchFailure(new Error("Choose a photo of 25 MB or less.")) })
      .line,
    "Choose a photo of 25 MB or less.",
  );
  assert.equal(guide({ photo: "reading", allowanceUsed: true }).mood, "sleep");
});

test("Pako's working line reads the request, names the latest search in the intro's words and then writes", () => {
  const line = (steps: AgentRunStep[], text = "") =>
    workingLine({ steps, text, sources: [] }, "Vortex");
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
    workingLine({ steps: [reading, listings], text: "", sources: [] }),
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

test("a turn found nothing only after searching, and showed results once it ended with some", () => {
  const searched = [reading, step("inventory", "complete", "listings")];
  const facts = (overrides: Partial<Parameters<typeof agentTurnPako>[0]>) =>
    turn({ status: "complete", steps: searched, ...overrides });
  assert.equal(foundNothing(facts({ inventoryMatchIds: [] })), true);
  assert.equal(foundNothing(facts({ inventoryMatchIds: ["desk-1"] })), false);
  assert.equal(
    foundNothing(facts({ steps: [catalogChecked, reading] })),
    false,
    "answering without a search is not an empty search",
  );
  assert.equal(showedResults(facts({ inventoryMatchIds: ["desk-1"] })), true);
  assert.equal(
    showedResults(
      facts({
        sources: [
          {
            id: "web-1",
            title: "Desk",
            url: "https://example.com",
            snippet: "",
          },
        ],
      }),
    ),
    true,
  );
  assert.equal(showedResults(facts({ inventoryMatchIds: [] })), false);
  assert.equal(
    showedResults(turn({ inventoryMatchIds: ["desk-1"] })),
    false,
    "results only count once the turn has ended",
  );
});

test("a turn is announced step by step while Pako works, then once with his answer", () => {
  const announced = (
    overrides: Partial<Parameters<typeof turnAnnouncement>[0]>,
  ) =>
    turnAnnouncement(
      {
        id: "run-1",
        status: "complete",
        steps: [],
        text: "",
        sources: [],
        questions: [],
        answers: {},
        ...overrides,
      },
      "EPFL",
    );
  assert.equal(
    announced({ status: "running", steps: [reading] }),
    "Reading your request…",
  );
  assert.equal(
    announced({ text: "Two desks fit [web-1]." }),
    "Pako: Two desks fit.",
  );
  const question = {
    type: "question" as const,
    id: "q1",
    question: "Is a 27-inch monitor wide enough?",
  };
  assert.equal(
    announced({ text: question.question, questions: [question] }),
    "Pako: Is a 27-inch monitor wide enough?",
    "a question that is the whole answer is said once",
  );
  assert.equal(
    announced({ text: "I found two desks.", questions: [question] }),
    "Pako: I found two desks. Is a 27-inch monitor wide enough?",
  );
  assert.equal(
    announced({ text: "Okay.", questions: [question], answers: { q1: "Yes" } }),
    "Pako: Okay.",
    "an answered question is not asked again",
  );
  assert.equal(
    announced({ status: "error" }),
    "",
    "its alert says what failed",
  );
  assert.equal(announced({ status: "idle" }), "Pako stopped.");
  assert.equal(announced({ status: "idle", id: null }), "");
});

test("Pako listens while his question waits for an answer", () => {
  const question = {
    type: "question" as const,
    id: "q1",
    question: "Is a 27-inch monitor wide enough?",
  };
  const asked = turn({
    status: "complete",
    steps: [reading, step("ask", "complete", "request")],
    text: question.question,
    questions: [question],
  });
  assert.deepEqual(
    agentTurnPako(asked, { textShown: asked.text, typing: false }),
    {
      mood: "listen",
      talking: false,
    },
  );
  const answered = { ...asked, answers: { q1: "Yes" } };
  assert.notEqual(
    agentTurnPako(answered, { textShown: asked.text, typing: false }).mood,
    "listen",
  );
});

test("the activity list names each step in the intro's words, without raw queries", () => {
  assert.equal(stepWords(catalogChecked, "EPFL"), "Checking student listings");
  assert.equal(
    stepWords(
      step(
        "inventory",
        "complete",
        "listings",
        "Searching takeover listings: desk",
      ),
      "EPFL",
    ),
    "Searching student listings near EPFL",
  );
  assert.equal(
    stepWords(
      step("web", "complete", "web", "Searching the web: bureau d'occasion"),
    ),
    "Checking other second-hand sites",
  );
  assert.equal(
    stepWords(step("draft", "running", "proposal", "Preparing your draft")),
    "Preparing your draft",
  );
  assert.equal(
    stepWords(
      step("watch", "complete", "listings", "Offering to watch for this item"),
    ),
    "Offering to keep watch",
  );
});

const comparable = (id: string) => ({
  id,
  title: "Desk",
  url: "https://www.ricardo.ch/de/a/desk",
  snippet: "Asking CHF 40.",
});

test("a listing turn says what Pako does in the server's plain words, with the offers he compares", () => {
  const line = (
    steps: AgentRunStep[],
    { text = "", offers = 0 }: { text?: string; offers?: number } = {},
  ) =>
    workingLine(
      {
        steps,
        text,
        sources: Array.from({ length: offers }, (_, index) =>
          comparable(`web-${index + 1}`),
        ),
      },
      undefined,
      "listing",
    );
  const readingDetails = step(
    "step-0",
    "running",
    undefined,
    "Reading your listing details",
  );
  const research = step(
    "web",
    "running",
    "web",
    "Checking comparable prices online",
  );
  assert.equal(line([]), "Reading your photos and notes…");
  assert.equal(line([readingDetails]), "Reading your listing details…");
  assert.equal(
    line([readingDetails, research]),
    "Checking comparable prices online…",
  );
  const researched = [
    { ...readingDetails, state: "complete" as const },
    { ...research, state: "complete" as const },
    step("step-1", "running", undefined, "Writing your listing"),
  ];
  assert.equal(line(researched, { offers: 3 }), "Comparing 3 offers…");
  assert.equal(
    line(researched),
    "Writing your listing…",
    "without offers there is nothing to compare",
  );
  assert.equal(
    line([
      ...researched,
      step("price", "running", "listing", "Suggesting a price"),
    ]),
    "Suggesting a price…",
  );
  assert.equal(
    line(researched, { text: "Desks like this ask", offers: 3 }),
    "Writing my answer…",
  );
  assert.equal(
    turnAnnouncement(
      {
        id: "run-1",
        status: "running",
        steps: [readingDetails],
        text: "",
        sources: [],
        questions: [],
        answers: {},
      },
      undefined,
      "listing",
    ),
    "Reading your listing details…",
  );
});

test("listing steps name what they looked at, while search steps keep the intro's words", () => {
  const research = {
    ...step("web", "complete", "web", "Checking comparable prices online"),
    detail: "IKEA desk 120×60",
  };
  assert.equal(
    stepWords(research, undefined, "listing"),
    "Checking comparable prices online · IKEA desk 120×60",
  );
  assert.equal(
    stepWords(
      step("price", "complete", "listing", "Suggesting a price"),
      undefined,
      "listing",
    ),
    "Suggesting a price",
  );
  assert.equal(stepWords(research), "Checking other second-hand sites");
});

test("a step the agent corrected itself disappears once the same step completed", () => {
  const rejected = step(
    "price-1",
    "needs_input",
    "listing",
    "Suggesting a price",
  );
  const accepted = step("price-2", "complete", "listing", "Suggesting a price");
  const unanswered = step(
    "update",
    "needs_input",
    "listing",
    "Filling in your listing",
  );
  assert.deepEqual(settledSteps([rejected, accepted]), [accepted]);
  assert.deepEqual(settledSteps([rejected]), [rejected]);
  assert.deepEqual(
    settledSteps([unanswered, accepted]),
    [unanswered, accepted],
    "a different step does not heal it",
  );
});

test("a finished listing turn sums up the offers it compared, other turns their steps", () => {
  assert.equal(stepsSummary(4, 3, "listing"), "Compared 3 offers");
  assert.equal(stepsSummary(4, 1, "listing"), "Compared 1 offer");
  assert.equal(stepsSummary(2, 0, "listing"), "2 steps");
  assert.equal(stepsSummary(4, 3, "search"), "4 steps");
  assert.equal(stepsSummary(1, 0, "search"), "1 step");
});
