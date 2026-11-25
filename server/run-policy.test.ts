import assert from "node:assert/strict";
import test from "node:test";
import { getStepPolicy, reachedStepLimit } from "./run-policy.ts";

type PolicyCase = {
  name: string;
  request?: Parameters<typeof getStepPolicy>[0];
  state?: Partial<Parameters<typeof getStepPolicy>[1]>;
  step?: Partial<Parameters<typeof getStepPolicy>[2]>;
  activeTools: string[];
  choice: ReturnType<typeof getStepPolicy>["toolChoice"];
  thinking?: "enabled" | "disabled";
  effort?: "low";
};

const tools = [
  "inventory_search",
  "show_takeover_listings",
  "web_search",
  "ask_user",
  "get_negotiation",
  "update_negotiation",
];
const cases: PolicyCase[] = [
  {
    name: "ask for the missing budget on the first discovery step",
    request: { text: "desk", context: { budgetSpecified: false } },
    step: { stepNumber: 0 },
    activeTools: ["ask_user"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "search the catalog after the budget is confirmed",
    request: { text: "desk", context: { budgetSpecified: true } },
    step: { stepNumber: 0 },
    activeTools: ["inventory_search"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "curate the catalog after its search",
    state: { inventorySearched: true },
    activeTools: ["show_takeover_listings"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "look up explicit external sources after curating the catalog",
    request: { text: "desk", context: { source: "Ricardo" } },
    state: {
      inventorySearched: true,
      inventoryCurated: true,
      allowWebSearch: true,
    },
    activeTools: ["web_search"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "exclude web search when it is unavailable",
    activeTools: tools.filter((tool) => tool !== "web_search"),
    choice: "auto",
    thinking: "enabled",
    effort: "low",
  },
  {
    name: "keep an unfinished proposal on handover tools and require progress",
    step: { proposal: { status: "draft" } },
    state: { allowWebSearch: true, inventorySearched: true },
    activeTools: ["ask_user", "get_negotiation", "update_negotiation"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "close a prepared or discarded proposal without tools",
    step: { proposalReadyToFinish: true },
    activeTools: [],
    choice: "none",
  },
  {
    name: "offer one clarification for a refinement with no cards",
    state: { inventorySearched: true, inventoryCurated: true },
    step: { refinement: true },
    activeTools: ["ask_user", "finish_search"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "close an empty refinement after one clarification",
    state: { inventorySearched: true, inventoryCurated: true },
    step: { refinement: true, askedQuestion: true },
    activeTools: ["finish_search"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "finish immediately when a refinement has cards and web evidence",
    state: {
      inventorySearched: true,
      inventoryCurated: true,
      allowWebSearch: true,
      webSearched: true,
      displayedInventoryIds: ["chair"],
    },
    step: { refinement: true },
    activeTools: ["finish_search"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "continue listing help after a skipped question without asking it again",
    request: { text: "Skip" },
    state: { firstDraft: true, allowWebSearch: true },
    step: {
      listingMode: true,
      listingAssist: true,
      toolNames: ["ask_user", "web_search", "update_listing"],
    },
    activeTools: ["web_search", "update_listing"],
    choice: "auto",
  },
  {
    name: "give initial price research priority over a listing question",
    state: { firstDraft: true, allowWebSearch: true, listingNeedsInput: true },
    step: { listingMode: true, listingAssist: true },
    activeTools: ["web_search"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "ask for a price when the search has fewer than two sources",
    state: { firstDraft: true, allowWebSearch: true, webSearched: true },
    step: { listingMode: true, listingAssist: true, sourceCount: 1 },
    activeTools: ["ask_user"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "ask for the price decision after suggesting an amount",
    state: { firstDraft: true, proposedPrice: 25 },
    step: { listingMode: true, listingAssist: true },
    activeTools: ["ask_user"],
    choice: "required",
    thinking: "disabled",
  },
  {
    name: "ask for a price on the last ordinary step even without web search",
    state: { firstDraft: true },
    step: { listingMode: true, listingAssist: true, stepNumber: 7 },
    activeTools: ["ask_user"],
    choice: "required",
    thinking: "disabled",
  },
];

for (const example of cases) {
  test(example.name, () => {
    const policy = getStepPolicy(
      example.request ?? { text: "desk" },
      {
        firstDraft: false,
        listingNeedsInput: false,
        allowWebSearch: false,
        inventorySearched: false,
        inventoryCurated: false,
        webSearched: false,
        displayedInventoryIds: [],
        ...example.state,
      },
      {
        listingMode: false,
        listingAssist: false,
        negotiationMode: false,
        refinement: false,
        stepNumber: 1,
        toolNames: tools,
        radiusChanged: false,
        sourceCount: 0,
        askedQuestion: false,
        proposalReadyToFinish: false,
        ...example.step,
      },
    );
    assert.deepEqual(policy.activeTools, example.activeTools);
    assert.equal(policy.toolChoice, example.choice);
    assert.equal(
      policy.providerOptions?.deepseek.thinking.type,
      example.thinking,
    );
    assert.equal(
      policy.providerOptions?.deepseek.reasoningEffort,
      example.effort,
    );
  });
}

test("only a closing proposal can take a ninth step", () => {
  for (const [steps, proposalReady, limitReached] of [
    [7, false, false],
    [8, false, true],
    [8, true, false],
    [9, true, true],
  ] as const) {
    assert.equal(reachedStepLimit(steps, proposalReady), limitReached);
  }
});
