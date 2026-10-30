import { accountAccessToken } from "../cloud/session.ts";
import { negotiationSchema } from "../../shared/negotiation.ts";
import type {
  AgentRunEvent,
  AgentRunRequest,
  AgentRunSource,
} from "../../shared/runs";
import type {
  AgentListingDraft,
  AgentListingPatch,
  AgentPreferencesPatch,
  AgentActionEvidence,
  SellerEvidence,
} from "../../shared/actions";

const MAX_STREAM_BYTES = 2 * 1024 * 1024;
const MAX_LINE_CHARS = 160_000;
const MAX_TEXT_CHARS = 100_000;
const MAX_EVENTS = 10_000;
const MAX_SOURCES = 40;

export class AgentRunError extends Error {
  readonly code: string;
  constructor(message: string, code = "RUN_FAILED") {
    super(message);
    this.name = "AgentRunError";
    this.code = code;
  }
}

function invalidStream(): AgentRunError {
  return new AgentRunError(
    "The response could not be read. Please try again.",
    "INVALID_STREAM",
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  max: number,
  allowEmpty = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (allowEmpty || value.trim().length > 0)
  );
}

function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value))
  );
}

function boundedNumber(value: unknown, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max
  );
}

const listingStringLimits = {
  title: 180,
  description: 4000,
  condition: 120,
  dimensions: 160,
  location: 120,
} as const;

function listingPatch(value: unknown): AgentListingPatch {
  if (!record(value)) throw invalidStream();
  const patch: AgentListingPatch = {};
  for (const field of Object.keys(
    listingStringLimits,
  ) as (keyof typeof listingStringLimits)[]) {
    if (value[field] === undefined) continue;
    if (!boundedString(value[field], listingStringLimits[field], true))
      throw invalidStream();
    patch[field] = value[field];
  }
  if (value.price !== undefined) {
    if (value.price !== null && !boundedNumber(value.price, 10_000))
      throw invalidStream();
    patch.price = value.price;
  }
  if (value.pickup !== undefined) {
    if (!validDate(value.pickup)) throw invalidStream();
    patch.pickup = value.pickup;
  }
  if (!Object.keys(patch).length) throw invalidStream();
  return patch;
}

function preferencesPatch(value: unknown): AgentPreferencesPatch {
  if (!record(value)) throw invalidStream();
  const patch: AgentPreferencesPatch = {};
  for (const [field, max] of [
    ["query", 500],
    ["condition", 120],
    ["source", 120],
    ["location", 120],
  ] as const) {
    if (value[field] === undefined) continue;
    if (!boundedString(value[field], max, true)) throw invalidStream();
    patch[field] = value[field];
  }
  for (const [field, max] of [
    ["maxPrice", 1_000_000],
    ["radius", 500],
  ] as const) {
    if (value[field] === undefined) continue;
    if (!boundedNumber(value[field], max)) throw invalidStream();
    patch[field] = value[field];
  }
  if (value.pickupBy !== undefined) {
    if (!validDate(value.pickupBy)) throw invalidStream();
    patch.pickupBy = value.pickupBy;
  }
  if (!Object.keys(patch).length) throw invalidStream();
  return patch;
}

function actionEvidence(value: unknown, sellerOnly: true): SellerEvidence[];
function actionEvidence(
  value: unknown,
  sellerOnly?: false,
): AgentActionEvidence[];
function actionEvidence(
  value: unknown,
  sellerOnly = false,
): AgentActionEvidence[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8)
    throw invalidStream();
  return value.map((item) => {
    if (!record(item) || !boundedString(item.quote, 500)) throw invalidStream();
    if (item.kind === "seller") return { kind: "seller", quote: item.quote };
    if (
      !sellerOnly &&
      item.kind === "source" &&
      boundedString(item.sourceId, 160)
    )
      return { kind: "source", sourceId: item.sourceId, quote: item.quote };
    throw invalidStream();
  });
}

function requestContext(
  value: unknown,
): NonNullable<AgentRunRequest["context"]> {
  const invalid = () =>
    new AgentRunError(
      "Some request details could not be used. Update your request and try again.",
      "INVALID_CONTEXT",
    );
  if (!record(value)) throw invalid();
  const context: NonNullable<AgentRunRequest["context"]> = {};
  if (value.budgetSpecified !== undefined) {
    if (typeof value.budgetSpecified !== "boolean") throw invalid();
    context.budgetSpecified = value.budgetSpecified;
  }

  const fields = {
    location: 120,
    currentQuery: 500,
    previousAnswer: 6000,
    originalRequest: 4000,
    previousQuestion: 500,
    condition: 120,
    source: 120,
  } as const;
  for (const field of Object.keys(fields) as (keyof typeof fields)[]) {
    if (value[field] === undefined) continue;
    const item = value[field];
    if (typeof item !== "string") throw invalid();
    const text =
      field === "previousAnswer" ||
      field === "originalRequest" ||
      field === "previousQuestion"
        ? item
        : item.trim();
    if (!boundedString(text, fields[field], true)) throw invalid();
    context[field] = text;
  }
  for (const [field, max] of [
    ["maxPrice", 1_000_000],
    ["radius", 500],
  ] as const) {
    const number = value[field];
    if (number === undefined) continue;
    if (
      typeof number !== "number" ||
      !Number.isFinite(number) ||
      number < 0 ||
      number > max
    )
      throw invalid();
    context[field] = number;
  }
  if (value.pickupBy !== undefined) {
    if (typeof value.pickupBy !== "string") throw invalid();
    const date = value.pickupBy.trim();
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw invalid();
    context.pickupBy = date;
  }
  if (value.intent !== undefined) {
    if (
      value.intent !== "search" &&
      value.intent !== "listing_review" &&
      value.intent !== "listing_assist" &&
      value.intent !== "negotiation"
    )
      throw invalid();
    context.intent = value.intent;
  }
  if (value.currentDraft !== undefined) {
    const draft = value.currentDraft;
    if (
      !record(draft) ||
      !boundedString(draft.raw, 4000, true) ||
      !validDate(draft.pickup) ||
      (draft.price !== null && !boundedNumber(draft.price, 10_000))
    )
      throw invalid();
    for (const field of Object.keys(
      listingStringLimits,
    ) as (keyof typeof listingStringLimits)[]) {
      if (!boundedString(draft[field], listingStringLimits[field], true))
        throw invalid();
    }
    context.currentDraft = {
      ...listingPatch(draft),
      raw: draft.raw,
    } as AgentListingDraft;
  }
  if (value.negotiation !== undefined) {
    const parsed = negotiationSchema.safeParse(value.negotiation);
    if (!parsed.success) throw invalid();
    context.negotiation = parsed.data;
  }
  if (value.recentMessages !== undefined) {
    if (
      !Array.isArray(value.recentMessages) ||
      value.recentMessages.length > 12 ||
      !value.recentMessages.every(
        (item) =>
          record(item) &&
          (item.role === "user" || item.role === "assistant") &&
          boundedString(item.text, 4000, true),
      )
    )
      throw invalid();
    context.recentMessages = value.recentMessages.map((item) => ({
      role: item.role,
      text: item.text,
    }));
  }
  return context;
}

export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function sources(value: unknown): AgentRunSource[] {
  if (!Array.isArray(value) || value.length > MAX_SOURCES)
    throw invalidStream();
  const unique = new Map<string, AgentRunSource>();
  for (const item of value) {
    if (
      !record(item) ||
      !boundedString(item.id, 160) ||
      !boundedString(item.title, 1000) ||
      !boundedString(item.url, 4096) ||
      !safeSourceUrl(item.url) ||
      !boundedString(item.snippet, 6000, true)
    ) {
      throw invalidStream();
    }
    const imageUrl = boundedString(item.imageUrl, 4096)
      ? safeSourceUrl(item.imageUrl)
      : null;
    unique.set(item.id, {
      id: item.id,
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      ...(imageUrl ? { imageUrl } : {}),
    });
  }
  return [...unique.values()];
}

function parseEvent(line: string): AgentRunEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw invalidStream();
  }
  if (!record(value)) throw invalidStream();
  switch (value.type) {
    case "negotiation_update": {
      const parsed = negotiationSchema.safeParse(value.negotiation);
      if (
        !parsed.success ||
        !Number.isInteger(value.previousVersion) ||
        Number(value.previousVersion) < 0 ||
        parsed.data.version !== Number(value.previousVersion) + 1
      )
        throw invalidStream();
      return {
        type: "negotiation_update",
        previousVersion: Number(value.previousVersion),
        negotiation: parsed.data,
      };
    }
    case "question": {
      const priceInput = value.input;
      if (
        priceInput !== undefined &&
        (!record(priceInput) ||
          priceInput.type !== "price" ||
          typeof priceInput.min !== "number" ||
          !Number.isFinite(priceInput.min) ||
          priceInput.min < 0 ||
          typeof priceInput.max !== "number" ||
          !Number.isFinite(priceInput.max) ||
          priceInput.max > 10_000 ||
          priceInput.max <= priceInput.min ||
          typeof priceInput.step !== "number" ||
          !Number.isFinite(priceInput.step) ||
          priceInput.step <= 0 ||
          priceInput.step > 1000 ||
          priceInput.step > priceInput.max - priceInput.min ||
          (priceInput.value !== undefined &&
            (typeof priceInput.value !== "number" ||
              !Number.isFinite(priceInput.value) ||
              priceInput.value < priceInput.min ||
              priceInput.value > priceInput.max)))
      )
        throw invalidStream();
      if (
        !boundedString(value.id, 160) ||
        !boundedString(value.question, 500) ||
        (value.choices !== undefined &&
          (!Array.isArray(value.choices) ||
            value.choices.length > 5 ||
            !value.choices.every((choice) => boundedString(choice, 120))))
      )
        throw invalidStream();
      return {
        type: "question",
        id: value.id,
        question: value.question,
        ...(priceInput
          ? {
              input:
                priceInput as import("../../shared/actions").AgentQuestionEvent["input"],
            }
          : {}),
        ...(Array.isArray(value.choices)
          ? { choices: [...new Set(value.choices as string[])] }
          : {}),
      };
    }
    case "listing_patch": {
      if (
        !boundedString(value.id, 160) ||
        !boundedString(value.reason, 500) ||
        typeof value.requiresAcceptance !== "boolean"
      )
        throw invalidStream();
      const patch = listingPatch(value.patch);
      const evidence = actionEvidence(value.evidence);
      if (
        "price" in patch &&
        evidence.some((item) => item.kind === "source") &&
        (!value.requiresAcceptance || Object.keys(patch).length !== 1)
      )
        throw invalidStream();
      return {
        type: "listing_patch",
        id: value.id,
        patch,
        reason: value.reason,
        evidence,
        requiresAcceptance: value.requiresAcceptance,
      };
    }
    case "preferences_patch":
      if (!boundedString(value.id, 160) || !boundedString(value.reason, 500))
        throw invalidStream();
      return {
        type: "preferences_patch",
        id: value.id,
        patch: preferencesPatch(value.patch),
        reason: value.reason,
        evidence: actionEvidence(value.evidence, true),
      };
    case "status":
      if (
        !boundedString(value.id, 160) ||
        !boundedString(value.label, 1000) ||
        (value.state !== "running" &&
          value.state !== "complete" &&
          value.state !== "error" &&
          value.state !== "needs_input")
      )
        throw invalidStream();
      return {
        type: "status",
        id: value.id,
        label: value.label,
        state: value.state,
      };
    case "text_delta":
      if (!boundedString(value.text, MAX_TEXT_CHARS, true))
        throw invalidStream();
      return { type: "text_delta", text: value.text };
    case "sources":
      return { type: "sources", sources: sources(value.sources) };
    case "offer_suggestion":
      if (
        !boundedString(value.listingId, 120) ||
        /[\u0000-\u001f\u007f]/.test(value.listingId)
      )
        throw invalidStream();
      return { type: "offer_suggestion", listingId: value.listingId };
    case "inventory_matches":
      if (
        !Array.isArray(value.ids) ||
        value.ids.length > 12 ||
        value.ids.some(
          (id) => !boundedString(id, 120) || /[\u0000-\u001f\u007f]/.test(id),
        ) ||
        new Set(value.ids).size !== value.ids.length
      )
        throw invalidStream();
      return { type: "inventory_matches", ids: value.ids };
    case "complete":
      if (
        !boundedString(value.text, MAX_TEXT_CHARS, true) ||
        !boundedString(value.runId, 160)
      )
        throw invalidStream();
      return {
        type: "complete",
        text: value.text,
        sources: sources(value.sources),
        runId: value.runId,
      };
    case "error":
      if (
        !boundedString(value.code, 160) ||
        !boundedString(value.message, 2000)
      )
        throw invalidStream();
      if (value.diagnostic !== undefined) {
        const d = value.diagnostic;
        if (
          !record(d) ||
          !boundedString(d.runId, 160) ||
          !boundedString(d.code, 160) ||
          !boundedString(d.model, 160) ||
          !boundedString(d.errorType, 80) ||
          !boundedString(d.stage, 160) ||
          !boundedString(d.hint, 500) ||
          typeof d.elapsedMs !== "number" ||
          !Number.isFinite(d.elapsedMs) ||
          d.elapsedMs < 0 ||
          (d.providerStatus !== undefined &&
            (typeof d.providerStatus !== "number" ||
              !Number.isInteger(d.providerStatus)))
        )
          throw invalidStream();
        return {
          type: "error",
          code: value.code,
          message: value.message,
          diagnostic: {
            runId: d.runId,
            code: d.code,
            model: d.model,
            errorType: d.errorType,
            stage: d.stage,
            hint: d.hint,
            elapsedMs: d.elapsedMs,
            ...(d.providerStatus !== undefined
              ? { providerStatus: d.providerStatus }
              : {}),
          },
        };
      }
      return { type: "error", code: value.code, message: value.message };
    default:
      throw invalidStream();
  }
}

/** Parse NDJSON without assuming network chunks end at a character or line boundary. */
export async function readAgentRunStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AgentRunEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let bytes = 0;
  let events = 0;
  let textLength = 0;
  let completed = false;
  const stepIds = new Set<string>();
  const actionIds = new Set<string>();
  const abort = () => {
    void reader.cancel(signal?.reason).catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });

  function emit(line: string) {
    if (!line.trim()) return;
    if (line.length > MAX_LINE_CHARS || ++events > MAX_EVENTS)
      throw invalidStream();
    const event = parseEvent(line);
    if (event.type === "text_delta") {
      textLength += event.text.length;
      if (textLength > MAX_TEXT_CHARS) throw invalidStream();
    }
    if (event.type === "status") {
      stepIds.add(event.id);
      if (stepIds.size > 100) throw invalidStream();
    }
    if (
      event.type === "question" ||
      event.type === "listing_patch" ||
      event.type === "preferences_patch"
    ) {
      if (actionIds.has(event.id)) throw invalidStream();
      actionIds.add(event.id);
      if (actionIds.size > 32) throw invalidStream();
    }
    signal?.throwIfAborted();
    onEvent(event);
    if (event.type === "error")
      throw new AgentRunError(event.message, event.code);
    if (event.type === "complete") completed = true;
  }

  try {
    signal?.throwIfAborted();
    while (!completed) {
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (value) {
        bytes += value.byteLength;
        if (bytes > MAX_STREAM_BYTES) throw invalidStream();
      }
      try {
        buffer += decoder.decode(value, { stream: !done });
      } catch {
        throw invalidStream();
      }
      let newline = buffer.indexOf("\n");
      while (newline >= 0 && !completed) {
        emit(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
      if (buffer.length > MAX_LINE_CHARS) throw invalidStream();
      if (done) {
        if (!completed && buffer.trim()) emit(buffer);
        break;
      }
    }
    if (!completed)
      throw new AgentRunError(
        "The connection ended before the response was finished. Please try again.",
        "INCOMPLETE_STREAM",
      );
  } catch (error) {
    if (signal?.aborted || error instanceof AgentRunError) throw error;
    throw new AgentRunError(
      "The connection was interrupted. Your partial response is still here; try again.",
      "NETWORK_ERROR",
    );
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function failureMessage(response: Response): Promise<AgentRunError> {
  const fallback = new AgentRunError(
    "The agent could not start. Please try again.",
    `HTTP_${response.status}`,
  );
  if (!response.body) return fallback;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      bytes += value?.byteLength ?? 0;
      if (bytes > 16_384) return fallback;
      body += decoder.decode(value, { stream: !done });
      if (done) break;
    }
    const data: unknown = JSON.parse(body);
    if (
      record(data) &&
      record(data.error) &&
      boundedString(data.error.message, 2000)
    ) {
      return new AgentRunError(
        data.error.message,
        boundedString(data.error.code, 160) ? data.error.code : fallback.code,
      );
    }
  } catch {
    /* Use the readable fallback for non-JSON server errors. */
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return fallback;
}

export async function streamAgentRun(
  request: AgentRunRequest,
  {
    onEvent,
    signal,
    accessToken,
  }: {
    onEvent: (event: AgentRunEvent) => void;
    signal?: AbortSignal;
    accessToken?: string;
  },
): Promise<void> {
  accessToken ??= await accountAccessToken();
  // Inventory objects can originate from full listings. Pick only the agreed
  // fields, never attached photos, account data, or incidental client state.
  const payload: AgentRunRequest = {
    text: request.text,
    ...(request.context !== undefined
      ? {
          context: requestContext(request.context),
        }
      : {}),
    ...(request.inventory
      ? {
          inventory: request.inventory.map(
            ({
              id,
              title,
              price,
              description,
              location,
              demo,
              pickupArrangement,
              pickupPoint,
            }) => ({
              id,
              title,
              price,
              description,
              location,
              ...(demo ? { demo: true } : {}),
              ...(pickupArrangement ? { pickupArrangement } : {}),
              ...(pickupPoint ? { pickupPoint } : {}),
            }),
          ),
        }
      : {}),
  };
  let response: Response;
  try {
    response = await fetch("/api/agent/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AgentRunError(
      "The agent could not connect. Your request is still here; try again.",
      "NETWORK_ERROR",
    );
  }
  signal?.throwIfAborted();
  if (!response.ok) {
    const error = await failureMessage(response);
    signal?.throwIfAborted();
    throw error;
  }
  if (!response.body) throw invalidStream();
  await readAgentRunStream(response.body, onEvent, signal);
}
