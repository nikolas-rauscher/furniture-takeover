import type {
  AssistRequest,
  AssistResponse,
  HealthResponse,
} from "../shared/agent.ts";
import { assistWithDeepSeek, type ProviderConfig } from "./deepseek.ts";
import { explicitPrice } from "./facts.ts";
import { validateRequest } from "./validation.ts";
import { AgentError, invalidOutput } from "./errors.ts";
import {
  defaults,
  extractSearchConstraints,
  parseSearch,
} from "../shared/marketplace.ts";

export type AgentService = {
  health: () => HealthResponse;
  assist: (input: unknown, signal?: AbortSignal) => Promise<AssistResponse>;
};

const normalized = (value: string) =>
  value.toLowerCase().replace(/×/g, "x").replace(/\s+/g, " ").trim();

function groundSearch(
  response: AssistResponse,
  request: AssistRequest,
): AssistResponse {
  if (request.intent !== "search") return response;
  if (response.metadata.query === undefined) throw invalidOutput();
  const stated = extractSearchConstraints(request.text);
  const context = request.context ?? {};
  const constraints = {
    maxPrice: stated.maxPrice ?? context.maxPrice,
    radius: stated.radius ?? context.radius,
    pickupBy: stated.pickup ?? context.pickupBy,
  };
  const parsed = parseSearch(request.text);
  const clearsItem =
    /\b(?:all furniture|anything|everything|alle möbel|alles)\b/i.test(
      request.text,
    );
  const query =
    !parsed.query &&
    context.currentQuery &&
    !clearsItem &&
    Object.keys(stated).length > 0
      ? context.currentQuery
      : response.metadata.query;
  // While typing, an incomplete request can legitimately need clarification.
  // An explicit empty query is different from absent/malformed required metadata.
  if (!query.trim() && parsed.query && response.missingDetails.length === 0)
    throw invalidOutput();
  const metadata = {
    ...response.metadata,
    query,
    ...Object.fromEntries(
      Object.entries(constraints).filter(([, value]) => value !== undefined),
    ),
  };
  const identityWords = normalized(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const suggestions = response.suggestions.filter((suggestion) => {
    const candidate = parseSearch(suggestion, defaults);
    const supplied = extractSearchConstraints(suggestion);
    const words = normalized(candidate.query).split(/[^\p{L}\p{N}]+/u);
    return (
      identityWords.every((word) => words.includes(word)) &&
      (stated.maxPrice === undefined || supplied.maxPrice === stated.maxPrice) &&
      (supplied.maxPrice === undefined || constraints.maxPrice === undefined ||
        supplied.maxPrice === constraints.maxPrice) &&
      (stated.radius === undefined || supplied.radius === stated.radius) &&
      (supplied.radius === undefined || constraints.radius === undefined ||
        supplied.radius === constraints.radius) &&
      (!constraints.pickupBy || supplied.pickup === constraints.pickupBy)
    );
  });
  return { ...response, metadata, suggestions };
}

// Translate only condition language the seller actually supplied; the photograph
// and provider's guess are never evidence of overall condition.
function sellerCondition(notes: string): string | null {
  const direct = {
    "very good": "Very good",
    good: "Good",
    used: "Used",
    new: "New",
  };
  if (Object.hasOwn(direct, notes)) return direct[notes as keyof typeof direct];
  const aliases: [string, RegExp][] = [
    [
      "Very good",
      /\b(?:very good condition|condition\s*:\s*very good|like new|as good as new|wie neu|neuwertig|sehr gute[mnr]? zustand|tr[eè]s bon [eé]tat)\b/g,
    ],
    [
      "Good",
      /\b(?:good condition|condition\s*:\s*good|gute[mnr]? zustand|bon [eé]tat)\b/g,
    ],
    [
      "Used",
      /\b(?:used condition|condition\s*:\s*used|gebraucht|usag[eé]|d'occasion)\b/g,
    ],
    [
      "New",
      /\b(?:new condition|condition\s*:\s*new|brand new|unused|unbenutzt|neuf)\b/g,
    ],
  ];
  for (const [canonical, pattern] of aliases) {
    for (const match of notes.matchAll(pattern)) {
      const prefix = notes.slice(Math.max(0, match.index! - 35), match.index);
      if (
        /\b(?:not|never|no|nicht|kein|isn't|pas|nicht mehr)\b[^,;.]{0,30}$/.test(
          prefix,
        )
      )
        continue;
      return canonical;
    }
  }
  return null;
}

function exactSellerCondition(
  value: string | null | undefined,
  notes: string,
): string | null {
  const phrase = value ? normalized(value) : "";
  if (!phrase) return null;
  for (
    let start = notes.indexOf(phrase);
    start >= 0;
    start = notes.indexOf(phrase, start + phrase.length)
  ) {
    const prefix = notes.slice(Math.max(0, start - 35), start);
    const previous = notes[start - 1] ?? "";
    const next = notes[start + phrase.length] ?? "";
    if (/[\p{L}\p{N}]/u.test(previous) || /[\p{L}\p{N}]/u.test(next)) continue;
    if (
      /\b(?:not|never|no|nicht|kein|isn't|pas|nicht mehr)\b[^,;.]{0,30}$/.test(
        prefix,
      )
    )
      continue;
    return value!.trim();
  }
  return null;
}

function groundListing(
  response: AssistResponse,
  request: AssistRequest,
): AssistResponse {
  if (request.intent !== "listing") return response;
  if (!response.metadata.title?.trim()) throw invalidOutput();
  const metadata = { ...response.metadata };
  const notes = normalized(request.text);
  const providedPrice = explicitPrice(request.text);
  // These details must come from the seller, even when a photo is supplied.
  metadata.price = providedPrice;
  metadata.condition =
    sellerCondition(notes) ?? exactSellerCondition(metadata.condition, notes);
  const dimensions = metadata.dimensions;
  metadata.dimensions =
    dimensions && notes.includes(normalized(dimensions)) ? dimensions : null;
  if (
    metadata.location &&
    normalized(metadata.location) !==
      normalized(request.context?.location ?? "") &&
    !notes.includes(normalized(metadata.location))
  )
    delete metadata.location;
  const item = normalized([metadata.title, ...metadata.keywords].join(" "));
  const compactMedia =
    /\b(?:books?|buch|b[uü]cher|livres?|vinyl|records?|cd|dvd|video games?)\b/.test(
      item,
    );
  const missingDetails = response.missingDetails.filter(
    (detail) =>
      !(
        compactMedia &&
        /\b(?:dimensions?|measurements?|weight|size)\b/i.test(detail)
      ) &&
      !(metadata.condition && /\bcondition\b/i.test(detail)) &&
      !(metadata.price !== null && /\b(?:price|pricing)\b/i.test(detail)),
  );
  for (const [field, label] of [
    ["price", "Asking price"],
    ["condition", "Condition"],
  ] as const) {
    if (
      metadata[field] === null &&
      !missingDetails.some((item) => item.toLowerCase().includes(field))
    )
      missingDetails.push(label);
  }
  return {
    ...response,
    metadata,
    // Pre-draft suggestions are facts to add, never a second questionnaire.
    suggestions: response.suggestions.filter((item) => !/[?？]/.test(item)),
    missingDetails: missingDetails.slice(0, 6),
  };
}

export function createAgentService(config: ProviderConfig): AgentService {
  const apiKey = config.apiKey.trim();
  const model = config.model || "deepseek-flash";
  const health = (): HealthResponse => ({
    configured: Boolean(apiKey),
    mode: apiKey ? "live" : "unconfigured",
    model,
  });
  return {
    health,
    async assist(input, signal) {
      if (signal?.aborted)
        throw new AgentError(
          499,
          "REQUEST_CANCELLED",
          "The request was cancelled.",
        );
      const request = validateRequest(input);
      if (!apiKey)
        throw new AgentError(
          503,
          "AGENT_NOT_CONFIGURED",
          "Add a DeepSeek API key to the server .env to enable the agent.",
        );
      const output = await assistWithDeepSeek(
        request,
        { ...config, apiKey, model },
        signal,
      );
      return groundListing(
        groundSearch({ ...output, mode: "live", model }, request),
        request,
      );
    },
  };
}
