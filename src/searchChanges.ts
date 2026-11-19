import type { AgentPreferencesPatch } from "../shared/actions.ts";
import { defaults, money, shortDate } from "../shared/marketplace.ts";

function budgetSentence(maxPrice: number) {
  if (maxPrice === 0) return "I'm looking for free items only.";
  if (maxPrice >= defaults.maxPrice) return "I removed the price limit.";
  return `I set your budget to ${money(maxPrice)}.`;
}

function sourceSentence(source: string) {
  if (source === "All") return "I'm searching all sources.";
  return `I'm searching ${source === "takeover" ? "Takeover" : source} only.`;
}

function pickupSentence(pickupBy: string) {
  return pickupBy
    ? `You can collect by ${shortDate(pickupBy)}.`
    : "I removed the collection date.";
}

function conditionSentence(condition: string) {
  return condition === "All"
    ? "Any condition is fine."
    : `I'm looking for items in ${condition.toLowerCase()} condition.`;
}

/** Each search preference Pako set, as a short sentence a student can check at a glance. */
export function searchChangeSummary(patch: AgentPreferencesPatch) {
  const { query, maxPrice, radius, pickupBy, condition, source, location } =
    patch;
  return [
    query !== undefined && `I'm now looking for “${query}”.`,
    maxPrice !== undefined && budgetSentence(maxPrice),
    radius !== undefined && `I set the distance to ${radius} km.`,
    pickupBy !== undefined && pickupSentence(pickupBy),
    condition !== undefined && conditionSentence(condition),
    source !== undefined && sourceSentence(source),
    location !== undefined && `I'm searching around ${location}.`,
  ]
    .filter(Boolean)
    .join(" ");
}
