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
