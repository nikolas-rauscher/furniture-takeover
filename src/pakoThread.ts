import {
  AUTO_READ_MIN_REMAINING,
  NUDGE_AFTER_HOURS,
} from "../shared/dealConfig.ts";
import type { Deal, DealRole } from "../shared/deal";
import type { Product } from "../shared/marketplace";
import { OTHER_TOKEN, type ThreadTurn } from "../shared/threadTurn.ts";

/** A message of the open thread, as the student reading it sees it. */
export type ThreadMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  at: string;
  /** Sent from the deal card, so its terms are on the card already. */
  structured?: boolean;
};

/** What Pako does about the latest message: read it, offer to on a tap, explain why not, or wait. */
export type ReadDecision = "read" | "paused" | "asleep" | "offline" | "idle";

/**
 * Pako reads by himself only a thread on screen, once its messages have
 * loaded, when its newest message is the other student's own writing and he
 * has not read or tried to read it yet. A message sent from the deal card
 * carries its terms already and is never read. He also needs automatic
 * reading switched on, a few readings left today and a connection; otherwise
 * he says why and waits for a tap. A failed reading is never repeated without
 * one.
 */
export function pakoReadDecision({
  latest,
  loaded,
  handledId,
  visible,
  autoRead,
  remaining,
  online,
}: {
  latest: Pick<ThreadMessage, "id" | "from" | "structured"> | undefined;
  loaded: boolean;
  /** The message Pako already read, or already tried to read. */
  handledId: string | undefined;
  visible: boolean;
  autoRead: boolean;
  /** Readings left today; unknown until the first reading with an account, and unlimited in the local demo. */
  remaining: number | undefined;
  online: boolean;
}): ReadDecision {
  if (!visible || !loaded || latest?.from !== "them" || latest.structured)
    return "idle";
  if (handledId === latest.id) return "idle";
  if (remaining === 0) return "asleep";
  if (!online) return "offline";
  if (
    !autoRead ||
    (remaining !== undefined && remaining < AUTO_READ_MIN_REMAINING)
  )
    return "paused";
  return "read";
}

export type ThreadNotice =
  | { kind: "gone"; status: Exclude<Product["status"], "active"> }
  | { kind: "no_answer"; hoursWaiting: number };

const HOUR = 3_600_000;

/**
 * What Pako points out without reading anything: to a buyer, that the item is
 * no longer available; to either side, that their last message has waited a
 * day for an answer. Once both agreed, the item is reserved for this buyer
 * and there is nothing to answer, so he points out neither.
 */
export function threadNotice({
  role,
  listingStatus,
  dealStatus,
  messages,
  now,
  canNudge,
}: {
  role: DealRole;
  listingStatus: Product["status"];
  /** The thread's deal, if the students started one. */
  dealStatus: Deal["status"] | undefined;
  messages: readonly ThreadMessage[];
  now: Date;
  /** Sample sellers never reply, so nudging them helps nobody. */
  canNudge: boolean;
}): ThreadNotice | null {
  if (dealStatus === "agreed" || dealStatus === "completed") return null;
  if (role === "buyer" && listingStatus !== "active")
    return { kind: "gone", status: listingStatus };
  const latest = messages.at(-1);
  if (!canNudge || latest?.from !== "me") return null;
  const hoursWaiting = (now.getTime() - Date.parse(latest.at)) / HOUR;
  return hoursWaiting >= NUDGE_AFTER_HOURS
    ? { kind: "no_answer", hoursWaiting }
    : null;
}

/** Pako's words with the other student's name where he left his placeholder. */
export const withName = (text: string, name: string) =>
  text.replaceAll(OTHER_TOKEN, name);

/** The other student's own words that Pako's reading rests on, each quoted once. */
export const theirQuotes = (turn: ThreadTurn) => [
  ...new Set(
    Object.values(turn.facts)
      .filter((fact) => fact.from === "them")
      .map((fact) => fact.quote),
  ),
];
