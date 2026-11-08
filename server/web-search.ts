import type { AgentRunSource } from "../shared/runs.ts";
import { setTimeout as delay } from "node:timers/promises";
import {
  isMarketplaceOffer,
  marketplaceQuery,
  marketplaceDomains,
  matchesMarketplaceSource,
} from "./marketplace-policy.ts";

export class WebSearchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "WebSearchError";
    this.code = code;
  }
}

export type WebSearchConfig = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Queue admission has its own budget; it must not consume fetch time. */
  queueTimeoutMs?: number;
  /** General product research is distinct from discovering actual offers. */
  scope?: "offers" | "research";
  source?: string;
};
export type WebSearchResult = Omit<AgentRunSource, "id">;

type SearchQueue = {
  tail: Promise<void>;
  pending: number;
  nextStart: number;
  cleanup?: ReturnType<typeof setTimeout>;
};
// Shared across runtime instances: concurrent users still share one Brave quota.
const searchQueues = new Map<string, SearchQueue>();
const minimumStartInterval = 1_100;

function waitForTurn(previous: Promise<void>, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    void previous.then(() => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) reject(signal.reason);
      else resolve();
    });
  });
}

async function queuedSearch<T>(
  apiKey: string,
  signal: AbortSignal,
  queueTimeoutMs: number,
  execute: (queue: SearchQueue) => Promise<T>,
): Promise<T> {
  let queue = searchQueues.get(apiKey);
  if (!queue) {
    queue = { tail: Promise.resolve(), pending: 0, nextStart: 0 };
    searchQueues.set(apiKey, queue);
  }
  if (queue.pending >= 16)
    throw new WebSearchError(
      "WEB_SEARCH_BUSY",
      "Web search is busy. Try again shortly.",
    );
  clearTimeout(queue.cleanup);
  const previous = queue.tail;
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  // A cancelled waiter must not let later requests bypass its predecessor.
  queue.tail = previous.then(() => current);
  queue.pending++;
  const timeout = AbortSignal.timeout(queueTimeoutMs);
  const waiting = AbortSignal.any([signal, timeout]);
  let admitted = false;
  try {
    await waitForTurn(previous, waiting);
    while (queue.nextStart > performance.now())
      await delay(Math.ceil(queue.nextStart - performance.now()), undefined, {
        signal: waiting,
      });
    waiting.throwIfAborted();
    admitted = true;
    queue.nextStart = performance.now() + minimumStartInterval;
    // Brave limits request starts, not their duration. Slow responses must not
    // serialize every tester behind one network request.
    release();
    return await execute(queue);
  } catch (error) {
    if (!admitted && !signal.aborted && timeout.aborted)
      throw new WebSearchError(
        "WEB_SEARCH_BUSY",
        "Web search is busy. Try again shortly.",
      );
    throw error;
  } finally {
    release();
    queue.pending--;
    if (queue.pending === 0) {
      const idleQueue = queue;
      queue.cleanup = setTimeout(
        () => {
          if (idleQueue.pending === 0 && searchQueues.get(apiKey) === idleQueue)
            searchQueues.delete(apiKey);
        },
        Math.max(0, queue.nextStart - performance.now()),
      );
      queue.cleanup.unref();
    }
  }
}

/** Brave exposes separate burst/monthly resets; retry only short-lived limits. */
function retryDelay(response: Response): number {
  const remaining = response.headers
    .get("X-RateLimit-Remaining")
    ?.split(",")
    .map(Number);
  const resets =
    response.headers.get("X-RateLimit-Reset")?.split(",").map(Number) ?? [];
  const resetMs = resets.reduce(
    (longest, seconds, index) =>
      Number.isFinite(seconds) &&
      seconds >= 0 &&
      (remaining ? remaining[index] === 0 : index === 0)
        ? Math.max(longest, seconds * 1000)
        : longest,
    0,
  );
  const retryAfter = response.headers.get("Retry-After");
  const seconds = retryAfter === null ? NaN : Number(retryAfter);
  const retryMs = Number.isFinite(seconds)
    ? seconds * 1000
    : retryAfter
      ? Date.parse(retryAfter) - Date.now()
      : 0;
  return Math.max(
    minimumStartInterval,
    resetMs,
    Number.isFinite(retryMs) ? retryMs : 0,
  );
}

export function validSourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function plain(value: unknown, limit: number): string {
  const entities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    hellip: "…",
    euro: "€",
    pound: "£",
    copy: "©",
    reg: "®",
    trade: "™",
    agrave: "à",
    aacute: "á",
    acirc: "â",
    auml: "ä",
    aring: "å",
    aelig: "æ",
    ccedil: "ç",
    egrave: "è",
    eacute: "é",
    ecirc: "ê",
    euml: "ë",
    igrave: "ì",
    iacute: "í",
    icirc: "î",
    iuml: "ï",
    ntilde: "ñ",
    ograve: "ò",
    oacute: "ó",
    ocirc: "ô",
    ouml: "ö",
    oslash: "ø",
    ugrave: "ù",
    uacute: "ú",
    ucirc: "û",
    uuml: "ü",
    szlig: "ß",
  };
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
          if (name.startsWith("#")) {
            const hex = name[1]?.toLowerCase() === "x";
            const code = Number.parseInt(
              name.slice(hex ? 2 : 1),
              hex ? 16 : 10,
            );
            return code > 0 &&
              code <= 0x10ffff &&
              !(code >= 0xd800 && code <= 0xdfff)
              ? String.fromCodePoint(code)
              : "�";
          }
          const decoded = entities[name.toLowerCase()];
          if (!decoded) return entity;
          return /^[A-Z][a-z]+$/.test(name) ? decoded.toUpperCase() : decoded;
        })
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, limit)
    : "";
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body)
    throw new WebSearchError(
      "WEB_SEARCH_INVALID_RESPONSE",
      "Web search returned an incomplete response.",
    );
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1024 * 1024) {
        await reader.cancel();
        throw new WebSearchError(
          "WEB_SEARCH_INVALID_RESPONSE",
          "Web search returned too much data.",
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof WebSearchError) throw error;
    throw new WebSearchError(
      "WEB_SEARCH_INVALID_RESPONSE",
      "Web search returned an incomplete response.",
    );
  } finally {
    reader.releaseLock();
  }
}

export async function searchWeb(
  query: string,
  config: WebSearchConfig,
  signal?: AbortSignal,
): Promise<WebSearchResult[]> {
  if (
    !query.trim() ||
    query.length > 400 ||
    query.trim().split(/\s+/).length > 75
  )
    throw new WebSearchError(
      "INVALID_SEARCH_QUERY",
      "Use a shorter web search query.",
    );
  if (!config.apiKey.trim())
    throw new WebSearchError(
      "WEB_SEARCH_NOT_CONFIGURED",
      "Web search is not configured.",
    );
  const timeout = AbortSignal.timeout(35_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  const offersOnly = config.scope !== "research";
  if (offersOnly) {
    const domains = marketplaceDomains(config.source);
    if (!domains)
      throw new WebSearchError(
        "UNSUPPORTED_SOURCE",
        "This marketplace is not supported yet. Choose a supported source.",
      );
    if (domains.length === 0) return [];
  }
  const scopedQuery = offersOnly
    ? marketplaceQuery(query.trim(), config.source)
    : query.trim();
  if (scopedQuery.length > 600 || scopedQuery.split(/\s+/).length > 75)
    throw new WebSearchError(
      "INVALID_SEARCH_QUERY",
      "Use a shorter web search query.",
    );
  url.searchParams.set("q", scopedQuery);
  url.searchParams.set("count", "20");
  url.searchParams.set("text_decorations", "false");
  url.searchParams.set("result_filter", "web");
  url.searchParams.set("country", "CH");
  url.searchParams.set("units", "metric");
  try {
    combined.throwIfAborted();
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await queuedSearch(
        config.apiKey.trim(),
        combined,
        config.queueTimeoutMs ?? 15_000,
        async (queue) => {
          const fetchTimeout = AbortSignal.timeout(config.timeoutMs ?? 12_000);
          const fetchSignal = AbortSignal.any([combined, fetchTimeout]);
          let response: Response;
          try {
            response = await (config.fetchImpl ?? fetch)(url, {
              headers: {
                Accept: "application/json",
                "X-Subscription-Token": config.apiKey,
              },
              signal: fetchSignal,
              redirect: "error",
            });
          } catch (error) {
            combined.throwIfAborted();
            if (fetchTimeout.aborted)
              throw new WebSearchError(
                "WEB_SEARCH_TIMEOUT",
                "Web search took too long. Try again.",
              );
            // A single retry for a transient connection failure, never an aborted request.
            if (attempt === 0 && error instanceof TypeError) return null;
            throw error;
          }
          if (!response.ok) {
            const waitMs = retryDelay(response);
            await response.body?.cancel();
            if (response.status === 401 || response.status === 403)
              throw new WebSearchError(
                "WEB_SEARCH_AUTH",
                "Web search is not available with the configured search key.",
              );
            if (response.status === 429 && waitMs > 5_000)
              throw new WebSearchError(
                "WEB_SEARCH_QUOTA",
                "The web search allowance is used up. Try again after it resets.",
              );
            if (
              response.status === 429 ||
              [502, 503, 504].includes(response.status)
            ) {
              // All testers share the provider cooldown, including a retry already queued.
              queue.nextStart = Math.max(
                queue.nextStart,
                performance.now() + Math.min(waitMs, 5_000),
              );
              if (attempt === 0 && waitMs <= 5_000) return null;
            }
            throw new WebSearchError(
              response.status === 429
                ? "WEB_SEARCH_BUSY"
                : "WEB_SEARCH_UNAVAILABLE",
              response.status === 429
                ? "Web search is busy. Try again shortly."
                : "Web search is temporarily unavailable. Try again shortly.",
            );
          }
          let body: { web?: { results?: unknown } };
          try {
            body = (await boundedJson(response)) as typeof body;
          } catch (error) {
            combined.throwIfAborted();
            if (fetchTimeout.aborted)
              throw new WebSearchError(
                "WEB_SEARCH_TIMEOUT",
                "Web search took too long. Try again.",
              );
            throw error;
          }
          if (
            !body ||
            typeof body !== "object" ||
            (body.web !== undefined &&
              (typeof body.web !== "object" ||
                body.web === null ||
                !Array.isArray(body.web.results)))
          )
            throw new WebSearchError(
              "WEB_SEARCH_INVALID_RESPONSE",
              "Web search returned an incomplete response.",
            );
          const results = body.web?.results ?? [];
          if (!Array.isArray(results))
            throw new WebSearchError(
              "WEB_SEARCH_INVALID_RESPONSE",
              "Web search returned an incomplete response.",
            );
          const seen = new Set<string>();
          return results
            .slice(0, 20)
            .flatMap((item) => {
              if (!item || typeof item !== "object") return [];
              const entry = item as Record<string, unknown>;
              let sourceUrl = validSourceUrl(entry.url);
              if (sourceUrl && offersOnly) {
                const offerUrl = new URL(sourceUrl);
                // Supported marketplaces identify the ad in its path. Tracking
                // and variant parameters must not turn one ad into several leads.
                offerUrl.search = "";
                sourceUrl = offerUrl.href;
              }
              const title = plain(entry.title, 180);
              const snippet = plain(entry.description, 700);
              if (!sourceUrl || !title || seen.has(sourceUrl)) return [];
              if (
                offersOnly &&
                (!isMarketplaceOffer(sourceUrl, title, snippet) ||
                  !matchesMarketplaceSource(sourceUrl, config.source))
              )
                return [];
              seen.add(sourceUrl);
              const thumbnail = entry.thumbnail;
              const imageUrl =
                thumbnail &&
                typeof thumbnail === "object" &&
                !Array.isArray(thumbnail)
                  ? validSourceUrl((thumbnail as Record<string, unknown>).src)
                  : null;
              return [
                {
                  title,
                  url: sourceUrl,
                  snippet,
                  ...(imageUrl ? { imageUrl } : {}),
                },
              ];
            })
            .slice(0, 5);
        },
      );
      if (result !== null) return result;
    }
    throw new WebSearchError(
      "WEB_SEARCH_UNAVAILABLE",
      "Web search is temporarily unavailable. Try again shortly.",
    );
  } catch (error) {
    if (signal?.aborted)
      throw new WebSearchError(
        "REQUEST_CANCELLED",
        "The search was cancelled.",
      );
    if (timeout.aborted)
      throw new WebSearchError(
        "WEB_SEARCH_TIMEOUT",
        "Web search took too long. Try again.",
      );
    if (error instanceof WebSearchError) throw error;
    throw new WebSearchError(
      "WEB_SEARCH_UNAVAILABLE",
      "Web search is unavailable. Please try again.",
    );
  }
}
