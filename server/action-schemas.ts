import { z } from "zod";

export const dateSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
  );
const listingFields = {
  title: z.string().trim().max(180),
  description: z.string().trim().max(4000),
  price: z.number().finite().min(0).max(10_000).nullable(),
  condition: z.string().trim().max(120),
  dimensions: z.string().trim().max(160),
  location: z.string().trim().max(120),
  pickup: dateSchema,
};
export const listingDraftSchema = z.object({
  ...listingFields,
  raw: z.string().max(4000),
});
const sellerEvidenceSchema = z
  .object({
    kind: z.literal("seller"),
    quote: z.string().trim().min(1).max(500),
  })
  .strict();
const sourceEvidenceSchema = z
  .object({
    kind: z.literal("source"),
    sourceId: z.string().min(1).max(160),
    quote: z.string().trim().min(1).max(500),
  })
  .strict();
const reasonSchema = z.string().trim().min(1).max(500);
const answerLabel = z.string().trim().min(1).max(120);
const tapAnswer = z
  .object({
    label: answerLabel,
    patch: z.object(listingFields).partial().strict().optional(),
    appendDescription: z.string().trim().min(1).max(160).optional(),
  })
  .strict();
const questionFields = z
  .object({
    question: z.string().trim().min(1).max(500),
    listingField: z
      .enum([
        "price",
        "condition",
        "dimensions",
        "location",
        "pickup",
        "description",
        "title",
        "other",
      ])
      .describe(
        "For seller questions, name the draft field being requested. Use price for the listing asking price; other for item-specific details.",
      )
      .optional(),
    purpose: z
      .enum(["missing_detail", "change_detail"])
      .describe(
        "Use change_detail only when the user explicitly wants to revise a known value; otherwise missing_detail.",
      )
      .optional(),
    input: z
      .object({
        type: z.literal("price"),
        min: z.number().finite().min(0).max(10_000),
        max: z.number().finite().min(0).max(10_000),
        step: z.number().finite().positive().max(1000),
        value: z.number().finite().min(0).max(10_000).optional(),
      })
      .strict()
      .refine(
        (input) =>
          input.max > input.min &&
          input.step <= input.max - input.min &&
          (input.value === undefined ||
            (input.value >= input.min && input.value <= input.max)),
      )
      .optional(),
    choices: z
      .array(z.union([answerLabel, tapAnswer]))
      .min(1)
      .max(5)
      .describe(
        "For measurements, use listingField dimensions and offer relevant exact sizes with units and a matching dimensions patch. The seller can also type their own measurements.",
      )
      .optional(),
  })
  .strict();
export const questionSchema = questionFields.extend({
  followUps: z
    .array(questionFields.omit({ input: true }))
    .max(2)
    .optional(),
});
export const listingUpdateSchema = z
  .object({
    patch: z
      .object(listingFields)
      .partial()
      .strict()
      .refine((patch) => Object.keys(patch).length > 0),
    reason: reasonSchema,
    evidence: z
      .array(
        z.discriminatedUnion("kind", [
          sellerEvidenceSchema,
          sourceEvidenceSchema,
        ]),
      )
      .min(1)
      .max(8),
  })
  .strict();
export const preferencesUpdateSchema = z
  .object({
    patch: z
      .object({
        query: z.string().trim().max(500),
        maxPrice: z.number().finite().min(0).max(1_000_000),
        radius: z.number().finite().min(0).max(500),
        pickupBy: dateSchema,
        condition: z.string().trim().max(120),
        source: z.string().trim().max(120),
        location: z.string().trim().max(120),
      })
      .partial()
      .strict()
      .refine((patch) => Object.keys(patch).length > 0),
    reason: reasonSchema,
    evidence: z.array(sellerEvidenceSchema).min(1).max(8),
  })
  .strict();
