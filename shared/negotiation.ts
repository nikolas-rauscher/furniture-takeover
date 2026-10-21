import { z } from "zod";

export const negotiationTermsSchema = z
  .object({
    amount: z.number().finite().min(0).max(1_000_000).nullable(),
    fulfillment: z.enum(["pickup", "shipping"]).nullable(),
    pickupTime: z.string().trim().min(1).max(240).nullable(),
    pickupPoint: z.string().trim().min(1).max(240).nullable(),
    note: z.string().trim().min(1).max(1000).nullable(),
  })
  .strict();
export type NegotiationTerms = z.infer<typeof negotiationTermsSchema>;
export const negotiationFields = [
  "amount",
  "fulfillment",
  "pickupTime",
  "pickupPoint",
  "note",
] as const;
const evidenceSchema = z
  .object({
    origin: z.enum(["buyer", "listing"]),
    quote: z.string().min(1).max(1500),
  })
  .strict();
export const negotiationSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(120),
    listingId: z.string().min(1).max(120),
    version: z.number().int().min(1).max(1_000_000),
    status: z.enum(["draft", "discarded", "sent"]),
    terms: negotiationTermsSchema,
    evidence: z
      .object(
        Object.fromEntries(
          negotiationFields.map((field) => [field, evidenceSchema.optional()]),
        ) as Record<
          (typeof negotiationFields)[number],
          z.ZodOptional<typeof evidenceSchema>
        >,
      )
      .strict(),
    draft: z
      .object({
        message: z.string().min(1).max(4000),
        version: z.number().int().min(1),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.draft ||
      (value.draft.version === value.version && value.status !== "discarded"),
    "Draft must match the current revision",
  );
export type Negotiation = z.infer<typeof negotiationSchema>;
export type NegotiationUpdate = {
  type: "negotiation_update";
  previousVersion: number;
  negotiation: Negotiation;
};

export function newNegotiation(id: string, listingId: string): Negotiation {
  return negotiationSchema.parse({
    schemaVersion: 1,
    id,
    listingId,
    version: 1,
    status: "draft",
    terms: {
      amount: null,
      fulfillment: null,
      pickupTime: null,
      pickupPoint: null,
      note: null,
    },
    evidence: {},
  });
}
export function checkRevision(current: Negotiation, expectedVersion: number) {
  if (current.version !== expectedVersion)
    throw new Error(
      "This draft changed. Read the current version before updating it.",
    );
  if (current.status !== "draft")
    throw new Error(
      "This proposal is closed. Select the listing to start a new draft.",
    );
}
/** A fact change always invalidates the old message, including manual edits. */
export function reviseNegotiation(
  current: Negotiation,
  terms: Partial<NegotiationTerms>,
  expectedVersion: number,
  evidence: Partial<Negotiation["evidence"]> = {},
): Negotiation {
  checkRevision(current, expectedVersion);
  const next = {
    ...current,
    version: current.version + 1,
    terms: { ...current.terms, ...terms },
    evidence: { ...current.evidence, ...evidence },
  };
  delete next.draft;
  if (terms.fulfillment === "shipping") {
    next.terms.pickupTime = null;
    next.terms.pickupPoint = null;
    delete next.evidence.pickupTime;
    delete next.evidence.pickupPoint;
  }
  for (const field of negotiationFields)
    if (next.terms[field] === null) delete next.evidence[field];
  return negotiationSchema.parse(next);
}
export function draftMessage(title: string, terms: NegotiationTerms): string {
  const parts = [`Hi, I'm interested in your ${title}. Is it still available?`];
  if (terms.amount !== null)
    parts.push(`Would you accept CHF ${terms.amount}?`);
  if (terms.fulfillment === "shipping")
    parts.push(
      "Would shipping be possible, and what would the total including shipping be?",
    );
  else if (
    terms.fulfillment === "pickup" ||
    terms.pickupTime ||
    terms.pickupPoint
  ) {
    parts.push(
      terms.pickupTime
        ? `Would pickup ${terms.pickupTime} work for you?`
        : "When would pickup work for you?",
    );
    parts.push(
      terms.pickupPoint
        ? `Could we meet at ${terms.pickupPoint}?`
        : "Where would you like to meet for pickup?",
    );
  } else parts.push("How would you prefer to arrange handover?");
  if (terms.note) parts.push(terms.note);
  return parts.join(" ");
}
export function prepareNegotiation(
  current: Negotiation,
  title: string,
  expectedVersion: number,
  editedMessage?: string,
): Negotiation {
  checkRevision(current, expectedVersion);
  const version = current.version + 1;
  return negotiationSchema.parse({
    ...current,
    version,
    draft: {
      version,
      message:
        editedMessage?.trim() ||
        current.draft?.message ||
        draftMessage(title, current.terms),
    },
  });
}
export function discardNegotiation(
  current: Negotiation,
  expectedVersion: number,
): Negotiation {
  checkRevision(current, expectedVersion);
  const next = {
    ...current,
    version: current.version + 1,
    status: "discarded" as const,
  };
  delete next.draft;
  return next;
}

/** Call only after the message service confirms delivery. */
export function markNegotiationSent(
  current: Negotiation,
  expectedVersion: number,
): Negotiation {
  checkRevision(current, expectedVersion);
  if (!current.draft)
    throw new Error("Prepare a message before marking it sent.");
  const version = current.version + 1;
  return negotiationSchema.parse({
    ...current,
    status: "sent",
    version,
    draft: { ...current.draft, version },
  });
}
