import {
  defaults,
  filterProducts,
  money,
  type Criteria,
  type Product,
  type SearchJob,
} from "../../shared/marketplace.ts";

/** Alert fatigue guard: older unread alerts for one search are kept, extras wait. */
export const MAX_UNREAD_PER_SEARCH = 5;
const MAX_ALERTS = 50;

/** The search UI's existing "Any budget" value; it never limits a match. */
export const NO_BUDGET = 1_000_000;

/**
 * Whether the buyer actually stated a price limit. The default ceiling is what
 * an unspecified budget falls back to, so it counts as no stated limit.
 */
export const hasBudget = (criteria: Criteria) =>
  criteria.maxPrice < NO_BUDGET && criteria.maxPrice !== defaults.maxPrice;

export type AlertItem = {
  id: string;
  jobId: string;
  listingId: string;
  /** Snapshot of the listing when it first matched. */
  title: string;
  reason: string;
  createdAt: string;
  read: boolean;
};

export type AlertBaseline = {
  /** Criteria the baseline was taken for; an edited search starts over silently. */
  signature: string;
  listingIds: string[];
};

export type AlertsState = {
  version: 1;
  baselines: Record<string, AlertBaseline>;
  alerts: AlertItem[];
};

export const emptyAlerts = (): AlertsState => ({
  version: 1,
  baselines: {},
  alerts: [],
});

const signature = (criteria: Criteria) => JSON.stringify(criteria);

/** Only listings a buyer could act on right now can raise an alert. */
export function currentMatches(listings: Product[], criteria: Criteria) {
  return filterProducts(listings, criteria).filter(
    (item) => item.status === "active",
  );
}

/** Facts from the listing only; never claims more than the seller stated. */
export function matchReason(item: Product, criteria: Criteria): string {
  const wanted =
    criteria.query || (criteria.category !== "All" ? criteria.category : "");
  return [
    wanted ? `Matches "${wanted}"` : "Matches your search",
    hasBudget(criteria)
      ? `${money(item.price)} (limit ${money(criteria.maxPrice)})`
      : money(item.price),
    item.condition,
    item.pickupPoint?.name ?? item.location,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Compares each saved search with the listings visible now. A search's first
 * pass only records a baseline, so existing listings never raise alerts. After
 * that, a listing alerts when it starts matching: newly listed, edited to fit,
 * or active again. Paused searches keep their baseline current without alerts,
 * so resuming does not flood the buyer.
 */
export function updateAlerts(
  state: AlertsState,
  jobs: Pick<SearchJob, "id" | "criteria" | "paused">[],
  listings: Product[],
  now: Date,
): AlertsState {
  const baselines: Record<string, AlertBaseline> = {};
  const created: AlertItem[] = [];
  const matchesByJob = new Map(
    jobs.map((job) => [job.id, currentMatches(listings, job.criteria)]),
  );
  const matchingIdsByJob = new Map(
    [...matchesByJob].map(([id, matches]) => [
      id,
      new Set(matches.map((item) => item.id)),
    ]),
  );
  // Retire matches the buyer can no longer act on before applying the cap.
  const retained = state.alerts.filter((alert) =>
    matchingIdsByJob.get(alert.jobId)?.has(alert.listingId),
  );
  const unread = new Map<string, number>();
  for (const alert of retained)
    if (!alert.read)
      unread.set(alert.jobId, (unread.get(alert.jobId) ?? 0) + 1);

  for (const job of jobs) {
    const matches = matchesByJob.get(job.id)!;
    const sig = signature(job.criteria);
    const previous = state.baselines[job.id];
    baselines[job.id] = {
      signature: sig,
      listingIds: matches.map((item) => item.id),
    };
    if (!previous || previous.signature !== sig || job.paused) continue;
    const known = new Set(previous.listingIds);
    for (const item of matches) {
      if (known.has(item.id)) continue;
      const count = unread.get(job.id) ?? 0;
      if (count >= MAX_UNREAD_PER_SEARCH) {
        // Left out of the baseline so it can still alert once the buyer catches up.
        baselines[job.id].listingIds = baselines[job.id].listingIds.filter(
          (id) => id !== item.id,
        );
        continue;
      }
      unread.set(job.id, count + 1);
      created.push({
        id: `${job.id}:${item.id}:${now.toISOString()}`,
        jobId: job.id,
        listingId: item.id,
        title: item.title,
        reason: matchReason(item, job.criteria),
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  const alerts = [...created, ...retained].slice(0, MAX_ALERTS);
  const unchanged =
    !created.length &&
    alerts.length === state.alerts.length &&
    JSON.stringify(baselines) === JSON.stringify(state.baselines);
  return unchanged ? state : { version: 1, baselines, alerts };
}

export function markAlertsRead(
  state: AlertsState,
  predicate: (alert: AlertItem) => boolean = () => true,
): AlertsState {
  if (!state.alerts.some((alert) => !alert.read && predicate(alert)))
    return state;
  return {
    ...state,
    alerts: state.alerts.map((alert) =>
      predicate(alert) ? { ...alert, read: true } : alert,
    ),
  };
}

export function dismissAlert(state: AlertsState, id: string): AlertsState {
  return { ...state, alerts: state.alerts.filter((alert) => alert.id !== id) };
}

export const unreadCount = (state: AlertsState) =>
  state.alerts.filter((alert) => !alert.read).length;

export function isAlertsState(value: unknown): value is AlertsState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as AlertsState;
  const text = (item: unknown) => typeof item === "string";
  return (
    state.version === 1 &&
    typeof state.baselines === "object" &&
    state.baselines !== null &&
    Object.values(state.baselines).every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        text(item.signature) &&
        Array.isArray(item.listingIds) &&
        item.listingIds.every(text),
    ) &&
    Array.isArray(state.alerts) &&
    state.alerts.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        ["id", "jobId", "listingId", "title", "reason", "createdAt"].every(
          (key) => text((item as Record<string, unknown>)[key]),
        ) &&
        typeof item.read === "boolean",
    )
  );
}

type DraftForDemand = { title: string; price: number; condition?: string };

function matchingJobs<T extends Pick<SearchJob, "criteria" | "paused">>(
  jobs: T[],
  draft: DraftForDemand,
): T[] {
  if (!draft.title.trim() || !Number.isFinite(draft.price) || draft.price < 0)
    return [];
  const preview = {
    id: "draft",
    title: draft.title,
    price: draft.price,
    category: "All",
    condition: draft.condition ?? "",
    source: "takeover",
    pickupBy: "",
    status: "active",
  } as Product;
  return jobs.filter(
    (job) => !job.paused && currentMatches([preview], job.criteria).length > 0,
  );
}

export type DemandLadder = {
  /** Highest price first; counts never fall as the price drops. */
  rungs: { price: number; count: number }[];
  /** Searches alerted at the asking price that state no price limit. */
  noLimit: number;
};

/**
 * What a listing being written would alert at its price and at 10% and 20%
 * lower. Counts this browser's active saved searches only.
 */
export function demandLadder(
  jobs: Pick<SearchJob, "criteria" | "paused">[],
  draft: DraftForDemand,
): DemandLadder {
  const prices = [draft.price, draft.price * 0.9, draft.price * 0.8]
    .map((price) => Math.round(price))
    .filter((price, index, all) => price >= 0 && all.indexOf(price) === index);
  const rungs = prices.map((price) => ({
    price,
    count: matchingJobs(jobs, { ...draft, price }).length,
  }));
  const asking = matchingJobs(jobs, draft);
  return {
    rungs: Number.isFinite(draft.price) ? rungs : [],
    noLimit: asking.filter((job) => !hasBudget(job.criteria)).length,
  };
}

export type SimilarListings = {
  count: number;
  min: number;
  max: number;
  /** Only with enough listings for a median to mean something. */
  median: number | null;
};

const MEDIAN_MINIMUM = 3;

const headWord = (title: string) => title.match(/[\p{L}\p{N}]+/gu)?.at(-1);

/**
 * Active listings of the same kind. Listings are written in English, where the
 * last word of a title names the item ("white desk"), so both titles are
 * compared by that word. This keeps "desk lamp" out of a desk's comparison.
 */
export function similarListings(
  listings: Product[],
  title: string,
  excludeId?: string,
): SimilarListings | null {
  const head = headWord(title);
  if (!head) return null;
  const criteria = { ...defaults, query: head, maxPrice: NO_BUDGET };
  const prices = listings
    .filter((item) => {
      const itemHead = headWord(item.title);
      return (
        item.id !== excludeId &&
        itemHead !== undefined &&
        currentMatches([{ ...item, title: itemHead, category: "" }], criteria)
          .length > 0
      );
    })
    .map((item) => item.price)
    .sort((a, b) => a - b);
  if (!prices.length) return null;
  const middle = Math.floor(prices.length / 2);
  return {
    count: prices.length,
    min: prices[0],
    max: prices[prices.length - 1],
    median:
      prices.length < MEDIAN_MINIMUM
        ? null
        : prices.length % 2
          ? prices[middle]
          : Math.round((prices[middle - 1] + prices[middle]) / 2),
  };
}
