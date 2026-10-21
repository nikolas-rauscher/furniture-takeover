import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { RunError } from "./errors.ts";
import { repeatedQuestion } from "./conversation.ts";
import { inventoryWords } from "./inventory-terms.ts";
import { searchWeb } from "./web-search.ts";
import type { ListingText } from "./listing-language.ts";
import type { createNegotiationTools } from "./negotiation-tools.ts";
import type { AgentQuestionEvent } from "../shared/actions.ts";
import type {
  AgentRunEvent,
  AgentRunInventoryItem,
  AgentRunRequest,
  AgentRunSource,
} from "../shared/runs.ts";
import {
  questionSchema,
  listingUpdateSchema,
  preferencesUpdateSchema,
  prepareListingAction,
  preferencesAction,
} from "./actions.ts";

// Shared by this run's tools and the runtime's tool-selection policy.
export type AgentToolState = {
  pendingQuestion?: AgentQuestionEvent;
  listingNeedsInput: boolean;
  ownInventoryOnly: boolean;
  allowWebSearch: boolean;
  observedInventory: Map<string, AgentRunInventoryItem>;
  inventorySearched: boolean;
  inventoryCurated: boolean;
  displayedInventoryIds: string[];
  responseLanguage?: string;
};

type AgentToolContext = {
  request: AgentRunRequest;
  state: AgentToolState;
  sources: AgentRunSource[];
  negotiations: ReturnType<typeof createNegotiationTools>;
  currentInventory(): AgentRunInventoryItem[];
  previousMatches: AgentRunInventoryItem[];
  claimTool(): void;
  send(event: AgentRunEvent): Promise<void>;
  questionController: AbortController;
  translateListing(text: ListingText): Promise<ListingText>;
  braveApiKey: string;
  fetchImpl?: typeof fetch;
  workSignal: AbortSignal;
};

export function inventorySearch(
  items: AgentRunInventoryItem[],
  query: string,
  maxPrice?: number,
): AgentRunInventoryItem[] {
  const words = inventoryWords;
  const terms = words(query).filter(
    (word) =>
      !["a", "an", "the", "furniture", "any", "all", "and"].includes(word),
  );
  return items
    .filter(
      (item) =>
        (maxPrice === undefined || item.price <= maxPrice) &&
        terms.every((term) =>
          words(
            item.title +
              " " +
              item.description.replace(
                /[^.!?]*(?:not included|not for sale|nicht enthalten|nicht dabei|non inclus)[^.!?]*/gi,
                "",
              ),
          ).includes(term),
        ),
    )
    .slice(0, query.trim() ? 12 : 100)
    .map((item) => ({ ...item }));
}

export function selectTakeoverListings(
  ids: string[],
  observed: Map<string, AgentRunInventoryItem>,
  maxPrice?: number,
): string[] {
  if (
    ids.length > 6 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => {
      const item = observed.get(id);
      return !item || (maxPrice !== undefined && item.price > maxPrice);
    })
  )
    throw new RunError(
      "INVALID_INVENTORY_SELECTION",
      "Choose only matching listings returned by the current takeover search.",
    );
  return [...ids];
}

export function createAgentTools(context: AgentToolContext): ToolSet {
  const {
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
    fetchImpl,
    workSignal,
  } = context;
  const listingReview = request.context?.intent === "listing_review";
  const listingAssist = request.context?.intent === "listing_assist";
  const listingMode = listingReview || listingAssist;
  const offerSourceIds = new Set<string>();
  let sourceSequence = 0;
  return {
    ...(!listingMode ? negotiations.tools : {}),
    ask_user: tool({
      description:
        "Ask one necessary clarification with concrete one-click answers, optional adjustable CHF price slider, and free-form reply; pause until the user replies.",
      inputSchema: questionSchema,
      execute: async (input, { toolCallId }) => {
        claimTool();
        const parsedQuestion = questionSchema.parse(input);
        const savedPrice = request.context?.currentDraft?.price;
        if (
          listingAssist &&
          parsedQuestion.listingField === "price" &&
          parsedQuestion.purpose !== "change_detail" &&
          savedPrice !== null &&
          savedPrice !== undefined
        ) {
          state.listingNeedsInput = false;
          return {
            alreadyAnswered: true,
            listingField: "price",
            value: savedPrice,
            answer: `CHF ${savedPrice}`,
            nextStep:
              "This is the current seller-approved asking price, including any accepted price suggestion. Preserve it. Ignore older claims that the price is missing. Continue with a different useful missing detail or finish.",
          };
        }
        const repeated = repeatedQuestion(parsedQuestion.question, request);
        if (repeated) {
          state.listingNeedsInput = false;
          return {
            alreadyAnswered: true,
            question: repeated.question,
            answer: repeated.answer,
            nextStep:
              "Use this existing answer. Do not ask this question again. Update the draft if needed, then finish or ask only a different missing fact.",
          };
        }
        // Model tools may attach an irrelevant control. Only an asking-price
        // question gets a price slider; preserve the useful choices/reply otherwise.
        const asksPrice =
          /\b(?:price|pricing|CHF)\b|\bhow much\b/i.test(
            parsedQuestion.question,
          ) &&
          !/\b(?:pickup|pick up|collect(?:ion)?|handover|handed over|hand over|condition|shipping|delivery|postage|when|where)\b/i.test(
            parsedQuestion.question,
          );
        if (parsedQuestion.input && !asksPrice) delete parsedQuestion.input;
        state.pendingQuestion = {
          type: "question",
          id: toolCallId,
          ...parsedQuestion,
        };
        questionController.abort();
        await send(state.pendingQuestion);
        return { awaitingUser: true };
      },
    }),
    ...(listingAssist
      ? {
          update_listing: tool({
            description:
              "Update only changed listing fields, with exact quotes from a current or earlier user-authored reply or the current draft. When adding to the description, preserve its full text verbatim and append the exact new answer on a separate line; include exact quotes for both. Omit unchanged and unspecified fields; do not submit a whole draft. For a condition answer Used: patch {condition: Used}, seller quote Used. Research can propose only a sourced CHF price for later acceptance. Does not save or publish.",
            inputSchema: listingUpdateSchema,
            execute: async (input, { toolCallId }) => {
              claimTool();
              const prepared = prepareListingAction(
                input,
                request,
                sources,
                offerSourceIds,
                toolCallId,
              );
              const action = prepared.action;
              state.listingNeedsInput = prepared.needsInput.length > 0;
              if (action) {
                const draft = request.context?.currentDraft;
                if (
                  draft &&
                  (action.patch.title !== undefined ||
                    action.patch.description !== undefined)
                ) {
                  const english = await translateListing({
                    title: action.patch.title ?? draft.title,
                    description: action.patch.description ?? draft.description,
                  });
                  action.patch = {
                    ...action.patch,
                    ...(action.patch.title !== undefined ||
                    english.title !== draft.title
                      ? { title: english.title }
                      : {}),
                    ...(action.patch.description !== undefined ||
                    english.description !== draft.description
                      ? { description: english.description }
                      : {}),
                  };
                }
                await send(action);
                if (draft && !action.requiresAcceptance)
                  Object.assign(draft, action.patch);
              }
              return {
                prepared: Boolean(action),
                requiresAcceptance: action?.requiresAcceptance ?? false,
                patch: action?.patch ?? {},
                needsInput: prepared.needsInput,
                ...(prepared.needsInput.length
                  ? {
                      nextStep:
                        "Keep the supported changes. Ask the seller one short question for the next missing fact with ask_user. Do not claim the unsupported fields were changed.",
                    }
                  : {}),
              };
            },
          }),
        }
      : !listingReview
        ? {
            update_search_preferences: tool({
              description:
                "Update only explicit current search requirements with exact user evidence; unspecified filters stay unchanged.",
              inputSchema: preferencesUpdateSchema,
              execute: async (input, { toolCallId }) => {
                claimTool();
                const action = preferencesAction(input, request, toolCallId);
                const previousSource = request.context?.source;
                request.context = { ...request.context, ...action.patch };
                if (action.patch.query !== undefined)
                  request.context.currentQuery = action.patch.query;
                if (
                  action.patch.query !== undefined ||
                  action.patch.maxPrice !== undefined ||
                  action.patch.condition !== undefined ||
                  action.patch.source !== undefined
                ) {
                  state.observedInventory.clear();
                  state.inventorySearched = false;
                  state.inventoryCurated = false;
                  state.displayedInventoryIds = [];
                  await send({ type: "inventory_matches", ids: [] });
                }
                if (
                  action.patch.source !== undefined &&
                  action.patch.source !== previousSource
                ) {
                  state.ownInventoryOnly =
                    action.patch.source.toLowerCase() === "takeover";
                  state.allowWebSearch =
                    Boolean(braveApiKey) &&
                    !state.ownInventoryOnly &&
                    !negotiations.getCurrent();
                  // Evidence from a previous scope must not masquerade as a result of the new scope.
                  sources.length = 0;
                  offerSourceIds.clear();
                  await send({ type: "sources", sources: [] });
                }
                await send(action);
                return { prepared: true, patch: action.patch };
              },
            }),
          }
        : {}),
    inventory_search: tool({
      description:
        "Search active listings from the server database and browser catalog by words in their titles AND descriptions and an optional maximum CHF price. An empty query lists the first available supplied rows. No external results.",
      inputSchema: z.object({
        query: z.string().max(200),
        maxPrice: z.number().min(0).max(1_000_000).optional(),
      }),
      execute: async ({ query, maxPrice }) => {
        claimTool();
        const budget =
          maxPrice === undefined
            ? request.context?.maxPrice
            : request.context?.maxPrice === undefined
              ? maxPrice
              : Math.min(maxPrice, request.context.maxPrice);
        const items = inventorySearch(currentInventory(), query, budget);
        items.forEach((item) => state.observedInventory.set(item.id, item));
        state.inventorySearched = true;
        // Searching for more candidates must not replace already curated cards.
        // Only show_takeover_listings commits a new selection.
        if (!state.inventoryCurated)
          await send({
            type: "inventory_matches",
            ids: items.slice(0, 12).map((item) => item.id),
          });
        return {
          items,
          totalSupplied: currentInventory().length,
          previousMatches: previousMatches.filter(
            (item) => budget === undefined || item.price <= budget,
          ),
        };
      },
    }),
    ...(!listingMode
      ? {
          suggest_takeover_offer: tool({
            description:
              "Suggest reviewing an editable offer draft for an active Takeover item observed with inventory_search in this run. This only displays a review button. It never contacts a seller, sends, reserves, or purchases. External marketplace offers are unsupported.",
            inputSchema: z
              .object({ listingId: z.string().min(1).max(120) })
              .strict(),
            execute: async ({ listingId }) => {
              claimTool();
              selectTakeoverListings(
                [listingId],
                state.observedInventory,
                request.context?.maxPrice,
              );
              await send({ type: "offer_suggestion", listingId });

              return {
                suggested: true,
                listingId,
                nextStep:
                  "The user can review and edit an offer draft. Nothing has been sent.",
              };
            },
          }),
          show_takeover_listings: tool({
            description:
              "Display up to six genuinely relevant takeover offer cards, ranked best first. Use only IDs from the current database catalog or inventory_search results. Exclude accessories that do not match the wanted item. Use an empty array if no relevant match exists. Required before the final discovery answer.",
            inputSchema: z.object({
              ids: z.array(z.string().min(1).max(120)).max(6),
            }),
            execute: async ({ ids }) => {
              claimTool();
              const selected = selectTakeoverListings(
                ids,
                state.observedInventory,
                request.context?.maxPrice,
              );
              await send({ type: "inventory_matches", ids: selected });
              state.displayedInventoryIds = selected;
              state.inventoryCurated = true;

              return { displayedIds: selected };
            },
          }),
        }
      : {}),
    ...(braveApiKey
      ? {
          web_search: tool({
            description:
              "Search Brave for individual second-hand offers on supported marketplaces (default purpose offers). Category, profile, property and non-marketplace pages are excluded. Use furniture/item-specific search phrases, not category URLs. In listing modes only, purpose product_info can research manufacturer/product specifications when explicitly requested; it cannot supply asking-price evidence. Returns real titles, HTTPS URLs and snippets, not opened pages or verified availability. Never an arbitrary URL-fetch tool.",
            inputSchema: z.object({
              query: z.string().trim().min(1).max(400),
              responseLanguage: z
                .string()
                .trim()
                .min(2)
                .max(40)
                .describe(
                  "Answer language selected from the user's chat before reading web results (e.g. English). Never use the query, listing or source language to choose it.",
                ),
              purpose: z.enum(["offers", "product_info"]).optional(),
            }),
            execute: async ({
              query,
              purpose,
              responseLanguage: selectedLanguage,
            }: {
              query: string;
              responseLanguage: string;
              purpose?: "offers" | "product_info";
            }) => {
              claimTool();
              if (state.ownInventoryOnly || negotiations.getCurrent())
                throw new RunError(
                  "SOURCE_RESTRICTED",
                  "This search is limited to your local listings.",
                );
              if (purpose === "product_info" && !listingMode)
                throw new RunError(
                  "INVALID_RESEARCH_SCOPE",
                  "Product specifications are only available when reviewing or preparing a listing.",
                );
              state.responseLanguage ??= selectedLanguage;
              const requestedSource = request.context?.source;
              const found = await searchWeb(
                query,
                {
                  apiKey: braveApiKey,
                  fetchImpl,
                  scope: purpose === "product_info" ? "research" : "offers",
                  ...(purpose !== "product_info"
                    ? { source: requestedSource }
                    : {}),
                },
                workSignal,
              );
              if (
                purpose !== "product_info" &&
                requestedSource !== request.context?.source
              )
                throw new RunError(
                  "SOURCE_CHANGED",
                  "The selected marketplace changed during this search. Search the current source again.",
                );
              const current = found
                .map((foundSource) => {
                  const previous = sources.find(
                    (source) => source.url === foundSource.url,
                  );
                  if (previous) {
                    if (purpose !== "product_info")
                      offerSourceIds.add(previous.id);
                    return previous;
                  }
                  if (sources.length >= 30) return undefined;
                  const source = {
                    ...foundSource,
                    id: `web-${++sourceSequence}`,
                  };
                  sources.push(source);
                  if (purpose !== "product_info") offerSourceIds.add(source.id);
                  return source;
                })
                .filter((source): source is AgentRunSource => Boolean(source));
              await send({ type: "sources", sources: [...sources] });
              return {
                sources: current,
                responseLanguage: state.responseLanguage,
                displayedTakeoverListings: state.displayedInventoryIds.map(
                  (id) => state.observedInventory.get(id),
                ),
                note: "External snippets only, not facts about Takeover listings. Keep the selected answer language. Wanted ads are not offers. Current details and availability are unverified.",
              };
            },
          }),
        }
      : {}),
  };
}
