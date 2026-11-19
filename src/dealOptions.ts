import {
  missingTerms,
  turnTerms,
  type Deal,
  type DealAction,
  type DealPhase,
  type DealRole,
  type DealTerms,
} from "../shared/deal.ts";
import {
  acceptMessage,
  askToConfirmMessage,
  cancelDealMessage,
  confirmAgreementMessage,
  declineMessage,
  withdrawMessage,
} from "../shared/dealMessages.ts";
import { campusPickupPoints } from "../shared/campusPickupPoints.ts";
import type { Product } from "../shared/marketplace.ts";
import type { ThreadTurn } from "../shared/threadTurn.ts";
import { places } from "./components/onboarding/onboardingContent.ts";

/**
 * Why the offer card opens: a first offer, a counter, the time and place an
 * offer left open, a change to the student's own offer, or a time for terms
 * that look agreed.
 */
export type OfferMode = "offer" | "counter" | "complete" | "change" | "confirm";
export type OfferEntry = {
  mode: OfferMode;
  /** What the card starts from; unsettled terms are null. */
  terms: DealTerms;
};

/** One thing the deal card offers. Only "act" sends, and only on the student's tap. */
export type DealOption =
  | {
      kind: "act";
      id: string;
      label: string;
      action: DealAction;
      /** Exactly what the tap sends, shown before it. */
      message: string;
      /** Asked first when the tap ends something. */
      confirm?: string;
    }
  | { kind: "edit"; id: string; label: string; entry: OfferEntry }
  /** Puts a message in the composer; sending it is a second tap. */
  | { kind: "write"; id: string; label: string; message: string }
  | { kind: "find_similar"; id: string; label: string };

export type DealOptions = { primary?: DealOption; secondary: DealOption[] };

const NONE: DealOptions = { secondary: [] };

export const NO_TERMS: DealTerms = {
  amount: null,
  fulfillment: null,
  pickupAt: null,
  pickupTime: null,
  pickupPoint: null,
};

/** The terms Pako read as agreed, merged over what both had agreed before. */
export const lookedAgreedTerms = (turn: ThreadTurn, deal: Deal | null) =>
  turnTerms(turn, deal?.agreed?.terms ?? null);

/**
 * The phase the card shows. Pako's reading that the other student accepts,
 * with only an exact time still open, already looks agreed: the card asks for
 * a time before Confirm.
 */
export function cardPhase(phase: DealPhase, turn: ThreadTurn | null) {
  const missing = turn?.agreement.missing ?? [];
  return phase === "your_turn" &&
    turn?.agreement.status === "partial" &&
    missing.length > 0 &&
    missing.every((field) => field === "pickupTime")
    ? "looks_agreed"
    : phase;
}

export const confirmLabel = (role: DealRole, terms: DealTerms) =>
  role === "seller"
    ? "Confirm sale"
    : terms.fulfillment === "shipping"
      ? "Confirm purchase"
      : "Confirm pickup";

/** Names what an incomplete offer still needs from the student. */
function completeLabel(terms: DealTerms) {
  const missing = missingTerms(terms);
  if (missing.every((field) => field === "amount")) return "Choose a price";
  if (!missing.includes("amount")) return "Choose time & place";
  return "Complete the offer";
}

const edit = (
  id: string,
  label: string,
  mode: OfferMode,
  terms: DealTerms,
): DealOption => ({ kind: "edit", id, label, entry: { mode, terms } });

const decline = (other: string): DealOption => ({
  kind: "act",
  id: "decline",
  label: "Decline",
  action: { type: "decline" },
  message: declineMessage(),
  confirm: `Decline ${other}'s offer?`,
});

const withdraw: DealOption = {
  kind: "act",
  id: "withdraw",
  label: "Withdraw",
  action: { type: "withdraw" },
  message: withdrawMessage(),
  confirm: "Withdraw your offer?",
};

function cancelDeal(role: DealRole, other: string, title: string): DealOption {
  return {
    kind: "act",
    id: "cancel",
    label: "Cancel deal",
    action: { type: "cancel", reason: "changed_mind" },
    message: cancelDealMessage(),
    confirm:
      role === "seller"
        ? `Cancel the deal with ${other}? The ${title} becomes available again.`
        : `Cancel the deal with ${other}? The ${title} won't be reserved for you anymore.`,
  };
}

/** A pickup that has no exact time yet, or one that has passed, needs a new time first. */
const needsTime = (terms: DealTerms, now: Date) =>
  terms.fulfillment !== "shipping" &&
  (terms.pickupAt === null || Date.parse(terms.pickupAt) <= now.getTime());

/**
 * What the deal card offers in each phase, from the reading student's side:
 * one primary action at most, quieter ones beside it. Taps that send say
 * exactly what they send; offers and counters open the offer card first.
 */
export function dealOptions({
  phase,
  deal,
  listing,
  role,
  otherName,
  turn,
  now,
}: {
  phase: DealPhase;
  deal: Deal | null;
  listing: Pick<Product, "title" | "price" | "status">;
  role: DealRole;
  otherName: string;
  /** Pako's reading of the other student's latest message, if he has one. */
  turn: ThreadTurn | null;
  now: Date;
}): DealOptions {
  const proposal = deal?.proposal ?? null;
  const theirs = proposal && proposal.by !== role ? proposal.terms : null;
  const mine = proposal && proposal.by === role ? proposal.terms : null;
  switch (phase) {
    case "offer_received":
      return theirs
        ? {
            primary: {
              kind: "act",
              id: "confirm",
              label: confirmLabel(role, theirs),
              action: { type: "accept", terms: theirs },
              message: acceptMessage(role, theirs),
            },
            secondary: [
              edit("counter", "Counter", "counter", theirs),
              decline(otherName),
            ],
          }
        : NONE;
    case "partial_received":
      return theirs
        ? {
            primary: edit(
              "complete",
              completeLabel(theirs),
              "complete",
              theirs,
            ),
            secondary: [
              edit("counter", "Counter", "counter", theirs),
              decline(otherName),
            ],
          }
        : NONE;
    case "looks_agreed": {
      if (!turn) return NONE;
      const agreed = lookedAgreedTerms(turn, deal);
      const change = edit("change", "Not right? Change it", "change", agreed);
      return needsTime(agreed, now)
        ? {
            primary: edit("time", "Pick a time to confirm", "confirm", {
              ...agreed,
              pickupAt: null,
              pickupTime: null,
            }),
            secondary: [change],
          }
        : {
            primary: {
              kind: "act",
              id: "confirm",
              label: confirmLabel(role, agreed),
              action: { type: "propose", terms: agreed },
              message: confirmAgreementMessage(agreed),
            },
            secondary: [change],
          };
    }
    case "agreed":
      return { secondary: [cancelDeal(role, otherName, listing.title)] };
    case "cancelled":
      return role === "buyer"
        ? {
            secondary: [
              { kind: "find_similar", id: "similar", label: "Find similar" },
            ],
          }
        : NONE;
    case "gone":
    case "completed":
      return NONE;
  }
  if (mine)
    return {
      secondary: [
        edit("change", "Change offer", "change", mine),
        withdraw,
        ...(turn?.stance === "accepts"
          ? [
              {
                kind: "write" as const,
                id: "ask-confirm",
                label: `Ask ${otherName} to confirm`,
                message: askToConfirmMessage(),
              },
            ]
          : []),
      ],
    };
  return role === "buyer" && listing.status === "active" && !proposal
    ? {
        primary: edit(
          "offer",
          listing.price === 0 ? "Plan pickup" : "Make an offer",
          "offer",
          NO_TERMS,
        ),
        secondary: [],
      }
    : NONE;
}

/** Cheap items move by the franc, everything else by five. */
export const priceStep = (asking: number) => (asking < 20 ? 1 : 5);

const roundTo = (value: number, step: number) =>
  Math.max(step, Math.round(value / step) * step);

/**
 * Prices to tap. A first offer starts at the asking price and 10 and 20 %
 * below it; a counter lies strictly between both sides' latest prices. A free
 * item has no price to choose.
 */
export function priceChoices({
  asking,
  counter,
}: {
  asking: number;
  /** Both sides' latest prices when countering. */
  counter?: { theirs: number; mine: number };
}): number[] {
  if (asking === 0) return [];
  if (counter) {
    const low = Math.min(counter.theirs, counter.mine);
    const high = Math.max(counter.theirs, counter.mine);
    const step = high - low >= 15 ? 5 : 1;
    const between = [0.25, 0.5, 0.75]
      .map((share) => roundTo(low + (high - low) * share, step))
      .filter((price) => price > low && price < high);
    return [...new Set(between)];
  }
  const step = priceStep(asking);
  return [
    ...new Set([
      asking,
      roundTo(asking * 0.9, step),
      roundTo(asking * 0.8, step),
    ]),
  ].filter((price) => price <= asking);
}

/**
 * The other side's latest price against the student's own for a counter: the
 * student's last offer, or for a seller who offered nothing yet the asking
 * price. A buyer without an offer of their own counters below the seller's.
 */
export function counterPrices({
  role,
  theirs,
  mineBefore,
  asking,
}: {
  role: DealRole;
  theirs: number;
  /** The student's latest price in this thread, if they named one. */
  mineBefore: number | null;
  asking: number;
}): { theirs: number; mine: number } {
  const mine =
    mineBefore ??
    (role === "seller" ? asking : roundTo(theirs * 0.8, priceStep(asking)));
  return { theirs, mine };
}

/** Meeting points to tap: the one already named, the listing's, and the one near the student. */
export function meetingPointChoices(
  ...points: (string | null | undefined)[]
): string[] {
  return [
    ...new Set(points.filter((point): point is string => Boolean(point))),
  ];
}

/**
 * The meeting point where the student searches from, for an area picked in
 * the intro: its campus point with a known address, or the intro's own label.
 */
export function nearbyMeetingPoint(searchArea: string): string | undefined {
  const place = places.find((entry) => entry.searchArea === searchArea);
  if (!place) return undefined;
  return (
    campusPickupPoints.find(
      (point) =>
        point.name.includes(place.name) || point.area.startsWith(place.name),
    )?.name ?? place.meetingPoint
  );
}
