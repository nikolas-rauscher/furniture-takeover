import { z } from "zod";

/** An exact UTC instant, as the server and the database store pickups. */
export const isoInstantSchema = z
  .string()
  .datetime()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);

/**
 * Terms both students read: whole francs (0 is free), the handover, the
 * pickup as an exact instant together with the words they used, and a meeting
 * point. Unknown terms are null.
 */
export const dealTermsSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000).nullable(),
    fulfillment: z.enum(["pickup", "shipping"]).nullable(),
    pickupAt: isoInstantSchema.nullable(),
    pickupTime: z.string().trim().min(1).max(240).nullable(),
    pickupPoint: z.string().trim().min(1).max(240).nullable(),
  })
  .strict()
  .refine(
    (terms) => terms.pickupAt === null || terms.pickupTime !== null,
    "A pickup instant needs the words both students read.",
  );
export type DealTerms = z.infer<typeof dealTermsSchema>;
