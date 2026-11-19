import {
  messageStatesTerms,
  missingTerms,
  type Deal,
  type DealEvent,
  type DealPhase,
  type DealRole,
  type DealTerms,
} from "../shared/deal.ts";
import { money, type Product } from "../shared/marketplace.ts";
import { formatPickup, zurichClockTime } from "../shared/pickupTime.ts";

/** The terms as students read them; null where nothing is settled yet. */
export type ShownTerms = {
  amount: number | null;
  fulfillment: "pickup" | "shipping" | null;
  /** The pickup in words, such as "Thu 20 Nov, 18:00". */
  pickupTime: string | null;
  pickupPoint: string | null;
};

/** A price as a deal states it: a free item says so instead of "CHF 0". */
export const termPrice = (amount: number) =>
  amount === 0 ? "Free" : money(amount);

/** "FMEL Vortex · outside reception" reads as "FMEL Vortex" where room is short. */
export const shortPlace = (point: string) => point.split(" · ")[0];

const zurichWeekday = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zurich",
  weekday: "short",
});

/** "Thu 18:00": the pickup's weekday and Zurich clock time. */
export const shortPickup = (iso: string) =>
  `${zurichWeekday.format(new Date(iso))} ${zurichClockTime(iso)}`;

const zurichDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Zurich",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DAY_MS = 86_400_000;
/** Whole Zurich calendar days from one instant to another. */
const daysBetween = (from: number, to: number) =>
  Math.round(
    (Date.parse(zurichDay.format(to)) - Date.parse(zurichDay.format(from))) /
      DAY_MS,
  );

/** A pickup on a chip: "Today 18:00", "Tomorrow 18:00", "Sat 11:00" within the week, otherwise its date. */
export function slotLabel(iso: string, now: Date): string {
  const days = daysBetween(now.getTime(), Date.parse(iso));
  if (days === 0) return `Today ${zurichClockTime(iso)}`;
  if (days === 1) return `Tomorrow ${zurichClockTime(iso)}`;
  return days < 7 ? shortPickup(iso) : formatPickup(iso);
}

/** Terms for the tiles: an exact pickup reads as its date and clock time. */
export function shownTerms(terms: DealTerms): ShownTerms {
  return {
    amount: terms.amount,
    fulfillment: terms.fulfillment,
    pickupTime: terms.pickupAt
      ? formatPickup(terms.pickupAt)
      : terms.pickupTime,
    pickupPoint: terms.pickupPoint,
  };
}

type Length = "brief" | "full";

function pickupWords(terms: DealTerms, length: Length) {
  if (!terms.pickupAt) return terms.pickupTime;
  return length === "brief"
    ? shortPickup(terms.pickupAt)
    : formatPickup(terms.pickupAt);
}

/**
 * The settled terms in one line: "CHF 40 · Thu 18:00 · FMEL Vortex" for the
 * strip, with the full date ("Thu 20 Nov, 18:00") everywhere else.
 */
export function termsSummary(terms: DealTerms, length: Length): string {
  const parts = [terms.amount === null ? null : termPrice(terms.amount)];
  if (terms.fulfillment === "shipping") parts.push("Shipping");
  else
    parts.push(
      pickupWords(terms, length),
      terms.pickupPoint && shortPlace(terms.pickupPoint),
    );
  return parts.filter(Boolean).join(" · ");
}

/** The terms inside a sentence: "CHF 45 on Fri 20 Nov, 19:30 at FMEL Vortex · outside reception". */
export function termsSentence(terms: DealTerms): string {
  const price =
    terms.amount === null
      ? null
      : terms.amount === 0
        ? "it free"
        : termPrice(terms.amount);
  if (terms.fulfillment === "shipping")
    return [price, "with shipping"].filter(Boolean).join(" ");
  const time = pickupWords(terms, "full");
  return [
    price ?? (time && "a pickup"),
    time && `on ${time}`,
    terms.pickupPoint && `at ${terms.pickupPoint}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** What an offer leaves open, in a few words: "time and place open". */
export function openTerms(terms: DealTerms): string {
  const missing = missingTerms(terms);
  const words = [
    missing.includes("amount") && "price",
    missing.includes("fulfillment") &&
      !missing.includes("pickupTime") &&
      "handover",
    missing.includes("pickupTime") && "time",
    missing.includes("pickupPoint") && "place",
  ].filter((word): word is string => Boolean(word));
  if (!words.length) return "";
  const listed =
    words.length === 1
      ? words[0]
      : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
  return `${listed} open`;
}

/** The terms of an offer that is still missing some, with what it leaves open. */
const partialSummary = (terms: DealTerms) =>
  [termsSummary(terms, "brief"), openTerms(terms)].filter(Boolean).join(" · ");

/** How the strip looks: a nudge to act, a calm wait, a booked pickup or a closed deal. */
export type StripTone = "start" | "needs" | "waiting" | "booked" | "closed";
export type StripView = {
  lead: string;
  detail: string;
  /** Whose move it is, at the end of the line. */
  status?: string;
  tone: StripTone;
};

const GONE_LEAD: Record<
  DealRole,
  Record<Exclude<Product["status"], "active">, string>
> = {
  buyer: {
    reserved: "Reserved for someone else",
    sold: "Sold to someone else",
    withdrawn: "No longer listed",
  },
  seller: {
    reserved: "Listing reserved",
    sold: "Listing sold",
    withdrawn: "Listing archived",
  },
};

function cancelledDetail(deal: Deal, role: DealRole, other: string) {
  if (deal.outcome?.kind === "listing_reopened")
    return "The listing is available again";
  return deal.outcome?.by === role ? "You cancelled" : `${other} cancelled`;
}

/** An agreed deal: the booked pickup, or the price of a shipped item. */
function bookedStrip(terms: DealTerms): StripView {
  return terms.fulfillment === "shipping"
    ? {
        lead: "Deal agreed",
        detail: termsSummary(terms, "full"),
        tone: "booked",
      }
    : {
        lead: "Pickup booked",
        detail: [
          terms.pickupAt && formatPickup(terms.pickupAt),
          terms.pickupPoint && shortPlace(terms.pickupPoint),
        ]
          .filter(Boolean)
          .join(" · "),
        tone: "booked",
      };
}

/**
 * The deal in one calm line under the thread's header, from the reading
 * student's side. Null where a thread has no deal to show: a seller before
 * any offer, or a buyer where the listing is gone and nothing was offered.
 */
export function dealStrip({
  phase,
  deal,
  role,
  other,
  listing,
  agreedTerms,
}: {
  phase: DealPhase;
  deal: Deal | null;
  role: DealRole;
  other: string;
  listing: Pick<Product, "price" | "status">;
  /** The terms Pako read as agreed, while the card says "Looks agreed". */
  agreedTerms?: DealTerms;
}): StripView | null {
  const proposal = deal?.proposal;
  const mine = proposal?.by === role;
  switch (phase) {
    case "agreed":
      return deal?.agreed ? bookedStrip(deal.agreed.terms) : null;
    case "completed":
      return {
        lead: role === "buyer" ? "Picked up ✓" : "Sold ✓",
        detail:
          role === "seller" && deal?.agreed?.terms.amount != null
            ? termPrice(deal.agreed.terms.amount)
            : "",
        tone: "booked",
      };
    case "cancelled":
      return deal
        ? {
            lead: "Deal cancelled",
            detail: cancelledDetail(deal, role, other),
            tone: "closed",
          }
        : null;
    case "gone":
      return deal && listing.status !== "active"
        ? {
            lead: GONE_LEAD[role][listing.status],
            detail: "Offers closed",
            tone: "closed",
          }
        : null;
    case "offer_received":
      return proposal
        ? {
            lead: `${other} offers`,
            detail: termsSummary(proposal.terms, "brief"),
            tone: "needs",
          }
        : null;
    case "partial_received":
      return proposal
        ? {
            lead: `${other} suggests`,
            detail: partialSummary(proposal.terms),
            tone: "needs",
          }
        : null;
    case "looks_agreed":
      return agreedTerms
        ? {
            lead: "Looks agreed",
            detail: termsSummary(agreedTerms, "brief"),
            tone: "needs",
          }
        : null;
  }
  if (proposal && mine)
    return {
      lead: "Your offer",
      detail: partialSummary(proposal.terms),
      status: phase === "no_answer" ? "No answer yet" : `${other}'s turn`,
      tone: "waiting",
    };
  return role === "buyer" && listing.status === "active"
    ? {
        lead: "No offer yet",
        detail:
          listing.price === 0 ? "Free" : `Asking ${termPrice(listing.price)}`,
        tone: "start",
      }
    : null;
}

/** What a student reads once both confirmed: the cheer, then what it means for the item. */
export function agreedWords(
  role: DealRole,
  other: string,
  title: string,
): { cheer: string; meaning: string } {
  return role === "buyer"
    ? { cheer: "Deal!", meaning: `The ${title} is reserved for you.` }
    : {
        cheer: `Deal with ${other}!`,
        meaning: `The ${title} is reserved until pickup.`,
      };
}

/** The deal on a thread card in the inbox: "Offer · CHF 40", "Agreed · Thu 18:00". */
export function threadDealNote(
  deal: Deal | null | undefined,
  role: DealRole,
): string | undefined {
  if (!deal) return undefined;
  if (deal.status === "agreed" && deal.agreed) {
    const { pickupAt } = deal.agreed.terms;
    return pickupAt ? `Agreed · ${shortPickup(pickupAt)}` : "Agreed";
  }
  if (deal.status === "completed")
    return role === "seller" ? "Sold" : "Picked up";
  if (deal.status === "cancelled") return "Deal cancelled";
  const { proposal } = deal;
  if (!proposal) return undefined;
  const price =
    proposal.terms.amount === null ? "" : ` · ${termPrice(proposal.terms.amount)}`;
  return proposal.by === role ? `Your offer${price}` : `Offer${price}`;
}

/** The centred chip under a message that changed the deal, or alone for a system event. */
export function eventChip(event: DealEvent): string {
  switch (event.kind) {
    case "proposed":
      return event.terms
        ? `Offer · ${termsSummary(event.terms, "full")}`
        : "Offer";
    case "accepted":
      return event.terms
        ? `Agreed ✓ · ${termsSummary({ ...event.terms, pickupPoint: null }, "full")}`
        : "Agreed ✓";
    case "declined":
      return "Declined";
    case "withdrawn":
      return "Offer withdrawn";
    case "cancelled":
      return "Deal cancelled";
    case "superseded":
      return "Offers closed · reserved for someone else";
    case "listing_reopened":
      return "Listing available again · deal ended";
    case "completed":
      return "Sold ✓";
  }
}

/** The first term a message does not state, as the student would write it; null when it states them all. */
export function unstatedTerm(text: string, terms: DealTerms): string | null {
  const stated = messageStatesTerms(text, terms);
  if (stated.ok) return null;
  const [missing] = stated.missing;
  if (missing === "amount")
    return terms.amount === 0 ? "that it's free" : `CHF ${terms.amount}`;
  if (missing === "time")
    return terms.pickupAt ? zurichClockTime(terms.pickupAt) : terms.pickupTime;
  return terms.pickupPoint;
}

/**
 * What the composer says about terms that travel with a message: they update
 * the deal while the text states them, otherwise the message goes out plain.
 */
export function attachedTermsNote(
  text: string,
  terms: DealTerms,
): { states: boolean; line: string } {
  const unstated = unstatedTerm(text, terms);
  return unstated === null
    ? {
        states: true,
        line: `Also updates the deal: ${termsSummary(terms, "full")}`,
      }
    : {
        states: false,
        line: `Your text no longer mentions ${unstated}, so it will be sent as a normal message without updating the deal.`,
      };
}
