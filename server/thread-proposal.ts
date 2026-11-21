import { z } from "zod";
import {
  THREAD_OPTION_KINDS,
  THREAD_STANCES,
  threadFactsSchema,
} from "../shared/threadTurn.ts";

/** What Pako proposes for one conversation, before the server checks it. */
const proposedTermsSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000).optional(),
    fulfillment: z.enum(["pickup", "shipping"]).optional(),
    pickupTime: z.string().trim().min(1).max(240).optional(),
    pickupPoint: z.string().trim().min(1).max(240).optional(),
  })
  .strict();
export const proposalSchema = z
  .object({
    summary: z.string().trim().min(1).max(200),
    language: z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/),
    stance: z.enum(THREAD_STANCES),
    facts: threadFactsSchema,
    options: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).describe("At most 40 characters."),
            kind: z.enum(THREAD_OPTION_KINDS),
            message: z
              .string()
              .trim()
              .min(1)
              .max(600)
              .optional()
              .describe(
                "For a short question, write the complete question as label and omit message. Otherwise write a draft containing only what the label says.",
              ),
            terms: proposedTermsSchema.optional(),
          })
          .strict()
          .transform((option) => ({
            ...option,
            message:
              option.message ??
              (option.kind === "ask" && /[?？]$/.test(option.label)
                ? option.label
                : ""),
          })),
      )
      .max(3),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposedOption = Proposal["options"][number];
