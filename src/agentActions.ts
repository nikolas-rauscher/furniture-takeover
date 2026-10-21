import type {
  AgentListingDraft,
  AgentListingPatchEvent,
  AgentPreferencesPatchEvent,
} from "../shared/actions.ts";
import { TODAY, type Criteria } from "../shared/marketplace.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import type { SearchSnapshot } from "./searchRequest.ts";

export const listingFieldNames = [
  "title",
  "description",
  "price",
  "condition",
  "dimensions",
  "location",
  "pickup",
] as const;
export type ListingField = (typeof listingFieldNames)[number];
export type FieldRevisions = Partial<Record<ListingField, number>>;
export type ListingChanges = Partial<
  Record<ListingField, { before: string; after: string; revision: number }>
>;
export type PreferenceChanges = Partial<
  Record<
    keyof Criteria | "location",
    { before: string | number; after: string | number }
  >
>;

export function agentDraft(draft: ListingDraft): AgentListingDraft {
  const price = Number(draft.price);
  return {
    title: draft.title.slice(0, 180),
    description: draft.description.slice(0, 4000),
    price:
      draft.price.trim() &&
      Number.isFinite(price) &&
      price >= 0 &&
      price <= 10000
        ? price
        : null,
    condition: draft.condition.slice(0, 120),
    dimensions: draft.dimensions.slice(0, 160),
    location: draft.location.slice(0, 120),
    pickup: draft.pickup,
    raw: draft.raw.slice(0, 4000),
  };
}

const dateIsValid = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

function fieldValue(
  field: ListingField,
  value: unknown,
  current: string,
  today: string,
): string | undefined {
  if (field === "price")
    return value === null
      ? ""
      : typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 10000
        ? String(value)
        : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  const limits = {
    title: 180,
    description: 4000,
    condition: 120,
    dimensions: 160,
    location: 120,
    pickup: 10,
  };
  if (text.length > limits[field]) return undefined;
  if (field === "condition")
    return text === ""
      ? ""
      : (["Very good", "Good", "Used"].find(
          (condition) => condition.toLowerCase() === text.toLowerCase(),
        ) ?? text);
  if (
    field === "pickup" &&
    text &&
    (!dateIsValid(text) || (text < today && text !== current))
  )
    return undefined;
  return text;
}

/** A confirmed asking price may replace its labelled old amount, never a purchase cost. */
function descriptionWithAskingPrice(
  description: string,
  oldPrice: number,
  newPrice: number,
) {
  return description.replace(
    /(\b(?:asking(?: price)?|(?:sale|selling) price|price)\s*:?\s*(?:CHF\s*)?)(\d+(?:[.,]\d+)?)(?!\d|[.,]\d)/gi,
    (match, prefix: string, amount: string, offset: number) => {
      if (Number(amount.replace(",", ".")) !== oldPrice) return match;
      const before =
        description
          .slice(0, offset)
          .split(/[.!?\n;]/)
          .at(-1) ?? "";
      const after = description.slice(offset + match.length);
      if (
        /\b(?:bought|paid|original(?:ly)?|retail|purchase|cost)\b/i.test(
          before,
        ) ||
        /^\s*(?:EUR|USD|euros?|dollars?|€|\$)\b/i.test(after)
      )
        return match;
      return `${prefix}${newPrice}`;
    },
  );
}

/** Tool results may change only fields the seller has not edited since this run began. */
export function applyListingAction(
  draft: ListingDraft,
  action: AgentListingPatchEvent,
  baseline: FieldRevisions,
  revisions: FieldRevisions,
  accepted = false,
  today = TODAY,
) {
  const next = { ...draft };
  const changes: ListingChanges = {};
  const skipped: string[] = [];
  const requiresAcceptance = action.requiresAcceptance;
  if (requiresAcceptance && !accepted)
    return { next, changes, skipped, pending: true };
  for (const field of listingFieldNames) {
    if (!Object.hasOwn(action.patch, field)) continue;
    if ((baseline[field] ?? 0) !== (revisions[field] ?? 0)) {
      skipped.push(field);
      continue;
    }
    const value = fieldValue(field, action.patch[field], draft[field], today);
    if (value === undefined) {
      skipped.push(field);
      continue;
    }
    if (value === draft[field]) continue;
    next[field] = value;
    changes[field] = {
      before: draft[field],
      after: value,
      revision: revisions[field] ?? 0,
    };
  }
  if (
    accepted &&
    changes.price &&
    draft.price.trim() &&
    next.price.trim() &&
    !Object.hasOwn(action.patch, "description")
  ) {
    const description = descriptionWithAskingPrice(
      draft.description,
      Number(draft.price),
      Number(next.price),
    );
    if (description !== draft.description) {
      if (
        (baseline.description ?? 0) !== (revisions.description ?? 0) ||
        description.length > 4000
      )
        skipped.push("description");
      else {
        next.description = description;
        changes.description = {
          before: draft.description,
          after: description,
          revision: revisions.description ?? 0,
        };
      }
    }
  }
  return { next, changes, skipped, pending: false };
}

export function undoListingAction(
  draft: ListingDraft,
  changes: ListingChanges,
  revisions: FieldRevisions,
) {
  const next = { ...draft };
  const restored: ListingField[] = [];
  const preserved: ListingField[] = [];
  for (const field of listingFieldNames) {
    const change = changes[field];
    if (!change) continue;
    if (
      draft[field] === change.after &&
      (revisions[field] ?? 0) === change.revision
    ) {
      next[field] = change.before;
      restored.push(field);
    } else preserved.push(field);
  }
  return { next, restored, preserved };
}

export function applyPreferenceAction(
  search: SearchSnapshot,
  action: AgentPreferencesPatchEvent,
  today = TODAY,
) {
  const next = { ...search, criteria: { ...search.criteria } };
  const changes: PreferenceChanges = {};
  const patch = action.patch;
  const set = (field: keyof Criteria | "location", value: string | number) => {
    const before =
      field === "location" ? search.location : search.criteria[field];
    if (before === value) return;
    changes[field] = { before, after: value };
    if (field === "location") next.location = String(value);
    else Object.assign(next.criteria, { [field]: value });
  };
  if (typeof patch.query === "string" && patch.query.length <= 500) {
    set("query", patch.query.trim());
    set("category", "All");
  }
  if (
    typeof patch.maxPrice === "number" &&
    Number.isFinite(patch.maxPrice) &&
    patch.maxPrice >= 0 &&
    patch.maxPrice <= 1000000
  )
    set("maxPrice", patch.maxPrice);
  if (
    typeof patch.radius === "number" &&
    Number.isFinite(patch.radius) &&
    patch.radius >= 0 &&
    patch.radius <= 500
  )
    set("radius", patch.radius);
  if (
    typeof patch.pickupBy === "string" &&
    (!patch.pickupBy ||
      (dateIsValid(patch.pickupBy) && patch.pickupBy >= today))
  )
    set("pickup", patch.pickupBy);
  if (typeof patch.condition === "string" && patch.condition.length <= 120)
    set("condition", patch.condition.trim() || "All");
  if (typeof patch.source === "string" && patch.source.length <= 120)
    set("source", patch.source.trim() || "All");
  if (
    typeof patch.location === "string" &&
    patch.location.trim() &&
    patch.location.length <= 120
  )
    set("location", patch.location.trim());
  return { next, changes };
}

export function undoPreferenceAction(
  search: SearchSnapshot,
  changes: PreferenceChanges,
) {
  const next = { ...search, criteria: { ...search.criteria } };
  for (const [key, change] of Object.entries(changes)) {
    const field = key as keyof Criteria | "location";
    const current =
      field === "location" ? search.location : search.criteria[field];
    if (current !== change.after) continue;
    if (field === "location") next.location = String(change.before);
    else Object.assign(next.criteria, { [field]: change.before });
  }
  return next;
}
