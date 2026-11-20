import type { AgentPreferencesPatchEvent } from "../shared/actions.ts";
import type { AgentRunRequest } from "../shared/runs.ts";
import {
  extractSearchConstraints,
  takeoverOnlyPattern,
} from "../shared/marketplace.ts";
import {
  contains,
  extractive,
  fail,
  negated,
  validateEvidence,
  wantsClear,
} from "./action-evidence.ts";
import { preferencesUpdateSchema } from "./action-schemas.ts";

/** The filters the latest message states; a bare number answers Pako's budget or radius question. */
function statedConstraints(request: AgentRunRequest) {
  const constraints = extractSearchConstraints(request.text);
  const shortNumber = /^\s*\d+(?:[.,]\d{1,2})?\s*$/.test(request.text)
    ? Number(request.text.trim().replace(",", "."))
    : undefined;
  const previousQuestion = request.context?.previousQuestion ?? "";
  if (
    shortNumber !== undefined &&
    /\b(?:budget|max(?:imum)? price|spend|price limit)\b/i.test(
      previousQuestion,
    )
  )
    constraints.maxPrice = shortNumber;
  if (
    shortNumber !== undefined &&
    /\b(?:radius|distance|kilometres|kilometers|km|how far)\b/i.test(
      previousQuestion,
    )
  )
    constraints.radius = shortNumber;
  return constraints;
}

export function preferencesAction(
  input: unknown,
  request: AgentRunRequest,
  id: string,
): AgentPreferencesPatchEvent {
  const parsed = preferencesUpdateSchema.safeParse(input);
  if (!parsed.success)
    fail("Use only valid search preferences and seller evidence.");
  const { patch, reason, evidence } = parsed.data!;
  validateEvidence(evidence, request, []);
  // A preference update must come from the latest request, never a stale draft or prior answer.
  if (evidence.some((item) => !contains(request.text, item.quote)))
    fail("Search changes need evidence in the latest user message.");
  if (
    patch.source &&
    patch.source !== "takeover" &&
    takeoverOnlyPattern.test(request.text)
  )
    fail("The buyer limited this search to Takeover.");
  const constraints = statedConstraints(request);
  const quotes = evidence.map((item) => item.quote);
  for (const [field, value] of Object.entries(patch)) {
    const existing =
      field === "query"
        ? request.context?.currentQuery
        : request.context?.[
            field as keyof NonNullable<AgentRunRequest["context"]>
          ];
    // Models may repeat current filters alongside a changed field; no-op values are already accepted facts.
    if (value === existing) continue;
    if (field === "maxPrice" || field === "radius") {
      if (value !== constraints[field])
        fail(`${field} must be explicitly stated in the latest message.`);
    } else if (field === "pickupBy") {
      if (value !== constraints.pickup)
        fail("Pickup must be explicitly stated in the latest message.");
    } else if (
      field === "condition" &&
      typeof value === "string" &&
      value.toLowerCase() === "used" &&
      /\b(?:second[- ]hand|pre[- ]owned|used)\b/i.test(request.text)
    ) {
      continue;
    } else if (
      field === "source" &&
      value === "takeover" &&
      /(?:only\s+(?:my|local|own)\s+listings|(?:don't|do not)\s+search\s+(?:the\s+)?web)/i.test(
        request.text,
      )
    ) {
      continue;
    } else if (value === "" || value === "All") {
      if (
        !wantsClear(field, request.text) &&
        !(
          field === "source" &&
          /\b(?:(?:search|include|use) (?:the )?web|takeover\s+(?:and|und|\+)\s+(?:(?:the|das)\s+)?web)\b/i.test(
            request.text,
          ) &&
          !/\b(?:don't|do not|don’t)\s+(?:search|include|use)\s+(?:the\s+)?web\b/i.test(
            request.text,
          )
        ) &&
        !/\b(?:anything|all furniture|all sources|any condition)\b/i.test(
          request.text,
        )
      )
        fail(`Clearing ${field} needs an explicit request.`);
    } else if (
      typeof value !== "string" ||
      !extractive(value, quotes) ||
      negated(value, request.text)
    )
      fail(`${field} needs explicit user wording.`);
  }
  return { type: "preferences_patch", id, patch, reason, evidence };
}
