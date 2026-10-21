import { listingInventory } from "../shared/listingInventory.ts";
import {
  defaults,
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
export function searchText(criteria: Criteria, location: string) {
  return [
    criteria.query ||
      (criteria.category === "All" ? "furniture" : criteria.category),
    "budget up to CHF " + criteria.maxPrice,
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
  const ownOnly =
    /\b(?:only (?:my|local|your|our)(?: active)? listings|(?:do not|don't|don’t) search (?:the )?web)\b/gi;
  const allSources =
    /\b(?:all (?:sources|platforms)|(?:search|include|use) (?:the )?web|any (?:source|platform))\b/gi;
  const criteria = parseSearch(
    request.replace(ownOnly, "").replace(allSources, ""),
    base,
  );
  // Follow-up questions refine a search; they are not the item name.
  if (
    previous &&
    !/\b(?:find|search for|looking for|i need|i want|instead)\b/i.test(request)
  )
    criteria.query = base.query;
  if (ownOnly.test(request)) criteria.source = "takeover";
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
    location,
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
): AgentRunRequest {
  return {
    text: search.text,
    context: {
      intent: search.intent ?? "search",
      location: search.location,
      originalRequest: search.originalRequest,
      currentQuery: search.criteria.query.slice(0, 500),
      ...(search.previousAnswer
        ? { previousAnswer: search.previousAnswer }
        : {}),
      ...(search.intent === "listing_review"
        ? {}
        : {
            maxPrice: search.criteria.maxPrice,
            budgetSpecified:
              search.criteria.maxPrice !== defaults.maxPrice ||
              /\b(?:CHF|francs?|budget|free|gratis|kostenlos|any price|no budget)\b|(?:under|unter|bis|up to|max(?:imum)?)\s*\d/i.test(
                search.originalRequest + " " + search.text,
              ),
            radius: search.criteria.radius,
            pickupBy: search.criteria.pickup,
            condition: search.criteria.condition,
            source: search.criteria.source,
          }),
    },
    inventory: listingInventory(inventory).slice(0, 100),
  };
}
