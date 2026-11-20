import { money, shortDate, type Criteria } from "../shared/marketplace.ts";
import type { SearchSnapshot } from "./searchRequest.ts";

/** The search pill's short name for an area: "EPFL" for "EPFL, Ecublens", "Vortex" for an FMEL residence. */
export function shortPlace(location: string) {
  return location.split(",")[0].replace(/^FMEL\s+/, "").trim();
}

function budgetLabel(criteria: Criteria) {
  if (criteria.maxPrice >= 1_000_000) return "Any budget";
  return criteria.maxPrice === 0 ? "Free only" : "Up to " + money(criteria.maxPrice);
}

function sourceLabel(criteria: Criteria) {
  return criteria.source === "All" ? "All sources" : criteria.source;
}

/** The search header's short line: budget, distance and sources. */
export function compactPreferences(criteria: Criteria) {
  return [budgetLabel(criteria), `${criteria.radius} km`, sourceLabel(criteria)].join(
    " · ",
  );
}

/** Every preference the running search uses, spelled out. */
export function activePreferences(search: SearchSnapshot) {
  const { criteria } = search;
  return [
    budgetLabel(criteria),
    criteria.radius + " km of " + search.location,
    criteria.pickup ? "Pickup by " + shortDate(criteria.pickup) : "Flexible pickup",
    criteria.condition === "All" ? "Any condition" : criteria.condition + " condition",
    criteria.source === "takeover" ? "takeover only" : sourceLabel(criteria),
  ].join(" · ");
}
