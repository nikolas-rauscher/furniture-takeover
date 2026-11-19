import test from "node:test";
import assert from "node:assert/strict";
import {
  TODAY,
  defaults,
  extractSearchConstraints,
  type Criteria,
} from "../shared/marketplace.ts";
import { newNegotiation } from "../shared/negotiation.ts";
import type { AgentRunStep } from "./hooks/useAgentRun.ts";
import {
  quickReplies,
  usesAllowance,
  type QuickRepliesInput,
  type ShownListing,
} from "./quickReplies.ts";
import { newSearch } from "./searchRequest.ts";

/** A Thursday: this weekend ends on Sunday 22 November. */
const THURSDAY = "2026-11-19";
const searched: AgentRunStep[] = [
  {
    type: "status",
    id: "step-0",
    label: "Reading your request",
    state: "complete",
  },
  {
    type: "status",
    id: "inventory",
    label: "Searching takeover listings: desk",
    state: "complete",
    task: "listings",
  },
];
const webResult = {
  id: "web-1",
  title: "Bureau",
  url: "https://example.com/desk",
  snippet: "",
};

const listing = (
  id: string,
  title: string,
  overrides: Partial<ShownListing> = {},
): ShownListing => ({ id, title, price: 40, offerable: true, ...overrides });
const twoDesks = [
  listing("desk-1", "Compact study desk"),
  listing("desk-2", "White work desk", { price: 65 }),
];

const search = (
  criteria: Partial<Criteria> = {},
  request = "A desk under CHF 80",
) => ({
  text: request,
  originalRequest: request,
  criteria: {
    ...defaults,
    query: "desk",
    maxPrice: 80,
    radius: 5,
    ...criteria,
  },
  intent: "search" as const,
});
const finished = (
  overrides: Partial<QuickRepliesInput["turn"]> = {},
): QuickRepliesInput["turn"] => ({
  status: "complete",
  steps: searched,
  inventoryMatchIds: ["desk-1", "desk-2"],
  sources: [],
  questions: [],
  answers: {},
  ...overrides,
});
const emptySearch = finished({ inventoryMatchIds: [], sources: [] });

const replies = (overrides: Partial<QuickRepliesInput> = {}) =>
  quickReplies({
    turn: finished(),
    latest: true,
    search: search(),
    negotiating: false,
    watching: false,
    listings: twoDesks,
    today: THURSDAY,
    ...overrides,
  });
const texts = (overrides: Partial<QuickRepliesInput> = {}) =>
  replies(overrides).replies.map((reply) => reply.text);
const none = { line: null, replies: [] };

test("after results, Pako offers the best match, a comparison and narrower searches, four at most", () => {
  assert.deepEqual(replies(), {
    line: null,
    replies: [
      {
        kind: "offer",
        listingId: "desk-1",
        text: "Draft an offer for Compact study desk",
      },
      {
        kind: "compare",
        listingIds: ["desk-1", "desk-2"],
        text: "Compare the top two",
      },
      { kind: "ask", text: "Cheaper: under CHF 60" },
      { kind: "ask", text: "Closer: within 2 km" },
    ],
  });
});

test("with only web results, the replies widen the search instead of narrowing it", () => {
  assert.deepEqual(
    texts({
      turn: finished({ inventoryMatchIds: [], sources: [webResult] }),
      listings: [],
    }),
    ["Raise my budget to CHF 105", "Search within 10 km"],
  );
});

test("a reply appears only while its criterion can still narrow the search", () => {
  const narrower = (criteria: Partial<Criteria>, request?: string) =>
    texts({ listings: [], search: search(criteria, request) });
  assert.deepEqual(
    narrower({ maxPrice: 500 }, "A desk"),
    ["Closer: within 2 km", "Free items only (CHF 0)", "Collect by Sunday"],
    "the app's default ceiling is not a budget the student chose",
  );
  assert.equal(
    narrower({ maxPrice: 500 }, "A desk under CHF 500")[0],
    "Cheaper: under CHF 370",
  );
  assert.deepEqual(narrower({ maxPrice: 1_000_000 }, "A desk, any budget"), [
    "Closer: within 2 km",
    "Free items only (CHF 0)",
    "Collect by Sunday",
  ]);
  assert.deepEqual(
    narrower({ maxPrice: 0, radius: 1, pickup: "2026-11-21" }),
    [],
    "free, within a kilometre and ready on Saturday cannot get narrower",
  );
  assert.equal(narrower({ pickup: "2026-11-24" }).at(-1), "Collect by Sunday");
});

test("budgets and distances shrink and grow to amounts students say", () => {
  const cheaper = (maxPrice: number) =>
    texts({ listings: [], search: search({ maxPrice }) })[0];
  assert.equal(cheaper(100), "Cheaper: under CHF 75");
  assert.equal(cheaper(50), "Cheaper: under CHF 35");
  assert.equal(cheaper(10), "Cheaper: under CHF 7");
  assert.equal(cheaper(1000), "Cheaper: under CHF 750");
  const broader = (criteria: Partial<Criteria>) =>
    texts({ turn: emptySearch, listings: [], search: search(criteria) });
  assert.deepEqual(broader({ maxPrice: 100, radius: 7.5 }), [
    "Raise my budget to CHF 130",
    "Search within 15 km",
  ]);
  assert.deepEqual(broader({ maxPrice: 1000, radius: 300 }), [
    "Raise my budget to CHF 1300",
    "Search within 500 km",
  ]);
  assert.equal(
    texts({ listings: [], search: search({ radius: 20 }) })[1],
    "Closer: within 10 km",
  );
});

test("only someone else's active best match gets an offer, a free one a pickup plan, and one listing no comparison", () => {
  assert.deepEqual(
    texts({
      listings: [
        listing("desk-1", "Compact study desk", { offerable: false }),
        twoDesks[1],
      ],
    }).slice(0, 2),
    ["Compare the top two", "Cheaper: under CHF 60"],
  );
  assert.equal(
    texts({ listings: [listing("lamp-1", "Desk lamp", { price: 0 })] })[0],
    "Plan pickup for Desk lamp",
  );
  assert.deepEqual(texts({ listings: [twoDesks[0]] }).slice(0, 2), [
    "Draft an offer for Compact study desk",
    "Cheaper: under CHF 60",
  ]);
});

test("after an empty search, Pako says one friendly line and offers up to three broader searches", () => {
  const result = replies({
    turn: emptySearch,
    listings: [],
    search: search({ source: "takeover", pickup: "2026-11-22" }),
  });
  assert.equal(
    result.line,
    "Nothing turned up this time. Shall I look a little wider?",
  );
  assert.deepEqual(
    result.replies.map((reply) => reply.text),
    ["Raise my budget to CHF 105", "Search within 10 km", "Search all sources"],
  );
  assert.deepEqual(
    texts({
      turn: emptySearch,
      listings: [],
      search: search({ maxPrice: 0, pickup: "2026-11-22" }),
    }),
    ["Search within 10 km", "Any pickup date"],
    "a free search has no budget to raise",
  );
  assert.deepEqual(
    replies({
      turn: emptySearch,
      listings: [],
      search: search({ maxPrice: 1_000_000, radius: 500 }),
    }),
    none,
    "with nothing left to widen, Pako offers nothing",
  );
});

test("replies wait for the newest finished turn and leave questions and offer drafts alone", () => {
  for (const status of ["running", "error", "idle"] as const)
    assert.deepEqual(replies({ turn: finished({ status }) }), none, status);
  assert.deepEqual(replies({ latest: false }), none);
  const question = {
    type: "question" as const,
    id: "size",
    question: "Which size?",
    choices: ["Small", "Large"],
  };
  assert.deepEqual(
    replies({ turn: finished({ questions: [question] }) }),
    none,
  );
  assert.equal(
    replies({
      turn: finished({ questions: [question], answers: { size: "Small" } }),
    }).replies.length,
    4,
  );
  assert.deepEqual(replies({ negotiating: true }), none);
  assert.deepEqual(
    replies({
      turn: finished({ proposal: newNegotiation("offer-1", "desk-1") }),
    }),
    none,
  );
  assert.deepEqual(replies({ search: null }), none);
  assert.deepEqual(
    replies({ search: { ...search(), intent: "listing_review" } }),
    none,
  );
});

test("each typed reply changes the search just as the follow-up path reads it", () => {
  const previous = newSearch(
    "A desk under CHF 80, only my listings",
    { ...defaults, radius: 5 },
    "EPFL, Ecublens",
  );
  const expected: Record<string, Partial<Criteria>> = {
    "Cheaper: under CHF 60": { maxPrice: 60 },
    "Closer: within 2 km": { radius: 2 },
    "Free items only (CHF 0)": { maxPrice: 0 },
    "Collect by Sunday": {
      pickup: extractSearchConstraints("this weekend").pickup,
    },
    "Raise my budget to CHF 105": { maxPrice: 105 },
    "Search within 10 km": { radius: 10 },
    "Search all sources": { source: "All" },
    "Any pickup date": { pickup: "" },
  };
  const scenarios = [
    { turn: finished(), criteria: previous.criteria },
    { turn: emptySearch, criteria: previous.criteria },
    {
      turn: emptySearch,
      criteria: { ...previous.criteria, source: "All", pickup: TODAY },
    },
  ];
  const offered = new Set<string>();
  for (const { turn, criteria } of scenarios) {
    const current = { ...previous, criteria };
    for (const { text } of replies({
      turn,
      search: current,
      listings: [],
      today: TODAY,
    }).replies) {
      offered.add(text);
      const followUp = newSearch(
        text,
        criteria,
        current.location,
        current,
        "Two desks.",
      );
      assert.deepEqual(
        followUp.criteria,
        { ...criteria, ...expected[text] },
        text,
      );
    }
  }
  assert.deepEqual([...offered].sort(), Object.keys(expected).sort());
});

test("only the comparison works without Pako's daily allowance", () => {
  assert.deepEqual(replies().replies.map(usesAllowance), [
    true,
    false,
    true,
    true,
  ]);
});

const watchFor = { query: "green armchair", maxPrice: 120 };

test("when nothing fits yet, keeping watch comes first, ahead of two broader searches", () => {
  assert.deepEqual(
    replies({
      turn: { ...emptySearch, watchSuggestion: watchFor },
      listings: [],
    }),
    {
      line: "Nothing yet. Shall I keep an eye out for you, or look a little wider?",
      replies: [
        {
          kind: "watch",
          text: "Tell me when one is listed",
          query: "green armchair",
          maxPrice: 120,
          radius: 5,
        },
        { kind: "ask", text: "Raise my budget to CHF 105" },
        { kind: "ask", text: "Search within 10 km" },
      ],
    },
  );
});

test("with only web results, the watch reply asks about new student listings", () => {
  assert.deepEqual(
    texts({
      turn: finished({
        inventoryMatchIds: [],
        sources: [webResult],
        watchSuggestion: { query: "desk" },
      }),
      listings: [],
    }),
    [
      "Tell me about new student listings",
      "Raise my budget to CHF 105",
      "Search within 10 km",
    ],
  );
});

test("once the watch is on, its reply turns into a confirmation", () => {
  const result = replies({
    turn: { ...emptySearch, watchSuggestion: watchFor },
    listings: [],
    watching: true,
  });
  assert.equal(result.line, "Nothing yet, but I'm keeping an eye out for you.");
  assert.deepEqual(result.replies[0], {
    kind: "watching",
    text: "Watching for “green armchair”",
  });
});

test("keeping watch needs no daily allowance", () => {
  const [watch, broader] = replies({
    turn: { ...emptySearch, watchSuggestion: watchFor },
    listings: [],
  }).replies;
  assert.equal(usesAllowance(watch), false);
  assert.equal(usesAllowance(broader), true);
});
