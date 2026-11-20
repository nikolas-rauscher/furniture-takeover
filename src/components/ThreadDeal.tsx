import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  dealPhase,
  pickupDay,
  type Deal,
  type DealAction,
  type DealEventKind,
  type DealPhase,
  type DealRole,
  type DealTerms,
  type LateMinutes,
  type PickupAction,
  type PickupEvent,
  type PickupStatusChange,
} from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { ThreadTurn } from "../../shared/threadTurn";
import {
  cardPhase,
  counterPrices,
  lookedAgreedTerms,
  type DealOption,
  type OfferEntry,
} from "../dealOptions";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSaved } from "../hooks/useSaved";
import type { ThreadMoment } from "../pakoMoods";
import type { PickupSend } from "../pickupOptions";
import type { ThreadMessage } from "../pakoThread";
import { PendingMessage } from "../pendingMessage";
import {
  ChatCelebration,
  useCelebrated,
  useChatCelebration,
  type ChatMoment,
} from "./ChatParts";
import DealCard, { type NextBuyer } from "./DealCard";
import { useNamedOfferPrice } from "./namedOfferPrice";
import OfferEditor from "./OfferEditor";

/** A change to the deal as the reading student sees it in the thread. */
export type ThreadEvent = {
  id: string;
  kind: DealEventKind | PickupEvent["kind"];
  terms: DealTerms | null;
  /** The message that carried it; null for news nobody wrote, such as another buyer's deal. */
  messageId: string | null;
  at: string;
  /** Pickup-day news says who made it. */
  actor?: DealRole | null;
  minutes?: LateMinutes;
};

/** A listing status a deal change brought: reserved on agreement, back on sale, or sold. */
export type DealStatusChange = "active" | "reserved" | PickupStatusChange;

export type DealResult = {
  deal: Deal;
  statusChange?: DealStatusChange;
};

/** One thread's deal from either inbox: the shared record and the ways to change it. */
export type DealController = {
  deal: Deal | null;
  loaded: boolean;
  error: string;
  act: (
    action: DealAction,
    text: string,
    messageId?: string,
  ) => Promise<DealResult>;
  /** Pickup-day actions work here; otherwise `pickupError` says why. */
  pickupAvailable: boolean;
  pickupError: string;
  actPickup: (
    action: PickupAction,
    text: string,
    messageId?: string,
  ) => Promise<DealResult>;
};


/** Phases in which the other student's move waits for this one: the card opens for them. */
const NEEDS_YOU: readonly DealPhase[] = [
  "offer_received",
  "partial_received",
  "looks_agreed",
];
/** Wide screens also keep a booked pickup open; phones show it as its strip. */
const OPEN_ON_DESKTOP: readonly DealPhase[] = [
  ...NEEDS_YOU,
  "agreed",
  "completed",
];

const isCardChoices = (value: unknown): value is Record<string, boolean> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((item) => typeof item === "boolean");
/** Enough remembered cards to cover any recent inbox. */
const MAX_CARD_CHOICES = 200;

/** The message a failed deal tap shows, keeping the student's next step clear. */
function dealFailure(failure: unknown, other: string, title: string) {
  if (failure instanceof TypeError)
    return "No connection, so nothing was sent. Try again.";
  if (!(failure instanceof Error)) return "Couldn't send that. Try again.";
  switch ((failure as Error & { key?: string }).key) {
    case "deal_changed":
      return `${other} just changed the deal. Check the new terms; your text is kept.`;
    case "listing_unavailable":
      return `The ${title} was just reserved for someone else.`;
    case "terms_incomplete":
      return "Pick a time and a meeting point first.";
    case "pickup_time_past":
      return "That time has passed. Pick a new one.";
    case "too_early":
      return "You can send this from 3 h before the pickup.";
    case "pickup_window_ended":
      return "Pickup was over an hour ago, so this can't be sent anymore.";
    case "pickup_check_not_due":
      return "I ask whether the pickup happened a day after it. Try again then.";
    case "pickup_unavailable":
      return "This pickup isn't booked anymore. Check the deal card.";
    default:
      return failure.message;
  }
}

/**
 * What Pako says about the deal: what the card does not show, such as how an
 * offer compares with the asking price. Terms he read as agreed replace his
 * reading of the reply, which the card already quotes.
 */
function dealMoment(
  phase: DealPhase,
  deal: Deal | null,
  role: DealRole,
  turn: ThreadTurn | null,
  prices: { asking: number; mine: number | null },
): ThreadMoment | null {
  const proposal = deal?.proposal;
  if (phase === "looks_agreed" && turn)
    return {
      phase: "deal_looks_agreed",
      terms: lookedAgreedTerms(turn, deal),
      role,
      ...prices,
    };
  if (phase === "offer_received" && proposal)
    return { phase: "deal_offer", terms: proposal.terms, role, ...prices };
  if (phase === "partial_received" && proposal)
    return { phase: "deal_partial", terms: proposal.terms, role, ...prices };
  if (phase === "you_confirmed") return { phase: "deal_waiting" };
  if (phase === "cancelled" && deal?.outcome)
    return {
      phase: "deal_cancelled",
      by:
        deal.outcome.kind === "pickup_expired"
          ? "unconfirmed"
          : deal.outcome.kind === "listing_reopened"
            ? "listing"
            : deal.outcome.by === role
            ? "me"
            : "them",
    };
  return null;
}

/** The student's latest price in this thread, for the range a counter lies in. */
function myLatestAmount(
  events: readonly ThreadEvent[],
  messages: readonly ThreadMessage[],
) {
  const mine = new Set(
    messages.filter((message) => message.from === "me").map((m) => m.id),
  );
  const latest = [...events]
    .reverse()
    .find(
      (event) =>
        event.kind === "proposed" &&
        event.messageId !== null &&
        mine.has(event.messageId) &&
        event.terms?.amount != null,
    );
  return latest?.terms?.amount ?? null;
}

/**
 * The deal of the open thread, the same in both inboxes: its phase from the
 * reading student's side, the strip and card under the header, the offer
 * card, and the celebrations. Every change goes through the controller on the
 * student's own tap, with the exact message the card showed.
 */
export function useThreadDeal({
  threadKey,
  controller,
  role,
  otherName,
  listing,
  messages,
  events,
  turn,
  enabled,
  visible,
  homePoint,
  now,
  nextBuyer,
  onStatusChange,
  onWrite,
}: {
  /** The thread and the side it is read from; another key starts over. */
  threadKey: string;
  controller: DealController;
  role: DealRole;
  otherName: string;
  /** The listing the thread is about; without it there is no deal to show. */
  listing: Product | undefined;
  messages: readonly ThreadMessage[];
  events: readonly ThreadEvent[];
  /** Pako's reading of the other student's latest reply, if he has one. */
  turn: ThreadTurn | null;
  /** The student can change the deal here: not blocked, not writing to a sample seller. */
  enabled: boolean;
  /** The thread is on screen. */
  visible: boolean;
  /** The campus meeting point near where the student searches from. */
  homePoint: string | undefined;
  /** The clock pickup day counts down on: the demo clock in a developer's local demo. */
  now: Date;
  /** After a released pickup, the seller's next interested buyer for this listing. */
  nextBuyer: NextBuyer | undefined;
  /** Applies the listing status a deal change brought, in the app's one status path. */
  onStatusChange: (listingId: string, status: DealStatusChange) => Promise<void>;
  /** Puts a message in the composer, for the student to send with a second tap. */
  onWrite: (text: string) => void;
}) {
  const { deal } = controller;
  const namedPrice = useNamedOfferPrice();
  const phase = listing
    ? cardPhase(dealPhase({ deal, listing, role, messages, turn, now }), turn)
    : "talking";
  const day = pickupDay(deal, role, now);
  /** A pickup on its day, or a new time to answer, opens its card on phones too. */
  const pickupNeedsYou = !!day && (day.phase !== "booked" || day.change === "received");
  const phone = useMediaQuery("(max-width: 760px)");
  // A card opens by itself where the student has something to do; whether the
  // student opened or folded it is kept per thread and phase, on desktop
  // across visits. A new phase starts from its own default.
  const [desktopChoices, setDesktopChoices] = useSaved<Record<string, boolean>>(
    "takeover-deal-cards",
    {},
    isCardChoices,
  );
  const [phoneChoices, setPhoneChoices] = useState<Record<string, boolean>>(
    {},
  );
  const cardKey = day
    ? `${threadKey}:${phase}:${day.phase}:${day.change ?? ""}`
    : `${threadKey}:${phase}`;
  const expanded =
    (phone ? phoneChoices : desktopChoices)[cardKey] ??
    (pickupNeedsYou || (phone ? NEEDS_YOU : OPEN_ON_DESKTOP).includes(phase));
  const toggle = () =>
    phone
      ? setPhoneChoices((current) => ({ ...current, [cardKey]: !expanded }))
      : setDesktopChoices((current) =>
          Object.fromEntries(
            Object.entries({ ...current, [cardKey]: !expanded }).slice(
              -MAX_CARD_CHOICES,
            ),
          ),
        );

  const pending = useRef(new PendingMessage());
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ key: string; text: string }>();
  const [confirmedHere, setConfirmedHere] = useState("");
  const [celebration, setCelebration] = useChatCelebration();
  /** A celebration belongs to the thread and side it happened in. */
  const celebrate = (moment: ChatMoment) =>
    setCelebration({ ...moment, threadKey });
  const moment =
    celebration?.threadKey === threadKey ? celebration : undefined;
  const celebrations = useCelebrated();
  const [editing, setEditing] = useState<{
    key: string;
    entry: OfferEntry;
    open: boolean;
  }>();
  const editor = editing?.key === threadKey ? editing : undefined;

  /** What follows a deal change the student made: the listing's status, then a small joy. */
  async function report(
    result: DealResult,
    action: DealAction,
    confirming: boolean,
  ) {
    if (result.statusChange)
      await onStatusChange(result.deal.listingId, result.statusChange);
    if (result.deal.status === "agreed") setConfirmedHere(threadKey);
    else if (action.type === "propose")
      celebrate({ kind: confirming ? "confirmed" : "sent", other: otherName });
  }

  /**
   * Sends one change with its message; a retry of the same text reuses its
   * id, so it never arrives twice. A failure comes back in the student's
   * words.
   */
  async function send(
    text: string,
    change: (messageId: string) => Promise<DealResult>,
    follow: (result: DealResult) => Promise<void>,
  ): Promise<string> {
    if (!listing) throw new Error("This listing is no longer available.");
    const { title } = listing;
    setBusy(true);
    setFailure(undefined);
    const id = pending.current.idFor(threadKey, role, text);
    try {
      const result = await change(id);
      pending.current.acknowledge(id);
      await follow(result);
      return id;
    } catch (error) {
      throw new Error(dealFailure(error, otherName, title));
    } finally {
      setBusy(false);
    }
  }
  const perform = (action: DealAction, text: string, confirming: boolean) =>
    send(
      text,
      (id) => controller.act(action, text, id),
      (result) => report(result, action, confirming),
    );
  /** What follows a pickup tap: the listing's status, and a cheer once the item changed hands. */
  async function reportPickup(result: DealResult, action: PickupAction) {
    if (result.statusChange)
      await onStatusChange(result.deal.listingId, result.statusChange);
    if ((action.type === "picked_up" || action.type === "confirm_pickup_happened") && listing)
      celebrate({ kind: "handed_over", role, title: listing.title });
  }
  /** A failure stays on the card, where the same tap tries again. */
  async function onCard(sending: () => Promise<string>) {
    try {
      await sending();
      return true;
    } catch (error) {
      setFailure({ key: threadKey, text: (error as Error).message });
      return false;
    }
  }
  /** A tap on the card or the offer card. */
  const act = (action: DealAction, text: string, confirming = false) =>
    onCard(() => perform(action, text, confirming));
  /** A pickup tap on the card, with exactly the message it showed. */
  const actPickup = (pickup: PickupSend) =>
    onCard(() =>
      send(
        pickup.message,
        (id) => controller.actPickup(pickup.action, pickup.message, id),
        (result) => reportPickup(result, pickup.action),
      ),
    );

  const openEditor = (entry: OfferEntry) => {
    setFailure(undefined);
    setEditing({ key: threadKey, entry, open: true });
  };
  const choose = (option: DealOption) => {
    if (option.kind === "edit") openEditor(option.entry);
    else if (option.kind === "write") onWrite(option.message);
    else
      void act(option.action, option.message, option.id === "confirm" && option.action.type === "propose");
  };

  const agreedId =
    deal?.status === "agreed" && deal.agreed
      ? `${deal.conversationId}:${role}:agreed:${deal.agreed.at}`
      : null;
  const celebrateAgreement = useEffectEvent((id: string) => {
    if (celebrations.celebrated(id)) return;
    celebrations.remember(id);
    if (listing)
      celebrate({ kind: "agreed", role, other: otherName, title: listing.title });
  });
  useEffect(() => {
    if (agreedId && visible) celebrateAgreement(agreedId);
  }, [agreedId, visible]);

  const ready = Boolean(listing) && controller.loaded && !controller.error && enabled;
  const theirs = deal?.proposal && deal.proposal.by !== role ? deal.proposal.terms : null;
  const mineBefore = myLatestAmount(events, messages);
  const counter =
    listing &&
    editor?.entry.mode === "counter" &&
    theirs?.amount != null &&
    listing.price > 0
      ? counterPrices({
          role,
          theirs: theirs.amount,
          mineBefore,
          asking: listing.price,
        })
      : undefined;
  const cardError = failure?.key === threadKey && !editor ? failure.text : "";
  return {
    phase,
    /** The deal can still take an offer, so terms may travel with a composed message. */
    open: !deal || deal.status === "open",
    card: ready && listing && (
      <DealCard
        phase={phase}
        deal={deal}
        role={role}
        otherName={otherName}
        listing={listing}
        turn={turn}
        expanded={expanded}
        onToggle={toggle}
        busy={busy}
        error={cardError}
        confirmedHere={confirmedHere === threadKey}
        onOption={choose}
        now={now}
        pickup={{
          available: controller.pickupAvailable,
          error: controller.pickupError,
          onSend: actPickup,
        }}
        nextBuyer={role === "seller" ? nextBuyer : undefined}
      />
    ),
    editor: editor && listing && (
      <OfferEditor
        key={`${threadKey}:${editor.entry.mode}`}
        open={editor.open}
        entry={editor.entry}
        listing={listing}
        role={role}
        otherName={otherName}
        homePoint={homePoint}
        namedPrice={
          editor.entry.mode === "offer" ? namedPrice(listing.id) : null
        }
        counter={counter}
        busy={busy}
        error={failure?.key === threadKey ? failure.text : ""}
        onSend={async (terms, message) => {
          const sent = await act(
            { type: "propose", terms },
            message,
            editor.entry.mode === "confirm",
          );
          if (sent) setEditing({ ...editor, open: false });
        }}
        onClose={() => setEditing(undefined)}
      />
    ),
    celebration: moment && (
      <ChatCelebration key={moment.kind} moment={moment} />
    ),
    /** A celebration is on screen; Pako's tray waits until it has passed. */
    celebrating: Boolean(moment),
    /** Celebrates a message that went out without the card, such as Pako's counter in words. */
    celebrate,
    /** Where the deal stands, for Pako's tray. */
    trayMoment:
      ready && listing
        ? dealMoment(phase, deal, role, turn, {
            asking: listing.price,
            mine: mineBefore,
          })
        : null,
    /** Opens the offer card for a first offer, as from the listing page. */
    openOffer: openEditor,
    /** Sends composed text whose terms it states as an offer; a failure is thrown in the student's words. */
    sendTerms: (terms: DealTerms, text: string) =>
      perform({ type: "propose", terms }, text, false),
    /** Sends composed text as a pickup action, such as offering a released item again; a failure is thrown in the student's words. */
    sendPickup: (action: PickupAction, text: string) =>
      send(
        text,
        (id) => controller.actPickup(action, text, id),
        (result) => reportPickup(result, action),
      ),
    /** Follows a deal change the inbox sent itself, such as the first offer of a new account conversation. */
    report: (result: DealResult, action: DealAction) =>
      report(result, action, false),
    busy,
  };
}
