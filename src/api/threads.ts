import { z } from "zod";
import {
  THREAD_TURN_CHARS,
  THREAD_TURN_MESSAGES,
} from "../../shared/dealConfig.ts";
import type { Product } from "../../shared/marketplace";
import {
  threadTurnSchema,
  type ThreadListing,
  type ThreadTurnRequest,
  type ThreadTurnResponse,
} from "../../shared/threadTurn.ts";
import { accountAccessToken } from "../cloud/session.ts";
import type { ThreadMessage } from "../pakoThread";
import { AgentApiError, requestJson } from "./agent.ts";

const responseSchema = z
  .object({
    turn: threadTurnSchema,
    allowance: z
      .object({
        limit: z.number().int().positive(),
        remaining: z.number().int().min(0),
        resetAt: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

const clipped = (text: string | undefined, max: number) =>
  text?.trim() ? text.trim().slice(0, max) : undefined;

/** The listing facts Pako may read: never its photos or the seller's identity. */
function readableListing(listing: Product): ThreadListing {
  return {
    title: listing.title.slice(0, 180),
    description: clipped(listing.description, 2400),
    price: listing.price,
    location: clipped(listing.location, 180),
    condition: clipped(listing.condition, 160),
    dimensions: clipped(listing.dimensions, 160),
    pickup: clipped(
      [listing.available, listing.pickupBy].filter(Boolean).join("; "),
      500,
    ),
    pickupPoint: clipped(listing.pickupPoint?.name, 240),
    status: listing.status,
  };
}

/** The newest messages that fit what Pako reads at once, oldest first. */
function newestMessages(messages: readonly ThreadMessage[]) {
  const kept: ThreadMessage[] = [];
  let characters = 0;
  for (const message of [...messages].reverse()) {
    if (kept.length === THREAD_TURN_MESSAGES) break;
    if (characters + message.text.length > THREAD_TURN_CHARS) break;
    characters += message.text.length;
    kept.unshift({ ...message, at: new Date(message.at).toISOString() });
  }
  return kept;
}

/** What Pako is asked to read: one thread and its deal, seen from the student who asks. */
export function threadTurnRequest({
  role,
  listing,
  messages,
  deal,
  ask,
}: {
  role: ThreadTurnRequest["role"];
  listing: Product;
  messages: readonly ThreadMessage[];
  /** The deal as the student sees it, from threadDealSnapshot. */
  deal: ThreadTurnRequest["deal"];
  /** The student asked Pako for something, maybe about the text they are writing. */
  ask?: { instruction: string; draft: string };
}): ThreadTurnRequest {
  const draft = ask?.draft.trim();
  return {
    intent: "thread_turn",
    trigger: ask ? "ask" : "reply",
    ...(ask ? { instruction: ask.instruction } : {}),
    ...(draft ? { draft } : {}),
    role,
    listing: readableListing(listing),
    deal,
    messages: newestMessages(messages),
  };
}

/** Asks Pako to read a thread. Nothing is sent to the other student. */
export async function requestThreadTurn(
  request: ThreadTurnRequest,
  signal?: AbortSignal,
): Promise<ThreadTurnResponse> {
  const accessToken = await accountAccessToken();
  const data = await requestJson("/api/agent/thread", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  });
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success)
    throw new AgentApiError(
      "Pako's reading arrived incomplete. Try again.",
      "INVALID_RESPONSE",
    );
  return parsed.data;
}
