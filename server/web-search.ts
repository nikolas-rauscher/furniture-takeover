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
    const abort = () => reject(signal.reason);
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
  execute: () => Promise<T>,
): Promise<T> {
  let queue = searchQueues.get(apiKey);
  if (!queue) {
    queue = { tail: Promise.resolve(), pending: 0, nextStart: 0 };
    searchQueues.set(apiKey, queue);
  }
  clearTimeout(queue.cleanup);
  const previous = queue.tail;
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  // A cancelled waiter must not let later requests bypass its predecessor.
  queue.tail = previous.then(() => current);
  queue.pending++;
  try {
    await waitForTurn(previous, signal);
    const waitMs = queue.nextStart - performance.now();
    if (waitMs > 0) await delay(Math.ceil(waitMs), undefined, { signal });
    signal.throwIfAborted();
    queue.nextStart = performance.now() + minimumStartInterval;
    return await execute();
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
  const timeout = AbortSignal.timeout(config.timeoutMs ?? 12_000);
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
  url.searchParams.set(
    "q",
    offersOnly ? marketplaceQuery(query.trim(), config.source) : query.trim(),
  );
  url.searchParams.set("count", "20");
  url.searchParams.set("text_decorations", "false");
  try {
    combined.throwIfAborted();
    return await queuedSearch(config.apiKey.trim(), combined, async () => {
      const response = await (config.fetchImpl ?? fetch)(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": config.apiKey,
        },
        signal: combined,
        redirect: "error",
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new WebSearchError(
          response.status === 429
            ? "WEB_SEARCH_BUSY"
            : "WEB_SEARCH_UNAVAILABLE",
          response.status === 429
            ? "Web search is busy. Try again shortly."
            : "Web search is unavailable. Check the server search configuration and try again.",
        );
      }
      const body = (await boundedJson(response)) as {
        web?: { results?: unknown };
      };
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
          const sourceUrl = validSourceUrl(entry.url);
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
    });
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
