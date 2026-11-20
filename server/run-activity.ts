import type { ToolLoopAgentSettings, ToolSet } from "ai";
import type { AgentTaskKind, AgentToolFailure } from "../shared/runs.ts";
import { ActionRejection } from "./action-evidence.ts";
import { RunError } from "./errors.ts";
import type { createRunStream } from "./run-stream.ts";
import { WebSearchError } from "./web-search.ts";

const toolActivity: Record<string, { label: string; task: AgentTaskKind }> = {
  web_search: { label: "Searching the web", task: "web" },
  inventory_search: { label: "Searching takeover listings", task: "listings" },
  show_takeover_listings: {
    label: "Selecting takeover matches",
    task: "listings",
  },
  finish_search: { label: "Summarizing your matches", task: "request" },
  suggest_takeover_offer: { label: "Suggesting an offer", task: "listings" },
  suggest_watch: {
    label: "Offering to watch for this item",
    task: "listings",
  },
  get_listing: { label: "Checking listing details", task: "listings" },
  get_negotiation: { label: "Reading your proposal", task: "proposal" },
  select_listing: { label: "Starting your proposal", task: "proposal" },
  update_negotiation: { label: "Updating your proposal", task: "proposal" },
  prepare_offer_draft: { label: "Preparing your draft", task: "proposal" },
  discard_offer_draft: { label: "Discarding your draft", task: "proposal" },
  ask_user: { label: "Asking a question", task: "request" },
  propose_price: { label: "Suggesting a price", task: "listing" },
  update_listing: { label: "Filling in your listing", task: "listing" },
  update_search_preferences: {
    label: "Updating search preferences",
    task: "request",
  },
};
const toolLabel = (name: string) => toolActivity[name]?.label ?? "Using a tool";
const negotiationToolNames = new Set([
  "get_listing",
  "get_negotiation",
  "select_listing",
  "update_negotiation",
  "prepare_offer_draft",
  "discard_offer_draft",
]);

/** Translate known proposal validation failures; never forward arbitrary tool errors. */
const negotiationToolFailure = (
  name: string,
  error: unknown,
): AgentToolFailure | undefined => {
  if (!negotiationToolNames.has(name)) return;
  const message = error instanceof Error ? error.message : "";
  if (message === "The offered amount must appear in the buyer quote.")
    return {
      code: "PROPOSAL_AMOUNT_UNCONFIRMED",
      message:
        "Confirm the CHF amount you want to offer before adding it to your proposal.",
      retryable: true,
    };
  if (
    message ===
      "Only the buyer can set the offer amount, note or clear a proposal." ||
    /^Use an exact (buyer|listing) quote for (amount|fulfillment|pickupTime|pickupPoint|note)\.$/.test(
      message,
    ) ||
    /^Copy the supplied wording for (pickupTime|pickupPoint|note)\.$/.test(
      message,
    ) ||
    message === "The quote must support the handover choice."
  )
    return {
      code: "PROPOSAL_DETAIL_UNCONFIRMED",
      message:
        "That change needs a confirmed detail from you or the listing. Confirm what you want to add or change.",
      retryable: true,
    };
  if (
    message ===
    "This draft changed. Read the current version before updating it."
  )
    return {
      code: "PROPOSAL_CHANGED",
      message: "Your proposal changed. Try again using its latest draft.",
      retryable: true,
    };
  if (
    message ===
    "This Takeover listing is no longer available. Search for an active listing."
  )
    return {
      code: "PROPOSAL_LISTING_UNAVAILABLE",
      message:
        "This listing is no longer available. Choose another active Takeover listing.",
      retryable: false,
    };
  if (
    message === "Select a Takeover listing first." ||
    message ===
      "This proposal is closed. Select the listing to start a new draft."
  )
    return {
      code: "PROPOSAL_SELECTION_REQUIRED",
      message: "Select a Takeover listing to start a new proposal.",
      retryable: false,
    };
  return {
    code: "PROPOSAL_STEP_FAILED",
    message:
      "That proposal step could not finish. Try again using the current draft.",
    retryable: true,
  };
};
const toolStepLabel = (name: string, input: unknown, listingMode: boolean) => {
  if (listingMode) {
    if (name === "web_search") return "Checking comparable prices online";
    if (name === "ask_user") return "Preparing a quick question";
    return toolLabel(name);
  }
  const label = toolLabel(name);
  if (
    (name === "web_search" || name === "inventory_search") &&
    input &&
    typeof input === "object" &&
    "query" in input &&
    typeof input.query === "string"
  ) {
    const query = input.query.replace(/\s+/g, " ").trim().slice(0, 180);
    if (query) return `${label}: ${query}`;
  }
  return label;
};

type ActivityCallbacks = Pick<
  ToolLoopAgentSettings<never, ToolSet>,
  "onStepStart" | "onStepEnd" | "onToolExecutionStart" | "onToolExecutionEnd"
>;

export function createRunActivity(
  status: ReturnType<typeof createRunStream>["status"],
) {
  let lastStage = "Starting";
  const stepSequence: { step: number; outcomes: string[] }[] = [];

  function callbacks(
    tools: ToolSet,
    listingMode: boolean,
    listingAssist: boolean,
    listingTitle?: string,
  ): ActivityCallbacks {
    const stepLabel = (step: number) =>
      listingMode
        ? step === 0
          ? "Reading your listing details"
          : "Writing your listing"
        : step === 0
          ? "Reading your request"
          : "Reviewing tool results";
    const searchDetail = (name: string) =>
      listingMode && name === "web_search" ? listingTitle : undefined;
    return {
      onStepStart: async ({ stepNumber }) => {
        lastStage =
          stepNumber === 0
            ? "Reading request"
            : "Model step " + (stepNumber + 1);
        return status(`step-${stepNumber}`, stepLabel(stepNumber), "running");
      },
      onStepEnd: async ({ stepNumber, content, finishReason }) => {
        const outcomes: string[] = [];
        for (const part of content) {
          if (part.type !== "tool-result" && part.type !== "tool-error")
            continue;
          const name = Object.hasOwn(tools, part.toolName)
            ? part.toolName
            : "unknown_tool";
          if (part.type === "tool-error") {
            const error = part.error;
            const reason =
              error instanceof RunError || error instanceof WebSearchError
                ? error.code
                : error instanceof ActionRejection
                  ? error.message
                  : "INVALID_TOOL_CALL";
            outcomes.push(name + ": " + reason);
          } else {
            const output = part.output;
            const arrays =
              output && typeof output === "object"
                ? Object.entries(output)
                : [];
            const counted = arrays.find(
              ([key, value]) =>
                ["items", "displayedIds", "sources"].includes(key) &&
                Array.isArray(value),
            );
            outcomes.push(
              counted && Array.isArray(counted[1])
                ? `${name}: ${counted[1].length} ${counted[0]}`
                : `${name}: completed`,
            );
          }
        }
        stepSequence.push({
          step: stepNumber + 1,
          outcomes: outcomes.length ? outcomes : [finishReason],
        });
        return status(`step-${stepNumber}`, stepLabel(stepNumber), "complete");
      },
      onToolExecutionStart: async ({ toolCall }) => {
        lastStage = toolLabel(toolCall.toolName);
        return status(
          toolCall.toolCallId,
          toolStepLabel(toolCall.toolName, toolCall.input, listingMode),
          "running",
          toolActivity[toolCall.toolName]?.task,
          undefined,
          searchDetail(toolCall.toolName),
        );
      },
      onToolExecutionEnd: async ({ toolCall, toolOutput }) => {
        // Failed tools are returned to the model, so surface them for debugging.
        if (toolOutput.type === "tool-error")
          console.warn(
            `Agent tool "${toolCall.toolName}" failed: ${
              toolOutput.error instanceof Error
                ? toolOutput.error.message
                : String(toolOutput.error)
            }`,
          );
        const webError =
          toolCall.toolName === "web_search" && toolOutput.type === "tool-error"
            ? toolOutput.error
            : null;
        const failure: AgentToolFailure | undefined = webError
          ? {
              code:
                webError instanceof WebSearchError ||
                webError instanceof RunError
                  ? webError.code
                  : "WEB_SEARCH_UNAVAILABLE",
              message:
                webError instanceof WebSearchError ||
                webError instanceof RunError
                  ? webError.message
                  : "Web search could not finish. Try again shortly.",
              retryable:
                !(
                  webError instanceof WebSearchError ||
                  webError instanceof RunError
                ) ||
                ![
                  "WEB_SEARCH_AUTH",
                  "WEB_SEARCH_QUOTA",
                  "WEB_SEARCH_NOT_CONFIGURED",
                  "WEB_SEARCH_LIMIT",
                  "SOURCE_RESTRICTED",
                  "INVALID_RESEARCH_SCOPE",
                  "UNSUPPORTED_SOURCE",
                ].includes(webError.code),
            }
          : toolOutput.type === "tool-error"
            ? negotiationToolFailure(toolCall.toolName, toolOutput.error)
            : undefined;
        const output =
          toolOutput.type === "tool-result" ? toolOutput.output : null;
        const needsInput =
          output &&
          typeof output === "object" &&
          "needsInput" in output &&
          Array.isArray(output.needsInput) &&
          output.needsInput.length > 0;
        const needsCorrection =
          listingAssist &&
          ["ask_user", "update_listing", "propose_price"].includes(
            toolCall.toolName,
          );
        return status(
          toolCall.toolCallId,
          toolStepLabel(toolCall.toolName, toolCall.input, listingMode),
          toolOutput.type === "tool-error"
            ? needsCorrection
              ? "needs_input"
              : "error"
            : needsInput
              ? "needs_input"
              : "complete",
          toolActivity[toolCall.toolName]?.task,
          failure,
          searchDetail(toolCall.toolName),
        );
      },
    };
  }

  return {
    callbacks,
    stepSequence,
    get lastStage() {
      return lastStage;
    },
  };
}
