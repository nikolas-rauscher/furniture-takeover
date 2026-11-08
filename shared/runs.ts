import type { Negotiation, NegotiationUpdate } from "./negotiation.ts";

export const MAX_REASONING_CHARS = 40_000;
export const MAX_REASONING_PARTS = 32;
export const AGENT_TASK_KINDS = [
  "request",
  "listings",
  "web",
  "listing",
  "proposal",
] as const;
export type AgentTaskKind = (typeof AGENT_TASK_KINDS)[number];

export type AgentReasoningPart = {
  id: string;
  text: string;
  status: "streaming" | "complete" | "stopped";
  durationMs?: number;
};
export type AgentRunDiagnostic = {
  runId: string;
  code: string;
  model: string;
  errorType: string;
  providerStatus?: number;
  stage: string;
  elapsedMs: number;
  hint: string;
};

export type AgentRunInventoryItem = {
  id: string;
  title: string;
  price: number;
  description: string;
  location: string;
  demo?: boolean;
  pickupArrangement?: string;
  pickupPoint?: string;
};

export type AgentRunRequest = {
  text: string;
  context?: {
    location?: string;
    currentQuery?: string;
    previousAnswer?: string;
    previousMatchIds?: string[];
    originalRequest?: string;
    /** Stored preferences; explicit updates in text take precedence. */
    maxPrice?: number;
    budgetSpecified?: boolean;
    radius?: number;
    pickupBy?: string;
    condition?: string;
    source?: string;
    intent?: "search" | "listing_review" | "listing_assist" | "negotiation";
    currentDraft?: AgentListingDraft;
    previousQuestion?: string;
    negotiation?: Negotiation;
    answeredQuestions?: { question: string; answer: string }[];
    recentMessages?: { role: "user" | "assistant"; text: string }[];
  };
  inventory?: AgentRunInventoryItem[];
};

export type AgentRunSource = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  /** Preview returned for this exact search result, never a generated image. */
  imageUrl?: string;
};

/** Sanitized tool failure, suitable for inline recovery without provider details. */
export type AgentToolFailure = {
  code: string;
  message: string;
  retryable: boolean;
};

export type AgentRunEvent =
  | AgentActionEvent
  | NegotiationUpdate
  | {
      type: "status";
      id: string;
      label: string;
      state: "running" | "complete" | "error" | "needs_input";
      /** The work this observed step belongs to; never a pre-generated plan. */
      task?: AgentTaskKind;
      failure?: AgentToolFailure;
    }
  | { type: "text_delta"; text: string }
  | { type: "reasoning_start"; id: string }
  | { type: "reasoning_delta"; id: string; text: string }
  | { type: "reasoning_end"; id: string; durationMs: number }
  | { type: "sources"; sources: AgentRunSource[] }
  /** Actual IDs returned by the current inventory tool search; authoritative snapshot. */
  | { type: "inventory_matches"; ids: string[] }
  /** Review-only suggestion for an observed Takeover listing; never sends a message. */
  | { type: "offer_suggestion"; listingId: string }
  | { type: "complete"; text: string; sources: AgentRunSource[]; runId: string }
  | {
      type: "error";
      code: string;
      message: string;
      diagnostic?: AgentRunDiagnostic;
    };

export type AgentRuntimeHealth = {
  configured: boolean;
  model: string;
  webSearchConfigured: boolean;
};
import type { AgentActionEvent, AgentListingDraft } from "./actions.ts";
