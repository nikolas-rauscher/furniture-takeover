import { parseSearch } from "../shared/marketplace.ts";
import type { Negotiation } from "../shared/negotiation.ts";
import type { AgentRunRequest } from "../shared/runs.ts";
import { buyerWorkflowTools } from "./agent-skills.ts";
import type { AgentToolState } from "./agent-tools.ts";
import { isSkippedAnswer } from "./conversation.ts";
import { marketplaceDomains } from "./marketplace-policy.ts";
import { deepseekThinkingOptions } from "./model-provider.ts";

const MAX_STEPS = 8;
export const MAX_TOOL_CALLS = 12;

/** Only route filter-only turns here. Requests to select or negotiate still need their tools. */
function isSearchRefinement(request: AgentRunRequest) {
  if (
    request.text.length > 500 ||
    !request.context?.currentQuery ||
    !(request.context.previousAnswer || request.context.recentMessages?.length)
  )
    return false;
  const remainder = parseSearch(request.text)
    .query.replace(
      /\b(?:only|items?|search|budget|widen|expand|radius|to|the|cheaper|closer|EPFL|UNIL)\b|[:?]/gi,
      "",
    )
    .trim();
  return (
    !remainder &&
    /\b(?:km|chf|budget|free|takeover|cheaper|closer|under|below)\b/i.test(
      request.text,
    )
  );
}

export function getRunMode(request: AgentRunRequest) {
  const listingAssist = request.context?.intent === "listing_assist";
  const listingMode =
    request.context?.intent === "listing_review" || listingAssist;
  const negotiationMode =
    request.context?.intent === "negotiation" ||
    Boolean(request.context?.negotiation);
  const refinement =
    !listingMode && !negotiationMode && isSearchRefinement(request);
  return { listingMode, listingAssist, negotiationMode, refinement };
}

export type RunMode = ReturnType<typeof getRunMode>;

type StepState = Pick<
  AgentToolState,
  | "allowWebSearch"
  | "firstDraft"
  | "proposedPrice"
  | "listingNeedsInput"
  | "pendingQuestion"
  | "inventorySearched"
  | "inventoryCurated"
  | "webSearched"
  | "displayedInventoryIds"
>;

export function needsPriceDecision(
  request: AgentRunRequest,
  state: Pick<StepState, "firstDraft">,
) {
  return state.firstDraft && request.context?.currentDraft?.price == null;
}

/** A proposal closed on the last step still gets a closing reply. */
export function reachedStepLimit(
  stepsTaken: number,
  proposalReadyToFinish: boolean,
) {
  return stepsTaken >= MAX_STEPS + Number(proposalReadyToFinish);
}

type StepContext = RunMode & {
  stepNumber: number;
  toolNames: string[];
  radiusChanged: boolean;
  sourceCount: number;
  askedQuestion: boolean;
  proposal?: Pick<Negotiation, "status" | "draft">;
  proposalReadyToFinish: boolean;
};

type StepPolicy = {
  activeTools: string[];
  toolChoice: "none" | "auto" | "required";
  providerOptions?: ReturnType<typeof deepseekThinkingOptions>;
};

function requiredSearchTool(
  request: AgentRunRequest,
  state: StepState,
  step: StepContext,
): string | undefined {
  const { context } = request;
  const {
    listingMode,
    negotiationMode,
    stepNumber,
    proposal,
    refinement,
    radiusChanged,
  } = step;
  const discovery = !listingMode && !negotiationMode;
  const needsBudget =
    discovery &&
    stepNumber === 0 &&
    context?.budgetSpecified === false &&
    !context.previousQuestion &&
    !context.previousAnswer;

  if (needsBudget || (state.listingNeedsInput && !state.pendingQuestion))
    return "ask_user";
  if (!discovery || proposal || state.pendingQuestion) return;
  if (
    !state.inventorySearched &&
    (refinement ||
      radiusChanged ||
      (!context?.previousAnswer && !context?.recentMessages?.length)) &&
    (refinement || context?.budgetSpecified !== undefined)
  )
    return "inventory_search";
  if (state.inventorySearched && !state.inventoryCurated && stepNumber > 0)
    return "show_takeover_listings";
}

function requiredPriceTool(
  state: StepState,
  { stepNumber, sourceCount }: StepContext,
): string | undefined {
  if (state.allowWebSearch && !state.webSearched) return "web_search";
  if (
    state.proposedPrice !== undefined ||
    stepNumber === MAX_STEPS - 1 ||
    (state.webSearched && sourceCount < 2)
  )
    return "ask_user";
}

function needsExternalLookup(
  request: AgentRunRequest,
  state: StepState,
  step: StepContext,
) {
  return (
    !step.listingMode &&
    !step.negotiationMode &&
    !step.proposal &&
    !state.pendingQuestion &&
    state.inventoryCurated &&
    state.allowWebSearch &&
    !state.webSearched &&
    (step.refinement ||
      (request.context?.source &&
        marketplaceDomains(request.context.source)?.length))
  );
}

export function getStepPolicy(
  request: AgentRunRequest,
  state: StepState,
  step: StepContext,
): StepPolicy {
  const {
    listingMode,
    listingAssist,
    refinement,
    toolNames,
    proposal,
    stepNumber,
  } = step;
  const allowedListingTools = () =>
    toolNames.filter((name) => name !== "web_search" || state.allowWebSearch);
  // Skipping means continue without rephrasing the same question.
  if (listingAssist && isSkippedAnswer(request.text))
    return {
      activeTools: allowedListingTools().filter((name) => name !== "ask_user"),
      toolChoice: "auto",
    };
  if (step.proposalReadyToFinish)
    return { activeTools: [], toolChoice: "none" };
  if (
    refinement &&
    state.inventoryCurated &&
    (!state.allowWebSearch || state.webSearched)
  ) {
    const canAsk = !state.displayedInventoryIds.length && !step.askedQuestion;
    return {
      activeTools: canAsk ? ["ask_user", "finish_search"] : ["finish_search"],
      toolChoice: "required",
      providerOptions: deepseekThinkingOptions(false),
    };
  }

  const awaitingPrice = needsPriceDecision(request, state);
  const requiredTool =
    (awaitingPrice ? requiredPriceTool(state, step) : undefined) ??
    requiredSearchTool(request, state, step) ??
    (needsExternalLookup(request, state, step) ? "web_search" : undefined);
  const requiresTool = Boolean(
    requiredTool ||
    awaitingPrice ||
    (proposal?.status === "draft" && !proposal.draft) ||
    (stepNumber === 0 && (!listingMode || listingAssist)),
  );
  // DeepSeek cannot combine thinking with forced tool selection.
  return {
    activeTools: requiredTool
      ? [requiredTool]
      : listingMode
        ? allowedListingTools()
        : buyerWorkflowTools(
            toolNames,
            Boolean(proposal),
            state.allowWebSearch,
          ),
    toolChoice: requiresTool ? "required" : "auto",
    providerOptions: deepseekThinkingOptions(!requiresTool),
  };
}
