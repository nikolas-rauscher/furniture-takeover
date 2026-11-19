import { z } from "zod";
import type { AgentQuota } from "./agent.ts";
import { dealTermsSchema, isoInstantSchema } from "./deal.ts";
import { THREAD_TURN_CHARS, THREAD_TURN_MESSAGES } from "./dealConfig.ts";

/**
 * Pako's private reading of one conversation for one student: what the other
 * student's latest message means, the terms as they stand with their quotes,
 * and up to three messages the student could send next. Nothing here is sent.
 */

export const THREAD_STANCES = [
  "question",
  "offer",
  "counter",
  "accepts",
  "declines",
  "unavailable",
  "smalltalk",
  "other",
] as const;
export const THREAD_OPTION_KINDS = [
  "accept",
  "counter",
  "answer",
  "ask",
  "decline",
] as const;
/** Pako refers to the other student by this token; the app puts in their name. */
export const OTHER_TOKEN = "{other}";

const threadMessageSchema = z
  .object({
    id: z.string().min(1).max(120),
    from: z.enum(["me", "them"]),
    text: z.string().trim().min(1).max(4000),
    at: isoInstantSchema,
    /** The message carries its terms on the deal card already. */
    structured: z.boolean().optional(),
  })
  .strict();

/** The listing facts Pako may use; never photos or the seller's identity. */
const threadListingSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().max(2400).optional(),
    price: z.number().finite().min(0).max(1_000_000),
    location: z.string().max(180).optional(),
    condition: z.string().max(160).optional(),
    dimensions: z.string().max(160).optional(),
    pickup: z.string().max(500).optional(),
    pickupPoint: z.string().max(240).optional(),
    status: z.enum(["active", "reserved", "sold", "withdrawn"]),
  })
  .strict();
export type ThreadListing = z.infer<typeof threadListingSchema>;

/** What both students confirmed so far, from the reading student's side. */
const threadDealSchema = z
  .object({
    status: z.enum(["open", "agreed", "completed", "cancelled"]),
    agreed: dealTermsSchema.nullable(),
    proposal: z
      .object({ terms: dealTermsSchema, by: z.enum(["me", "them"]) })
      .strict()
      .nullable(),
  })
  .strict();

export const threadTurnRequestSchema = z
  .object({
    intent: z.literal("thread_turn"),
    /** reply: new messages from the other student; ask: the student asked Pako. */
    trigger: z.enum(["reply", "ask"]),
    /** What the student asked for, such as "Make it friendlier". */
    instruction: z.string().trim().min(1).max(300).optional(),
    /** The composer text to rewrite. */
    draft: z.string().trim().min(1).max(4000).optional(),
    role: z.enum(["buyer", "seller"]),
    listing: threadListingSchema,
    deal: threadDealSchema.nullable(),
    /** The newest messages, oldest first. */
    messages: z.array(threadMessageSchema).max(THREAD_TURN_MESSAGES),
  })
  .strict()
  .superRefine((request, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: "custom", message });
    const last = request.messages.at(-1);
    if (request.trigger === "reply" && last?.from !== "them")
      issue("A reply reading needs the other student's message last.");
    if (request.trigger === "reply" && last?.structured)
      issue("Structured messages already carry their terms on the deal card.");
    if (request.trigger === "ask" && !request.instruction)
      issue("Asking Pako needs an instruction.");
    if (
      request.trigger === "reply" &&
      (request.instruction !== undefined || request.draft !== undefined)
    )
      issue("Only asking Pako takes an instruction or a draft.");
    const ids = request.messages.map((message) => message.id);
    if (new Set(ids).size !== ids.length) issue("Message ids must be unique.");
    const times = request.messages.map((message) => Date.parse(message.at));
    if (times.some((time, index) => index > 0 && time < times[index - 1]))
      issue("Messages must be in the order they were sent.");
    const characters = request.messages.reduce(
      (total, message) => total + message.text.length,
      0,
    );
    if (characters > THREAD_TURN_CHARS)
      issue("The messages are longer than Pako reads at once.");
  });
export type ThreadTurnRequest = z.infer<typeof threadTurnRequestSchema>;

const quoteSchema = z.string().min(1).max(600);
const factSchema = <Value extends z.ZodType>(value: Value) =>
  z
    .object({
      value,
      quote: quoteSchema,
      from: z.enum(["me", "them", "listing"]),
    })
    .strict();
const pickupWordsSchema = z.string().trim().min(1).max(240);

export const threadFactsSchema = z
  .object({
    amount: factSchema(z.number().int().min(0).max(1_000_000)).optional(),
    fulfillment: factSchema(z.enum(["pickup", "shipping"])).optional(),
    pickupTime: factSchema(pickupWordsSchema).optional(),
    pickupPoint: factSchema(pickupWordsSchema).optional(),
  })
  .strict();
export type ThreadFacts = z.infer<typeof threadFactsSchema>;

const threadOptionSchema = z
  .object({
    id: z.string().regex(/^opt-[1-3]$/),
    label: z.string().trim().min(1).max(40),
    kind: z.enum(THREAD_OPTION_KINDS),
    message: z.string().trim().min(1).max(600),
    /** The terms the message proposes or accepts, as the deal card records them. */
    terms: dealTermsSchema.nullable(),
  })
  .strict();
export type ThreadOption = z.infer<typeof threadOptionSchema>;

export const threadTurnSchema = z
  .object({
    /** The newest message Pako read; null when the thread had none yet. */
    forMessageId: z.string().min(1).max(120).nullable(),
    summary: z.string().trim().min(1).max(200),
    /** ISO 639-1 language of the summary and options. */
    language: z.string().regex(/^[a-z]{2}$/),
    stance: z.enum(THREAD_STANCES),
    facts: threadFactsSchema,
    /** The instant the pickup words name, worked out by the server. */
    pickupAt: isoInstantSchema.nullable(),
    agreement: z
      .object({
        status: z.enum(["none", "partial", "complete"]),
        missing: z.array(
          z.enum(["amount", "fulfillment", "pickupTime", "pickupPoint"]),
        ),
      })
      .strict(),
    options: z.array(threadOptionSchema).max(3),
  })
  .strict()
  .refine((turn) => turn.options.length > 0 || turn.stance === "accepts", {
    path: ["options"],
    message: "Only an acceptance can have no suggested replies.",
  });
export type ThreadTurn = z.infer<typeof threadTurnSchema>;

export type ThreadTurnResponse = {
  turn: ThreadTurn;
  /** With accounts: the student's reply readings left today. */
  allowance?: AgentQuota;
};
