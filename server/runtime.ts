import { listingKeyFacts } from "./listing-facts.ts";
import {
  createAgentTools,
  inventorySearch,
  type AgentToolState,
} from "./agent-tools.ts";
import { RunError } from "./errors.ts";
import { englishListingText, type ListingText } from "./listing-language.ts";
import {
  languageModel,
  thinkingOptions,
  type ModelAccess,
} from "./model-provider.ts";
import { listingInventory } from "../shared/listingInventory.ts";
import {
  extractSearchConstraints,
  takeoverOnlyPattern,
  type Product,
} from "../shared/marketplace.ts";
import { negotiationSchema } from "../shared/negotiation.ts";
import { createNegotiationTools } from "./negotiation-tools.ts";
import {
  buildAgentInstructions,
  buildRunPrompt,
} from "./agent-instructions.ts";
import {
  tool,
  ToolChoiceViolationError,
  ToolLoopAgent,
  type LanguageModel,
} from "ai";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type {
  AgentRunEvent,
  AgentRunRequest,
  AgentRunSource,
  AgentRuntimeHealth,
} from "../shared/runs.ts";
import {
  dateSchema,
  listingDraftSchema,
  questionSchema,
} from "./action-schemas.ts";
import { createRunActivity } from "./run-activity.ts";
import {
  getRunMode,
  getStepPolicy,
  MAX_TOOL_CALLS,
  needsPriceDecision,
  reachedStepLimit,
  type RunMode,
} from "./run-policy.ts";
import { finishRun, reportRunError } from "./run-result.ts";
import { createRunStream, MAX_RUN_TEXT_CHARS } from "./run-stream.ts";

export type AgentRuntimeConfig = ModelAccess & {
  braveApiKey?: string;
  fetchImpl?: typeof fetch;
  /** Inject the official SDK mock model in tests; never supplied by HTTP callers. */
  modelImpl?: LanguageModel;
  timeoutMs?: number;
  inventoryProvider?: () => Product[] | Promise<Product[]>;
  inventoryAuthoritative?: boolean;
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
      ownListingIds: z.array(z.string().min(1).max(120)).max(200).optional(),
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
      listingStart: z.boolean().optional(),
      photoAnalysis: z
        .object({
          missingDetails: z
            .array(z.string().trim().min(1).max(240))
            .max(12)
            .optional(),
          keywords: z
            .array(z.string().trim().min(1).max(120))
            .max(12)
            .optional(),
        })
        .strict()
        .optional(),
      currentDraft: listingDraftSchema.optional(),
      previousQuestion: z.string().max(500).optional(),
      negotiation: negotiationSchema.optional(),
      skippedQuestions: z
        .array(
          questionSchema.pick({ question: true, listingField: true }).extend({
            choices: z
              .array(z.string().trim().min(1).max(120))
              .max(5)
              .optional(),
          }),
        )
        .max(30)
        .optional(),
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

async function runInventory(
  request: AgentRunRequest,
  config: AgentRuntimeConfig,
) {
  // Hosted inventory is server-owned; local mode also searches browser drafts.
  const databaseRows = (await config.inventoryProvider?.()) ?? [];
  // Pako finds things for the student to buy, so their own listings never count.
  const ownIds = new Set(request.context?.ownListingIds);
  const currentInventory = () => {
    const databaseIds = new Set(databaseRows.map((item) => item.id));
    return [
      ...(config.inventoryAuthoritative
        ? []
        : (request.inventory ?? [])
      ).filter((item) => !databaseIds.has(item.id)),
      ...listingInventory(
        databaseRows,
        !request.context?.negotiation &&
          (request.context?.intent ?? "search") === "search"
          ? request.context
          : undefined,
      ),
    ].filter((item) => !ownIds.has(item.id));
  };
  return currentInventory;
}

async function applySearchPreferences(
  request: AgentRunRequest,
  { listingMode, negotiationMode, refinement }: RunMode,
  constraints: ReturnType<typeof extractSearchConstraints>,
  runId: string,
  send: ReturnType<typeof createRunStream>["send"],
) {
  if (!listingMode && !negotiationMode) {
    const previous = { ...request.context };
    request.context ??= {};
    if (constraints.maxPrice !== undefined) {
      request.context.maxPrice = constraints.maxPrice;
      if (request.context.budgetSpecified === false)
        request.context.budgetSpecified = true;
    }
    if (constraints.radius !== undefined)
      request.context.radius = constraints.radius;
    if (takeoverOnlyPattern.test(request.text))
      request.context.source = "takeover";
    if (refinement) {
      const campus = request.text.match(
        /\b(?:closer to|near|of) (EPFL|UNIL)\b/i,
      )?.[1];
      if (campus) request.context.location = campus.toUpperCase();
      const patch = Object.fromEntries(
        (["maxPrice", "radius", "source", "location"] as const)
          .filter((field) => previous[field] !== request.context?.[field])
          .map((field) => [field, request.context?.[field]]),
      );
      if (Object.keys(patch).length)
        await send({
          type: "preferences_patch",
          id: runId + "-filters",
          patch,
          reason: "Apply your updated search preferences.",
          evidence: [{ kind: "seller", quote: request.text.trim() }],
        });
    }
  }
}

function initialToolState(
  request: AgentRunRequest,
  mode: RunMode,
  braveApiKey: string,
): AgentToolState {
  const { listingAssist, negotiationMode } = mode;
  const ownOnly = request.context?.source?.toLowerCase() === "takeover";
  return {
    firstDraft:
      listingAssist &&
      !request.context?.skippedQuestions?.length &&
      request.context?.currentDraft?.price === null &&
      (request.context.listingStart === true ||
        (!request.context.previousQuestion &&
          !request.context.previousAnswer &&
          !request.context.answeredQuestions?.length &&
          !request.context.recentMessages?.length)),
    ownInventoryOnly: ownOnly,
    allowWebSearch: Boolean(braveApiKey) && !ownOnly && !negotiationMode,
    listingNeedsInput: false,
    observedInventory: new Map(),
    inventorySearched: false,
    inventoryCurated: false,
    webSearched: false,
    displayedInventoryIds: [],
    offerSourceIds: new Set(),
  };
}

async function announceCatalogScan(
  send: ReturnType<typeof createRunStream>["send"],
) {
  await send({
    type: "status",
    id: "takeover-catalog",
    task: "listings",
    label: "Searching takeover listings",
    state: "running",
  });
  await send({
    type: "status",
    id: "takeover-catalog",
    task: "listings",
    label: "Takeover listings checked",
    state: "complete",
  });
}

export function createAgentRuntime(config: AgentRuntimeConfig): AgentRuntime {
  const { model } = config;
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

      const stream = createRunStream({
        runId,
        sources,
        emit,
        callerSignal,
        abort: () => controller.abort(),
      });
      const { send } = stream;
      const activity = createRunActivity(stream.status);
      const questionController = new AbortController();
      const workSignal = AbortSignal.any([signal, questionController.signal]);
      let toolCalls = 0;
      try {
        const request = validateRunRequest(input);
        const currentInventory = await runInventory(request, config);
        const mode = getRunMode(request);
        const { listingMode, listingAssist, refinement } = mode;
        const constraints = extractSearchConstraints(request.text);
        await applySearchPreferences(request, mode, constraints, runId, send);
        const state = initialToolState(request, mode, braveApiKey);

        const claimTool = () => {
          signal.throwIfAborted();
          if (state.pendingQuestion)
            throw new RunError(
              "AWAITING_ANSWER",
              "Wait for the user's answer before using another tool.",
            );
          if (++toolCalls > MAX_TOOL_CALLS)
            throw new RunError(
              "TOOL_LIMIT",
              "The agent reached its tool limit.",
            );
        };
        signal.throwIfAborted();
        if (!apiKey)
          throw new RunError(
            "AGENT_NOT_CONFIGURED",
            "Add the model API key on the server to start the agent.",
          );
        const agentModel =
          config.modelImpl ??
          languageModel({ ...config, apiKey }, config.fetchImpl);
        const translateListing = (text: ListingText) =>
          config.listingTextTranslator
            ? config.listingTextTranslator(text, signal)
            : englishListingText(text, agentModel, signal, config);
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
        if (!listingMode) await announceCatalogScan(send);
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
        let refinementReply: string | undefined;
        if (refinement)
          tools.finish_search = tool({
            description:
              "Give the student the final comparison using the current cards and web evidence. The app already provides the matching cards and their actions.",
            inputSchema: z.object({
              text: z
                .string()
                .trim()
                .min(1)
                .max(MAX_RUN_TEXT_CHARS)
                .refine(
                  (text) => !text.includes("｜｜DSML｜｜"),
                  "Provide only the comparison in ordinary Markdown.",
                ),
            }),
            execute: ({ text }) => {
              claimTool();
              refinementReply = text;
              return { completed: true };
            },
          });

        const instructionContext = {
          listingMode,
          listingAssist,
          keyFacts: listingAssist ? listingKeyFacts(request) : undefined,
          localInventory,
          previousMatches,
        };
        const agent = new ToolLoopAgent({
          model: agentModel,
          instructions: buildAgentInstructions({
            ...instructionContext,
            allowWebSearch: state.allowWebSearch,
            ownInventoryOnly: state.ownInventoryOnly,
          }),
          tools,
          stopWhen: [
            ({ steps }) =>
              reachedStepLimit(steps.length, negotiations.isReadyToFinish()),
            () => Boolean(state.pendingQuestion || refinementReply),
          ],
          prepareStep: ({ stepNumber, steps }) => ({
            // Preferences can change through a tool within this reply.
            instructions: buildAgentInstructions({
              ...instructionContext,
              allowWebSearch: state.allowWebSearch,
              ownInventoryOnly: state.ownInventoryOnly,
              refinement,
              responseLanguage: state.responseLanguage,
            }),
            ...getStepPolicy(request, state, {
              ...mode,
              stepNumber,
              toolNames: Object.keys(tools),
              radiusChanged: constraints.radius !== undefined,
              sourceCount: sources.length,
              askedQuestion: steps.some((step) =>
                step.toolCalls.some((call) => call.toolName === "ask_user"),
              ),
              proposal: negotiations.getCurrent(),
              proposalReadyToFinish: negotiations.isReadyToFinish(),
            }),
          }),
          // Provider response bodies stay server-private.
          onError: ({ error }) => stream.recordFailure(error),
          maxRetries: 2,
          maxOutputTokens: 4096,
          providerOptions: thinkingOptions(true, config),
          ...activity.callbacks(
            tools,
            listingMode,
            listingAssist,
            request.context?.currentDraft?.title,
          ),
        });
        const result = await agent.stream({
          prompt: buildRunPrompt(request),
          abortSignal: signal,
        });
        await stream.consume(result.fullStream, !refinement);
        signal.throwIfAborted();
        if (
          stream.failure &&
          !(
            needsPriceDecision(request, state) &&
            ToolChoiceViolationError.isInstance(stream.failure)
          )
        )
          throw stream.failure;
        await finishRun({
          request,
          state,
          mode,
          hasProposal: Boolean(negotiations.getCurrent()),
          refinementReply,
          result,
          stream,
          sources,
          runId,
        });
      } catch (error) {
        await reportRunError(error, {
          callerSignal,
          timeout,
          stream,
          activity,
          model,
          runId,
          startedAt,
        });
      }
    },
  };
}
