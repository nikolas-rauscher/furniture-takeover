import {
  dealPhase,
  messageStatesTerms,
  missingTerms,
  pickupDay,
  type Deal,
  type DealEvent,
  type DealEventKind,
  type DealPhase,
  type DealRole,
  type DealTerms,
  type LateMinutes,
  type PickupEvent,
  type PickupPhase,
} from "../shared/deal.ts";
import { money, type Product } from "../shared/marketplace.ts";
import { formatPickup, zurichClockTime } from "../shared/pickupTime.ts";
import type { ThreadMessage } from "./pakoThread.ts";

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

const zurichLongWeekday = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zurich",
  weekday: "long",
});

function relativePickup(iso: string, now: Date, weekday: Intl.DateTimeFormat) {
  const days = daysBetween(now.getTime(), Date.parse(iso));
  const clock = zurichClockTime(iso);
  if (days === 0) return `Today ${clock}`;
  if (days === 1) return `Tomorrow ${clock}`;
  return days < 7
    ? `${weekday.format(new Date(iso))} ${clock}`
    : formatPickup(iso);
}

/** A pickup on a chip: "Today 18:00", "Tomorrow 18:00", "Sat 11:00" within the week, otherwise its date. */
export const slotLabel = (iso: string, now: Date) =>
  relativePickup(iso, now, zurichWeekday);

/** A pickup in Pako's words: "Saturday 11:00" within the week, otherwise as on a chip. */
export const spokenSlot = (iso: string, now: Date) =>
  relativePickup(iso, now, zurichLongWeekday);

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

/** The terms an offer leaves open, listed: "time and place". */
export function openTermsList(terms: DealTerms): string {
  const missing = missingTerms(terms);
  const words = [
    missing.includes("amount") && "price",
    missing.includes("fulfillment") &&
      !missing.includes("pickupTime") &&
      "handover",
    missing.includes("pickupTime") && "time",
    missing.includes("pickupPoint") && "place",
  ].filter((word): word is string => Boolean(word));
  return words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** What an offer leaves open, in a few words: "time and place open". */
export function openTerms(terms: DealTerms): string {
  const listed = openTermsList(terms);
  return listed && `${listed} open`;
}

/** The terms of an offer that is still missing some, with what it leaves open. */
const partialSummary = (terms: DealTerms) =>
  [termsSummary(terms, "brief"), openTerms(terms)].filter(Boolean).join(" · ");

/** How the strip looks: a nudge to act, a calm wait, a booked pickup or a closed deal. */
type StripTone = "start" | "needs" | "waiting" | "booked" | "closed";
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

/**
 * A finished deal from one side: the seller sold, the buyer picked the item
 * up, or a shipped deal is simply completed. Nothing is reserved anymore.
 */
export function completedWords(role: DealRole, terms: DealTerms | null) {
  if (role === "seller") return "Sold";
  return terms?.fulfillment === "shipping" ? "Deal completed" : "Picked up";
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

/** "40 min", "2 h 10 min", "2 days": a stretch of time, rounded to the minute. */
function stretchWords(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const rest = minutes % 60;
    return `${Math.floor(minutes / 60)} h${rest ? ` ${rest} min` : ""}`;
  }
  const days = Math.round(minutes / (24 * 60));
  return days === 1 ? "1 day" : `${days} days`;
}

/** The calm countdown of a booked pickup: "Pickup in 2 h 10 min", "Pickup now", "15 min overdue". */
export function pickupCountdown({
  phase,
  minutesUntil,
}: {
  phase: PickupPhase;
  minutesUntil: number;
}): string {
  if (phase === "overdue")
    return `${stretchWords(Math.floor(-minutesUntil))} overdue`;
  if (phase === "pickup_now") return "Pickup now";
  return `Pickup in ${stretchWords(Math.max(1, Math.ceil(minutesUntil)))}`;
}

/** Nobody answered Pako's pickup question in time, so the reservation ended. */
const RELEASED_STRIP: StripView = {
  lead: "Reservation released",
  detail: "No one confirmed the pickup",
  tone: "closed",
};

/** A booked pickup on its day, or with a new time on the table: the countdown leads. */
function pickupStrip(
  deal: Deal,
  role: DealRole,
  other: string,
  now: Date,
): StripView | null {
  const day = pickupDay(deal, role, now);
  if (!day) return null;
  const place = day.terms.pickupPoint && shortPlace(day.terms.pickupPoint);
  if (day.pickupCheck)
    return day.pickupCheck.expired
      ? RELEASED_STRIP
      : {
          lead: "Did the pickup happen?",
          detail: `Answer by ${formatPickup(day.pickupCheck.expiresAt)}`,
          tone: "needs",
        };
  if (day.change === "received" && deal.proposal?.terms.pickupAt)
    return {
      lead: `${other} suggests a new time`,
      detail: formatPickup(deal.proposal.terms.pickupAt),
      tone: "needs",
    };
  if (day.phase === "booked") return null;
  return {
    lead: pickupCountdown(day),
    detail: [zurichClockTime(day.terms.pickupAt!), place]
      .filter(Boolean)
      .join(" · "),
    tone: "needs",
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
  now,
}: {
  phase: DealPhase;
  deal: Deal | null;
  role: DealRole;
  other: string;
  listing: Pick<Product, "price" | "status">;
  /** The terms Pako read as agreed, while the card says "Looks agreed". */
  agreedTerms?: DealTerms;
  /** The clock pickup day counts down on. */
  now: Date;
}): StripView | null {
  const proposal = deal?.proposal;
  const mine = proposal?.by === role;
  switch (phase) {
    case "agreed":
      return deal?.agreed
        ? (pickupStrip(deal, role, other, now) ??
            bookedStrip(deal.agreed.terms))
        : null;
    case "completed":
      return {
        lead: `${completedWords(role, deal?.agreed?.terms ?? null)} ✓`,
        detail:
          role === "seller" && deal?.agreed?.terms.amount != null
            ? termPrice(deal.agreed.terms.amount)
            : "",
        tone: "booked",
      };
    case "cancelled":
      if (deal?.outcome?.kind === "pickup_expired") return RELEASED_STRIP;
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

/** The deal on a thread card in the inbox: "Offer · CHF 40", "Agreed · Thu 18:00", "Did the pickup happen?". */
export function threadDealNote(
  deal: Deal | null | undefined,
  role: DealRole,
  now: Date,
): string | undefined {
  if (!deal) return undefined;
  if (deal.status === "agreed" && deal.agreed) {
    const check = pickupDay(deal, role, now)?.pickupCheck;
    if (check) return check.expired ? RELEASED_STRIP.lead : "Did the pickup happen?";
    const { pickupAt } = deal.agreed.terms;
    return pickupAt ? `Agreed · ${shortPickup(pickupAt)}` : "Agreed";
  }
  if (deal.status === "completed")
    return completedWords(role, deal.agreed?.terms ?? null);
  if (deal.outcome?.kind === "pickup_expired") return RELEASED_STRIP.lead;
  if (deal.status === "cancelled") return "Deal cancelled";
  const { proposal } = deal;
  if (!proposal) return undefined;
  const price =
    proposal.terms.amount === null ? "" : ` · ${termPrice(proposal.terms.amount)}`;
  return proposal.by === role ? `Your offer${price}` : `Offer${price}`;
}

type AwayDeal = {
  deal: Deal;
  role: DealRole;
  listing: Pick<Product, "price" | "status">;
  /** The thread's newest message, which tells whether an offer still waits; unknown on a listing page. */
  latest?: ThreadMessage;
  now: Date;
};

/** Where a deal stands where its thread is not open, such as on Home. */
export const awayPhase = ({ deal, role, listing, latest, now }: AwayDeal) =>
  dealPhase({
    deal,
    listing,
    role,
    messages: latest ? [latest] : [],
    turn: null,
    now,
  });

/**
 * A deal in one line where its thread is not open, such as on Home or on its
 * listing: the strip's words, read from the deal and, where known, the
 * thread's newest message.
 */
export function dealView({
  other,
  ...away
}: AwayDeal & { other: string }): StripView | null {
  const { deal, role, listing, now } = away;
  const phase = awayPhase(away);
  const view = dealStrip({ phase, deal, role, other, listing, now });
  return view?.tone === "start" ? null : view;
}

/** A seller's listing that an agreed deal reserved: "Reserved for Arjun · Thu 18:00". */
export const reservedForChip = (other: string, terms: DealTerms) =>
  [`Reserved for ${other}`, terms.pickupAt && shortPickup(terms.pickupAt)]
    .filter(Boolean)
    .join(" · ");

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
      return "Shipped ✓ · deal completed";
    case "pickup_check_due":
      return "Pako asked: did the pickup happen?";
    case "pickup_expired":
      return "Reservation released · no one confirmed the pickup";
  }
}

/** A pickup-day change as the thread notes it, with who made it. */
type PickupNews = PickupEvent & { actor: DealRole };

const PICKUP_KINDS: ReadonlySet<string> = new Set<PickupEvent["kind"]>([
  "time_suggested",
  "time_accepted",
  "time_kept",
  "time_withdrawn",
  "on_my_way",
  "late",
  "no_show",
  "no_show_released",
  "pickup_cancelled",
  "picked_up",
  "offered_again",
]);

export const isPickupKind = (
  kind: DealEventKind | PickupEvent["kind"],
): kind is PickupEvent["kind"] => PICKUP_KINDS.has(kind);

/** Any change in a thread, as its timeline reads it. */
export type ThreadNews = {
  kind: DealEventKind | PickupEvent["kind"];
  terms: DealTerms | null;
  minutes?: LateMinutes;
  actor?: DealRole | null;
};

/** The row a thread shows for a change: a deal chip, or a pickup-day row that says who. */
export function threadNewsText(
  event: ThreadNews,
  reader: { role: DealRole; other: string },
): string {
  const { kind, terms, minutes, actor } = event;
  if (!isPickupKind(kind)) return eventChip({ kind, terms });
  if (!actor) throw new Error(`Pickup news ${kind} has no actor.`);
  return pickupNewsRow({ kind, terms, minutes, actor }, reader);
}

/**
 * The quiet row under a pickup-day message, from the reading student's side:
 * "Léa is on the way", "You're about 10 min late", "New time agreed · …".
 */
function pickupNewsRow(
  event: PickupNews,
  { role, other }: { role: DealRole; other: string },
): string {
  const mine = event.actor === role;
  const time = event.terms?.pickupAt && formatPickup(event.terms.pickupAt);
  switch (event.kind) {
    case "time_suggested":
      return time ? `New time suggested · ${time}` : "New time suggested";
    case "time_accepted":
      return time ? `New time agreed · ${time}` : "New time agreed";
    case "time_kept":
      return "Pickup time kept";
    case "time_withdrawn":
      return "New time withdrawn";
    case "on_my_way":
      return mine ? "You're on the way" : `${other} is on the way`;
    case "late":
      return mine
        ? `You're about ${event.minutes} min late`
        : `${other} is about ${event.minutes} min late`;
    case "no_show":
      return mine
        ? "You're waiting at the meeting point"
        : `${other} is waiting at the meeting point`;
    case "no_show_released":
      return "Pickup released · available again";
    case "pickup_cancelled":
      return "Pickup cancelled · available again";
    case "picked_up":
      if (event.actor === "seller") return "Sold ✓";
      return mine ? "You picked it up ✓" : `${other} picked it up ✓`;
    case "offered_again":
      return "Available again";
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
