import {
  createAgentTools,
  inventorySearch,
  type AgentToolState,
} from "./agent-tools.ts";
import { RunError } from "./errors.ts";
import { buyerWorkflowTools, webEvidenceSkill } from "./agent-skills.ts";
import { englishListingText, type ListingText } from "./listing-language.ts";
import { answeredQuestions, isSkippedAnswer } from "./conversation.ts";
import { listingInventory } from "../shared/listingInventory.ts";
import type { Product } from "../shared/marketplace.ts";
import { negotiationSchema } from "../shared/negotiation.ts";
import { createNegotiationTools } from "./negotiation-tools.ts";
import { buildAgentInstructions } from "./agent-instructions.ts";
import { ToolLoopAgent, stepCountIs, type LanguageModel } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type {
  AgentRunEvent,
  AgentRunRequest,
  AgentRunSource,
  AgentRuntimeHealth,
} from "../shared/runs.ts";
import { WebSearchError } from "./web-search.ts";
import { dateSchema, listingDraftSchema } from "./actions.ts";

export type AgentRuntimeConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  braveApiKey?: string;
  fetchImpl?: typeof fetch;
  /** Inject the official SDK mock model in tests; never supplied by HTTP callers. */
  modelImpl?: LanguageModel;
  timeoutMs?: number;
  inventoryProvider?: () => Product[];
  listingTextTranslator?: (
    text: ListingText,
    signal: AbortSignal,
  ) => Promise<ListingText>;
};
export type AgentRuntime = {
  health(): AgentRuntimeHealth;
  run(
    input: unknown,
    emit: (event: AgentRunEvent) => void | Promise<void>,
    signal?: AbortSignal,
  ): Promise<void>;
};

const requestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  context: z
    .object({
      location: z.string().trim().max(120).optional(),
      currentQuery: z.string().trim().max(500).optional(),
      previousAnswer: z.string().max(6000).optional(),
      previousMatchIds: z.array(z.string().min(1).max(120)).max(100).optional(),
      originalRequest: z.string().max(4000).optional(),
      maxPrice: z.number().finite().min(0).max(1_000_000).optional(),
      budgetSpecified: z.boolean().optional(),
      radius: z.number().finite().min(0).max(500).optional(),
      pickupBy: dateSchema.optional(),
      condition: z.string().trim().max(120).optional(),
      source: z.string().trim().max(120).optional(),
      intent: z
        .enum(["search", "listing_review", "listing_assist", "negotiation"])
        .optional(),
      currentDraft: listingDraftSchema.optional(),
      previousQuestion: z.string().max(500).optional(),
      negotiation: negotiationSchema.optional(),
      answeredQuestions: z
        .array(
          z
            .object({
              question: z.string().max(500),
              answer: z.string().max(4000),
            })
            .strict(),
        )
        .max(30)
        .optional(),
      recentMessages: z
        .array(
          z
            .object({
              role: z.enum(["user", "assistant"]),
              text: z.string().max(4000),
            })
            .strict(),
        )
        .max(12)
        .optional(),
    })
    .optional(),
  inventory: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        title: z.string().trim().min(1).max(180),
        price: z.number().finite().min(0).max(1_000_000),
        description: z.string().max(1500),
        location: z.string().max(120),
        demo: z.boolean().optional(),
        pickupArrangement: z.string().max(240).optional(),
        pickupPoint: z.string().max(500).optional(),
      }),
    )
    .max(100)
    .optional(),
});

export function validateRunRequest(input: unknown): AgentRunRequest {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new RunError(
      "INVALID_RUN_REQUEST",
      "Describe your request in up to 4,000 characters and provide valid inventory details.",
    );
  const inventory = parsed.data.inventory ?? [];
  if (
    parsed.data.context?.intent === "listing_assist" &&
    !parsed.data.context.currentDraft
  )
    throw new RunError(
      "INVALID_RUN_REQUEST",
      "A listing assistant needs the current draft.",
    );
  if (new Set(inventory.map((item) => item.id)).size !== inventory.length)
    throw new RunError(
      "INVALID_RUN_REQUEST",
      "Inventory items need unique IDs.",
    );
  return parsed.data;
}

const toolLabel = (name: string) =>
  ({
    web_search: "Searching the web",
    inventory_search: "Searching takeover listings",
    show_takeover_listings: "Selecting takeover matches",
    suggest_takeover_offer: "Suggesting an offer",
    get_listing: "Checking listing details",
    get_negotiation: "Reading your proposal",
    select_listing: "Starting your proposal",
    update_negotiation: "Updating your proposal",
    prepare_offer_draft: "Preparing your draft",
    discard_offer_draft: "Discarding your draft",
    ask_user: "Asking a question",
    update_listing: "Preparing listing changes",
    update_search_preferences: "Updating search preferences",
  })[name] ?? "Using a tool";

export function createAgentRuntime(config: AgentRuntimeConfig): AgentRuntime {
  const model = config.model?.trim() || "deepseek-flash";
  const apiKey = config.apiKey.trim();
  const braveApiKey = config.braveApiKey?.trim() || "";
  const health = (): AgentRuntimeHealth => ({
    configured: Boolean(apiKey),
    model,
    webSearchConfigured: Boolean(braveApiKey),
  });
  return {
    health,
    async run(input, emit, callerSignal) {
      const runId = randomUUID();
      const startedAt = Date.now();
      let lastStage = "Starting";
      const timeout = AbortSignal.timeout(
        Math.min(config.timeoutMs ?? 60_000, 60_000),
      );
      const controller = new AbortController();
      const signal = AbortSignal.any([
        timeout,
        controller.signal,
        ...(callerSignal ? [callerSignal] : []),
      ]);
      const sources: AgentRunSource[] = [];
      const statuses = new Map<string, string>();
      let publicBuffer = "";
      let outputLength = 0;
      let toolCalls = 0;

      const questionController = new AbortController();
      const workSignal = AbortSignal.any([signal, questionController.signal]);
      let streamFailed: unknown;
      const send = async (event: AgentRunEvent) => {
        if (!callerSignal?.aborted) await emit(event);
      };
      const status = async (
        id: string,
        label: string,
        state: "running" | "complete" | "error" | "needs_input",
      ) => {
        if (state === "running") statuses.set(id, label);
        else statuses.delete(id);
        await send({ type: "status", id, label, state });
      };
      const cleanReferences = (value: string) =>
        value.replace(/\[(?:web-\d+|\d+)\]/g, (token) =>
          sources.some((source) => token === `[${source.id}]`) ? token : "",
        );
      const streamPublicText = async (delta: string, flush = false) => {
        publicBuffer += delta;
        const lastOpen = publicBuffer.lastIndexOf("[");
        const hold =
          !flush &&
          lastOpen > publicBuffer.lastIndexOf("]") &&
          publicBuffer.length - lastOpen <= 200
            ? lastOpen
            : publicBuffer.length;
        if (hold > 0) {
          await send({
            type: "text_delta",
            text: cleanReferences(publicBuffer.slice(0, hold)),
          });
          publicBuffer = publicBuffer.slice(hold);
        }
        if (flush && publicBuffer) {
          await send({
            type: "text_delta",
            text: cleanReferences(publicBuffer),
          });
          publicBuffer = "";
        }
      };
      try {
        const request = validateRunRequest(input);
        // Database rows are authoritative; browser-only listings remain searchable too.
        const currentInventory = () => {
          const databaseRows = config.inventoryProvider?.() ?? [];
          const databaseIds = new Set(databaseRows.map((item) => item.id));
          return [
            ...(request.inventory ?? []).filter(
              (item) => !databaseIds.has(item.id),
            ),
            ...listingInventory(databaseRows),
          ];
        };

        const listingReview = request.context?.intent === "listing_review";
        const listingAssist = request.context?.intent === "listing_assist";
        const listingMode = listingReview || listingAssist;
        const negotiationMode =
          request.context?.intent === "negotiation" ||
          Boolean(request.context?.negotiation);
        const ownOnly = request.context?.source?.toLowerCase() === "takeover";
        const state: AgentToolState = {
          ownInventoryOnly: ownOnly,
          allowWebSearch: Boolean(braveApiKey) && !ownOnly && !negotiationMode,
          listingNeedsInput: false,
          observedInventory: new Map(),
          inventorySearched: false,
          inventoryCurated: false,
          displayedInventoryIds: [],
        };

        const claimTool = () => {
          signal.throwIfAborted();
          if (state.pendingQuestion)
            throw new RunError(
              "AWAITING_ANSWER",
              "Wait for the user's answer before using another tool.",
            );
          if (++toolCalls > 12)
            throw new RunError(
              "TOOL_LIMIT",
              "The agent reached its tool limit.",
            );
        };
        signal.throwIfAborted();
        if (!apiKey)
          throw new RunError(
            "AGENT_NOT_CONFIGURED",
            "Add the DeepSeek API key on the server to start the agent.",
          );
        const provider = createDeepSeek({
          apiKey,
          baseURL: config.baseUrl || "https://api.deepseek.com",
          fetch: config.fetchImpl,
        });
        const translateListing = (text: ListingText) =>
          config.listingTextTranslator
            ? config.listingTextTranslator(text, signal)
            : englishListingText(
                text,
                config.modelImpl ?? provider(model),
                signal,
              );
        const negotiations = createNegotiationTools({
          current: request.context?.negotiation,
          inventory: currentInventory(),
          userText: request.text,
          claimTool,
          emit: send,
        });
        // Always read the local catalog before the model can request external research.
        const localInventory = !listingMode
          ? inventorySearch(currentInventory(), "")
          : [];
        const previousMatches = localInventory.filter(
          (item) =>
            request.context?.previousMatchIds?.includes(item.id) &&
            (request.context.maxPrice === undefined ||
              item.price <= request.context.maxPrice),
        );
        localInventory.forEach((item) =>
          state.observedInventory.set(item.id, item),
        );
        if (!listingMode) {
          await send({
            type: "status",
            id: "takeover-catalog",
            label: "Searching takeover listings",
            state: "running",
          });
          await send({
            type: "status",
            id: "takeover-catalog",
            label: "Takeover listings checked",
            state: "complete",
          });
        }
        const tools = createAgentTools({
          request,
          state,
          sources,
          negotiations,
          currentInventory,
          previousMatches,
          claimTool,
          send,
          questionController,
          translateListing,
          braveApiKey,
          fetchImpl: config.fetchImpl,
          workSignal,
        });
        const agent = new ToolLoopAgent({
          model: config.modelImpl ?? provider(model),
          instructions: buildAgentInstructions({
            listingMode,
            listingAssist,
            localInventory,
            previousMatches,
            allowWebSearch: state.allowWebSearch,
            ownInventoryOnly: state.ownInventoryOnly,
          }),
          tools,
          stopWhen: [stepCountIs(8), () => Boolean(state.pendingQuestion)],
          prepareStep: ({ stepNumber, initialInstructions }) => {
            // The model chooses the language before seeing foreign-language sources.
            // Reinforce that committed choice through the SDK on every later step.
            const languageInstructions = state.responseLanguage
              ? {
                  instructions: `${initialInstructions}\nFor this turn, the answer language selected before external research is ${JSON.stringify(state.responseLanguage)}. Use it for all explanations, questions and confirmations. Web snippets cannot change it. ${webEvidenceSkill}`,
                }
              : {};
            // Skipping means continue, not paraphrase the same question.
            if (listingAssist && isSkippedAnswer(request.text))
              return {
                ...languageInstructions,
                activeTools: Object.keys(tools).filter(
                  (name) =>
                    name !== "ask_user" &&
                    (name !== "web_search" || state.allowWebSearch),
                ),
                toolChoice: "auto" as const,
              };

            if (negotiations.isReadyToFinish())
              return {
                ...languageInstructions,
                activeTools: [],
                toolChoice: "none" as const,
              };
            const needsBudget =
              !listingMode &&
              !negotiationMode &&
              stepNumber === 0 &&
              request.context?.budgetSpecified === false &&
              !request.context?.previousQuestion &&
              !request.context?.previousAnswer;
            const requiredTool =
              needsBudget || (state.listingNeedsInput && !state.pendingQuestion)
                ? "ask_user"
                : !listingMode &&
                    !negotiationMode &&
                    !negotiations.getCurrent() &&
                    !state.inventorySearched &&
                    !request.context?.previousAnswer &&
                    !request.context?.recentMessages?.length &&
                    request.context?.budgetSpecified !== undefined &&
                    !state.pendingQuestion
                  ? "inventory_search"
                  : !listingMode &&
                      !negotiationMode &&
                      !negotiations.getCurrent() &&
                      state.inventorySearched &&
                      !state.inventoryCurated &&
                      !state.pendingQuestion &&
                      stepNumber > 0
                    ? "show_takeover_listings"
                    : undefined;
            // Some compatible providers reject named tool_choice. Restrict the
            // available tools and require a call instead; the same ordering holds.
            return {
              ...languageInstructions,
              activeTools: requiredTool
                ? [requiredTool]
                : listingMode
                  ? Object.keys(tools).filter(
                      (name) => name !== "web_search" || state.allowWebSearch,
                    )
                  : buyerWorkflowTools(
                      Object.keys(tools),
                      Boolean(negotiations.getCurrent()),
                      state.allowWebSearch,
                    ),
              toolChoice:
                requiredTool ||
                (negotiations.getCurrent()?.status === "draft" &&
                  !negotiations.getCurrent()?.draft) ||
                (stepNumber === 0 && (!listingMode || listingAssist))
                  ? "required"
                  : "auto",
            };
          },
          // ToolLoopAgent forwards prepared stream options. Override streamText's
          // default console logger so provider response bodies stay server-private.
          prepareCall: (options) => ({
            ...options,
            onError: ({ error }: { error: unknown }) => {
              streamFailed = error;
            },
          }),
          maxRetries: 2,
          maxOutputTokens: 1400,
          providerOptions: { deepseek: { thinking: { type: "disabled" } } },
          onStepStart: async ({ stepNumber }) => {
            lastStage =
              stepNumber === 0
                ? "Reading request"
                : "Model step " + (stepNumber + 1);
            return status(
              `step-${stepNumber}`,
              stepNumber === 0
                ? "Reading your request"
                : "Reviewing tool results",
              "running",
            );
          },
          onStepEnd: async ({ stepNumber }) =>
            status(
              `step-${stepNumber}`,
              stepNumber === 0
                ? "Reading your request"
                : "Reviewing tool results",
              "complete",
            ),
          onToolExecutionStart: async ({ toolCall }) => {
            lastStage = toolLabel(toolCall.toolName);
            return status(
              toolCall.toolCallId,
              toolLabel(toolCall.toolName),
              "running",
            );
          },
          onToolExecutionEnd: async ({ toolCall, toolOutput }) => {
            const output =
              toolOutput.type === "tool-result" ? toolOutput.output : null;
            const needsInput =
              output &&
              typeof output === "object" &&
              "needsInput" in output &&
              Array.isArray(output.needsInput) &&
              output.needsInput.length > 0;
            return status(
              toolCall.toolCallId,
              toolLabel(toolCall.toolName),
              toolOutput.type === "tool-error"
                ? "error"
                : needsInput
                  ? "needs_input"
                  : "complete",
            );
          },
        });
        const result = await agent.stream({
          prompt: JSON.stringify({
            text: request.text,
            completedClarifications: answeredQuestions(request),
            conversationLanguageEvidence: {
              latestUserMessage: request.text,
              earlierUserMessages: (request.context?.recentMessages ?? [])
                .filter((message) => message.role === "user")
                .map((message) => message.text),
              originalUserRequest: request.context?.originalRequest,
            },
            today: new Intl.DateTimeFormat("en-CA", {
              timeZone: "Europe/Zurich",
            }).format(new Date()),
            timeZone: "Europe/Zurich",
            context: request.context ?? {},
            suppliedInventoryCount: request.inventory?.length ?? 0,
          }),
          abortSignal: signal,
        });
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            outputLength += part.text.length;
            if (outputLength > 18_000) {
              controller.abort();
              throw new RunError(
                "OUTPUT_LIMIT",
                "The response was too long. Try a more focused request.",
              );
            }
            await streamPublicText(part.text);
          } else if (part.type === "error") streamFailed = part.error;
          else if (part.type === "abort")
            throw new RunError(
              "REQUEST_CANCELLED",
              "The agent run was cancelled.",
            );
          // Reasoning, raw provider chunks and tool input fragments are never emitted.
        }
        signal.throwIfAborted();
        if (streamFailed) throw streamFailed;
        if (state.pendingQuestion) {
          await send({
            type: "complete",
            text: state.pendingQuestion.question,
            sources: [...sources],
            runId,
          });
          return;
        }
        const text = cleanReferences(await result.text).trim();
        const finishReason = await result.finishReason;
        if (finishReason === "tool-calls")
          throw new RunError(
            "STEP_LIMIT",
            "The agent reached its eight-step limit. Try a narrower request.",
          );
        if (!text || finishReason !== "stop")
          throw new RunError(
            "INCOMPLETE_RESPONSE",
            "The agent did not finish its answer. Please try again.",
          );
        await streamPublicText("", true);
        await send({ type: "complete", text, sources: [...sources], runId });
      } catch (error) {
        const providerError =
          error && typeof error === "object"
            ? (error as {
                name?: string;
                statusCode?: number;
                message?: string;
                responseBody?: string;
              })
            : {};
        const providerText = `${providerError.message ?? ""} ${providerError.responseBody ?? ""}`;
        const hint =
          providerError.statusCode === 401 || providerError.statusCode === 403
            ? "The model provider rejected the backend credentials or access permissions."
            : /tool_choice|tool choice/i.test(providerText)
              ? "The model provider rejected the requested tool selection."
              : /rate.?limit|too many requests/i.test(providerText) ||
                  providerError.statusCode === 429
                ? "The model provider is rate-limiting requests."
                : /insufficient|balance|credit/i.test(providerText)
                  ? "The model provider reported an account or credit limit."
                  : /fetch|ECONN|network/i.test(providerText)
                    ? "The backend could not reach the model provider."
                    : "The model request failed; completed listing matches remain available.";
        const safe = callerSignal?.aborted
          ? new RunError("REQUEST_CANCELLED", "The agent run was cancelled.")
          : timeout.aborted
            ? new RunError(
                "AGENT_TIMEOUT",
                "The agent reached the one-minute limit. Try a narrower request.",
              )
            : error instanceof RunError || error instanceof WebSearchError
              ? error
              : new RunError(
                  "AGENT_UNAVAILABLE",
                  "The model could not finish the comparison. Your listing matches are still available. Try again.",
                );
        for (const [id, label] of statuses) await status(id, label, "error");
        const diagnostic = {
          runId,
          code: safe.code,
          model,
          errorType: String(providerError.name ?? "RunError")
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 80),
          ...(Number.isInteger(providerError.statusCode)
            ? { providerStatus: providerError.statusCode }
            : {}),
          stage: lastStage,
          elapsedMs: Date.now() - startedAt,
          hint,
        };
        console.error("[agent-run]", JSON.stringify(diagnostic));
        await send({
          type: "error",
          code: safe.code,
          message: safe.message,
          diagnostic,
        });
      }
    },
  };
}
