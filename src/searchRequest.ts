import { listingInventory } from "../shared/listingInventory.ts";
import {
  defaults,
  filterProducts,
  isMine,
  extractSearchConstraints,
  takeoverOnlyPattern,
  parseSearch,
  type Criteria,
  type Product,
  type SearchJob,
} from "../shared/marketplace.ts";
import type { AgentRunRequest } from "../shared/runs.ts";
import { isSearchJobs } from "./hooks/savedState.ts";

export type SearchArea = { location: string; radius: number };
export type SearchSnapshot = {
  text: string;
  originalRequest: string;
  criteria: Criteria;
  location: string;
  previousQuery?: string;
  previousAnswer?: string;
  intent?: "search" | "listing_review";
};
export type SavedSearch = SearchJob & {
  location?: string;
  request?: string;
  search?: SearchSnapshot;
};

export function isSearchArea(value: unknown): value is SearchArea {
  if (typeof value !== "object" || value === null) return false;
  const area = value as SearchArea;
  return (
    typeof area.location === "string" &&
    !!area.location.trim() &&
    area.location.length <= 120 &&
    Number.isFinite(area.radius) &&
    area.radius >= 0 &&
    area.radius <= 500
  );
}

function isSnapshot(value: unknown): value is SearchSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const search = value as SearchSnapshot;
  return (
    typeof search.text === "string" &&
    typeof search.originalRequest === "string" &&
    typeof search.location === "string" &&
    (search.previousQuery === undefined ||
      typeof search.previousQuery === "string") &&
    (search.previousAnswer === undefined ||
      typeof search.previousAnswer === "string") &&
    (search.intent === undefined ||
      search.intent === "search" ||
      search.intent === "listing_review") &&
    isSearchJobs([
      {
        id: "",
        title: "",
        criteria: search.criteria,
        paused: false,
        seen: true,
      },
    ])
  );
}

export function isSavedSearches(value: unknown): value is SavedSearch[] {
  return (
    isSearchJobs(value) &&
    value.every(
      (job) =>
        (!("location" in job) || typeof job.location === "string") &&
        (!("request" in job) || typeof job.request === "string") &&
        (!("search" in job) || isSnapshot(job.search)),
    )
  );
}

/** Human-readable request: never parse this generated prose back into the item query. */
function searchText(criteria: Criteria, location: string) {
  return [
    criteria.query ||
      (criteria.category === "All" ? "second-hand items" : criteria.category),
    criteria.maxPrice >= 1_000_000
      ? "any budget"
      : "budget up to CHF " + criteria.maxPrice,
    "within " + criteria.radius + " km of " + location,
    criteria.pickup ? "pickup by " + criteria.pickup : "flexible pickup",
    criteria.condition === "All"
      ? "any condition"
      : "condition: " + criteria.condition,
    criteria.source === "All" ? "all sources" : "on " + criteria.source,
  ].join(", ");
}

export function newSearch(
  text: string,
  base: Criteria,
  location: string,
  previous?: SearchSnapshot,
  previousAnswer?: string,
): SearchSnapshot {
  const request = text.trim();
  const allSources =
    /\b(?:all (?:sources|platforms)|(?:search|include|use) (?:the )?web|takeover\s+(?:and|und|\+)\s+(?:(?:the|das)\s+)?web|any (?:source|platform))\b/gi;
  const criteria = parseSearch(
    request.replace(takeoverOnlyPattern, "").replace(allSources, ""),
    base,
  );
  // Follow-up questions refine a search; they are not the item name.
  if (
    previous &&
    !/\b(?:find|search for|looking for|i need|i want|instead)\b/i.test(request)
  )
    criteria.query = base.query;
  if (takeoverOnlyPattern.test(request)) criteria.source = "takeover";
  else if (allSources.test(request)) criteria.source = "All";
  else {
    const source = request.match(
      /\b(?:search|use|on|from|source\s*:)\s+(?:only\s+)?(ricardo|anibis)\b/i,
    )?.[1];
    if (source)
      criteria.source =
        source.toLowerCase() === "ricardo" ? "Ricardo" : "Anibis";
  }
  return {
    text: request,
    originalRequest: previous?.originalRequest || request,
    criteria,
    location: request.match(/\b(?:around|near|within [\d.,]+ km of) (EPFL|UNIL)\b/i)?.[1].toUpperCase() ?? location,
    ...(previous?.intent ? { intent: previous.intent } : {}),
    ...(previous ? { previousQuery: previous.text.slice(0, 500) } : {}),
    ...(previousAnswer
      ? { previousAnswer: previousAnswer.slice(0, 6000) }
      : {}),
  };
}

/** Explicit form fields are authoritative, including cleared/zero values. */
export function preferenceSearch(
  criteria: Criteria,
  location: string,
  previous?: SearchSnapshot,
): SearchSnapshot {
  const value = { ...criteria, category: "All", query: criteria.query.trim() };
  const text = searchText(value, location);
  return {
    text,
    originalRequest:
      previous && previous.criteria.query === value.query
        ? previous.originalRequest
        : text,
    criteria: value,
    location,
  };
}

/** Reuse the existing ranking, plus catalog items a relaxed filter may bring back. */
export function refilterCatalog(inventory: Product[], ranked: Product[], criteria: Criteria) {
  const rankedIds = new Set(ranked.map(({ id }) => id));
  const remaining = inventory.filter((item) => !isMine(item) && !rankedIds.has(item.id));
  return [
    ...filterProducts(ranked, { ...criteria, query: "", category: "All" }),
    ...filterProducts(remaining, criteria),
  ];
}

export function restoreSearch(
  job: SavedSearch,
  fallbackLocation: string,
): SearchSnapshot {
  return (
    job.search ?? {
      text:
        job.request ||
        searchText(job.criteria, job.location || fallbackLocation),
      originalRequest:
        job.request ||
        searchText(job.criteria, job.location || fallbackLocation),
      criteria: { ...job.criteria },
      location: job.location || fallbackLocation,
    }
  );
}

export function sameCriteria(a: Criteria, b: Criteria) {
  return (Object.keys(a) as (keyof Criteria)[]).every(
    (key) => a[key] === b[key],
  );
}

/** Keep the complete identifying details and fit the description into the API limit. */
export function listingReviewSearch(item: Product): SearchSnapshot {
  const heading = [
    "Review my listing. What details could help a buyer? Use only the supplied information; identify missing details without inventing them.",
    "Title: " + item.title.slice(0, 180),
    "Price (CHF): " + item.price,
    "Condition: " + item.condition.slice(0, 120),
    "Dimensions: " + item.dimensions.slice(0, 160),
    "Location: " + item.location.slice(0, 120),
    "Pickup: " + item.available.slice(0, 160),
    "Description: ",
  ].join("\n");
  const available = 4000 - heading.length;
  const shortened = "\n[Description shortened for review.]";
  const description =
    item.description.length <= available
      ? item.description
      : item.description.slice(0, available - shortened.length) + shortened;
  const text = heading + description;
  return {
    text,
    originalRequest: text,
    criteria: { ...defaults, query: item.title },
    location: item.location,
    intent: "listing_review",
  };
}

export function agentSearchRequest(
  search: SearchSnapshot,
  inventory: Product[],
  negotiating = false,
): AgentRunRequest {
  const ownListingIds = inventory
    .filter((item) => isMine(item) && item.status === "active")
    .map((item) => item.id);
  const budgetSpecified = search.criteria.maxPrice !== defaults.maxPrice ||
    [search.originalRequest, search.text].some(
      (text) => extractSearchConstraints(text).maxPrice !== undefined,
    );
  return {
    text: search.text,
    context: {
      intent: search.intent ?? "search",
      location: search.location,
      ...(ownListingIds.length
        ? { ownListingIds: ownListingIds.slice(0, 200) }
        : {}),
      originalRequest: search.originalRequest,
      currentQuery: search.criteria.query.slice(0, 500),
      ...(search.previousAnswer
        ? { previousAnswer: search.previousAnswer }
        : {}),
      ...(search.intent === "listing_review"
        ? {}
        : {
            ...(budgetSpecified && search.criteria.maxPrice < 1_000_000
              ? { maxPrice: search.criteria.maxPrice } : {}),
            budgetSpecified,
            radius: search.criteria.radius,
            pickupBy: search.criteria.pickup,
            condition: search.criteria.condition,
            source: search.criteria.source,
          }),
    },
    inventory: listingInventory(
      inventory.filter((item) => !isMine(item)),
      negotiating || search.intent === "listing_review"
        ? undefined
        : { radius: search.criteria.radius, pickupBy: search.criteria.pickup },
    ).slice(0, 100),
  };
}
