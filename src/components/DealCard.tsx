import { cardImageFor } from "../../shared/listingPhotos";
import { AnimatePresence, motion } from "motion/react";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import { useId, useState } from "react";
import { Check, ChevronDown } from "@/components/icons";
import {
  pickupDay,
  type Deal,
  type DealPhase,
  type DealRole,
  type DealTerms,
} from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { ThreadFacts, ThreadTurn } from "../../shared/threadTurn";
import {
  dealOptions,
  lookedAgreedTerms,
  type DealOption,
} from "../dealOptions";
import {
  completedWords,
  dealStrip,
  shownTerms,
  termPrice,
  termsSummary,
  type ShownTerms,
  type StripView,
} from "../dealWords";
import BookedBanner from "./BookedBanner";
import { PakoLabel } from "./ChatParts";
import { DealTermsGrid, DealTile, PlaceNote } from "./DealTerms";
import PickupCard, { type PickupLink } from "./PickupCard";
import { Button } from "./ui/button";
import { SETTLE_IN_PLACE } from "../uiMotion";
import "./deal-card.css";

/** The seller's next interested buyer once a pickup was released. */
export type NextBuyer = { name: string; onOffer: () => void };

/** The card grows out of the strip and folds back into it. */
const GROW = { type: "spring", stiffness: 360, damping: 34 } as const;
const NOT_SET = {
  amount: "Not set",
  fulfillment: "Not set",
  pickupTime: "Not set",
  pickupPoint: "Not set",
};

type Listing = Pick<
  Product,
  "title" | "image" | "price" | "status" | "available"
> & {
  pickupPoint?: Product["pickupPoint"];
  pickupBy?: string;
};
type Seat = { name: string; done: boolean };

/** Whose confirmation the deal has: the side that offered, then the side that can confirm. */
function seats(phase: DealPhase, otherName: string): [Seat, Seat] | null {
  const you = (done: boolean) => ({ name: "You", done });
  const them = (done: boolean) => ({ name: otherName, done });
  if (phase === "offer_received" || phase === "partial_received")
    return [them(true), you(false)];
  if (phase === "you_confirmed" || phase === "waiting" || phase === "no_answer")
    return [you(true), them(false)];
  return null;
}

function Seats({ pair }: { pair: [Seat, Seat] }) {
  return (
    <p className="deal-seats">
      {pair.map((seat) => (
        <span
          key={seat.name}
          className="deal-seat"
          data-done={seat.done || undefined}
        >
          {seat.done ? (
            <Check size={14} strokeWidth={3} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">…</span>
          )}
          {seat.name}
          <span className="sr-only">
            {seat.done ? " confirmed" : " hasn't confirmed yet"}
          </span>
        </span>
      ))}
    </p>
  );
}

/** The students' own words under each term Pako read as agreed, where they say more than the tile. */
function quotesOf(facts: ThreadFacts, shown: ShownTerms) {
  const quote = (fact: { quote: string } | undefined, value: string | null) =>
    fact &&
    fact.quote.toLowerCase() !== value?.toLowerCase() && (
      <q className="deal-card-quote">{fact.quote}</q>
    );
  return {
    amount: quote(
      facts.amount,
      shown.amount === null ? null : termPrice(shown.amount),
    ),
    fulfillment: quote(facts.fulfillment, shown.fulfillment),
    pickupTime: quote(facts.pickupTime, shown.pickupTime),
    pickupPoint: quote(facts.pickupPoint, shown.pickupPoint),
  };
}

/** The terms the card shows: the offer on the table, what looks agreed, or what was agreed. */
function cardTerms(
  phase: DealPhase,
  deal: Deal | null,
  turn: ThreadTurn | null,
): DealTerms | null {
  if (phase === "looks_agreed" && turn) return lookedAgreedTerms(turn, deal);
  return deal?.proposal?.terms ?? deal?.agreed?.terms ?? null;
}

function StripWords({ view }: { view: StripView }) {
  return (
    <span className="deal-strip-words">
      <strong>{view.lead}</strong>
      {view.detail && (
        <span className="deal-strip-detail">
          <span aria-hidden="true"> · </span>
          {view.detail}
        </span>
      )}
    </span>
  );
}

/**
 * Open on pickup day, the pickup card's head carries the countdown or Pako's
 * follow-up question, so the line above it only names the moment.
 */
function openStripView(view: StripView, props: Props): StripView {
  const day =
    props.phase === "agreed"
      ? pickupDay(props.deal, props.role, props.now)
      : null;
  if (day?.pickupCheck)
    return { ...view, lead: "Pickup follow-up", detail: "" };
  const countsDown = day && day.phase !== "booked" && day.change !== "received";
  return countsDown ? { ...view, lead: "Pickup day", detail: "" } : view;
}

/** What the tiles say under their values: the words Pako read as agreed, or where to meet. */
function termNotes(
  phase: DealPhase,
  terms: DealTerms,
  turn: ThreadTurn | null,
  listing: Listing,
) {
  if (phase === "looks_agreed" && turn)
    return quotesOf(turn.facts, shownTerms(terms));
  if ((phase === "agreed" || phase === "completed") && terms.pickupPoint)
    return {
      pickupPoint: (
        <PlaceNote
          name={terms.pickupPoint}
          listingPoint={listing.pickupPoint}
        />
      ),
    };
  return {};
}

function OptionButton({
  option,
  busy,
  onChoose,
}: {
  option: DealOption;
  busy: boolean;
  onChoose: (option: DealOption) => void;
}) {
  return (
    <Button
      type="button"
      className="button quiet"
      disabled={busy}
      onClick={() => onChoose(option)}
    >
      {option.label}
    </Button>
  );
}

/** What a tap that ends something sends, asked once before it goes out. */
function ConfirmStep({
  option,
  otherName,
  busy,
  onConfirm,
  onBack,
}: {
  option: Extract<DealOption, { kind: "act" }>;
  otherName: string;
  busy: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div className="deal-card-confirm" {...SETTLE_IN_PLACE}>
      <p className="deal-card-question">{option.confirm}</p>
      <p className="deal-card-sends">
        Message to {otherName}: <q>{option.message}</q>
      </p>
      <div className="deal-card-actions">
        <Button
          type="button"
          className="button danger small"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Sending…" : option.label}
        </Button>
        <Button
          type="button"
          className="button quiet"
          disabled={busy}
          onClick={onBack}
        >
          {option.id === "cancel" ? "Keep deal" : "Keep offer"}
        </Button>
      </div>
    </motion.div>
  );
}

function CardBody({
  phase,
  deal,
  role,
  otherName,
  listing,
  turn,
  busy,
  error,
  confirmedHere,
  onOption,
  now,
}: Omit<Props, "expanded" | "onToggle" | "pickup" | "nextBuyer">) {
  const [asking, setAsking] = useState<Extract<DealOption, { kind: "act" }>>();
  const options = dealOptions({
    phase,
    deal,
    listing,
    role,
    otherName,
    turn,
    now,
  });
  const terms = cardTerms(phase, deal, turn);
  const pair = seats(phase, otherName);
  const choose = (option: DealOption) =>
    option.kind === "act" && option.confirm
      ? setAsking(option)
      : onOption(option);
  const { primary } = options;
  const booked = phase === "agreed" || phase === "completed";
  const reservedDetail =
    role === "buyer" ? "Reserved for you" : `Reserved for ${otherName}`;
  return (
    <div className="deal-card-body">
      {booked && deal?.agreed && (
        <BookedBanner
          takeFocus={confirmedHere}
          detail={phase === "completed" ? undefined : reservedDetail}
        >
          {phase === "completed"
            ? completedWords(role, deal.agreed.terms)
            : deal.agreed.terms.fulfillment === "shipping"
              ? "Deal agreed"
              : "Pickup booked"}
        </BookedBanner>
      )}
      {phase === "looks_agreed" && (
        <PakoLabel>
          These are the terms I found in your messages. {otherName} still needs
          to confirm.
        </PakoLabel>
      )}
      {pair && <Seats pair={pair} />}
      {terms && (
        <DealTermsGrid
          terms={shownTerms(terms)}
          unknown={NOT_SET}
          amountLabel={booked ? "Price" : "Offer"}
          notes={termNotes(phase, terms, turn, listing)}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {asking ? (
          <ConfirmStep
            key="confirm"
            option={asking}
            otherName={otherName}
            busy={busy}
            onConfirm={() => onOption(asking)}
            onBack={() => setAsking(undefined)}
          />
        ) : (
          <motion.div
            key="actions"
            className="deal-card-choices"
            {...SETTLE_IN_PLACE}
          >
            {primary && (
              <Button
                type="button"
                animateIcon
                className="button primary"
                disabled={busy}
                onClick={() => choose(primary)}
              >
                {busy ? "Sending…" : primary.label}
              </Button>
            )}
            {primary?.kind === "act" && (
              <p className="deal-card-sends">
                Message to {otherName}: <q>{primary.message}</q>
              </p>
            )}
            {options.secondary.length > 0 && (
              <div className="deal-card-actions">
                {options.secondary.map((option) => (
                  <OptionButton
                    key={option.id}
                    option={option}
                    busy={busy}
                    onChoose={choose}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** What the card tells a screen reader when the deal changes; a countdown's ticking stays quiet. */
function announcement(
  deal: Deal | null,
  view: StripView,
  terms: DealTerms | null,
) {
  const agreed = deal?.status === "agreed" && deal.agreed;
  if (agreed && !deal.proposal)
    return `Deal agreed. ${termsSummary(agreed.terms, "full")}.`;
  if (view.tone === "booked" && terms)
    return `Deal agreed. ${termsSummary(terms, "full")}.`;
  return `${view.lead}${view.detail ? `: ${view.detail}` : ""}.`;
}

type Props = {
  /** The phase the card shows, from the reading student's side. */
  phase: DealPhase;
  deal: Deal | null;
  role: DealRole;
  otherName: string;
  listing: Listing;
  /** Pako's reading of the other student's latest message, if he has one. */
  turn: ThreadTurn | null;
  expanded: boolean;
  onToggle: () => void;
  busy: boolean;
  error: string;
  /** The student confirmed here a moment ago, so the booked banner takes focus. */
  confirmedHere: boolean;
  onOption: (option: DealOption) => void;
  /** The clock the pickup counts down on. */
  now: Date;
  /** How pickup-day taps reach the deal, or why they can't. */
  pickup: PickupLink;
  /** After a released pickup, the seller's next interested buyer. */
  nextBuyer: NextBuyer | undefined;
};

/** The booked card, or on pickup day the pickup card. */
function ExpandedBody(props: Omit<Props, "expanded" | "onToggle">) {
  const { phase, deal, role, otherName, listing, busy, error, now, pickup } =
    props;
  const day = phase === "agreed" ? pickupDay(deal, role, now) : null;
  return day && deal ? (
    <PickupCard
      day={day}
      deal={deal}
      role={role}
      otherName={otherName}
      listing={listing}
      busy={busy}
      error={error}
      now={now}
      pickup={pickup}
    />
  ) : (
    <CardBody {...props} />
  );
}

/**
 * The deal in a thread: one calm line under the header that grows into the
 * card with the terms as tiles, who confirmed, one main action and quieter
 * ones. A state change settles in place instead of popping. Nothing is sent
 * until the student taps, and each tap that sends says what it sends.
 */
export default function DealCard(props: Props) {
  const { phase, deal, role, otherName, listing, turn, expanded, onToggle } =
    props;
  const bodyId = useId();
  const agreedTerms =
    phase === "looks_agreed" && turn
      ? lookedAgreedTerms(turn, deal)
      : undefined;
  const view = dealStrip({
    phase,
    deal,
    role,
    other: otherName,
    listing,
    agreedTerms,
    now: props.now,
  });
  if (!view) return null;
  const spoken = (
    <p className="sr-only" role="status">
      {announcement(deal, view, cardTerms(phase, deal, turn))}
    </p>
  );
  if (view.tone === "start" || view.tone === "closed") {
    const { primary } = dealOptions({
      phase,
      deal,
      listing,
      role,
      otherName,
      turn,
      now: props.now,
    });
    const { nextBuyer } = props;
    return (
      <motion.section
        layout
        className="thread-deal"
        data-tone={view.tone}
        aria-label={`Deal for ${listing.title}`}
        transition={GROW}
      >
        <div className="deal-strip">
          <DealTile image={cardImageFor(listing)} />
          <StripWords view={view} />
          {primary && (
            <Button
              type="button"
              className="button secondary small"
              disabled={props.busy}
              onClick={() => props.onOption(primary)}
            >
              {primary.label}
            </Button>
          )}
        </div>
        {phase === "cancelled" && nextBuyer && (
          <div className="deal-next-buyer">
            <p>
              {nextBuyer.name} also asked about the {listing.title}. The message
              waits for your Send.
            </p>
            <Button
              type="button"
              animateIcon
              className="button primary small"
              disabled={props.busy}
              onClick={nextBuyer.onOffer}
            >
              Offer it to {nextBuyer.name}
            </Button>
          </div>
        )}
        {spoken}
      </motion.section>
    );
  }
  return (
    <motion.section
      layout
      className="thread-deal"
      data-tone={view.tone}
      data-expanded={expanded || undefined}
      aria-label={`Deal for ${listing.title}`}
      transition={GROW}
    >
      <Button
        type="button"
        className="deal-strip"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <DealTile image={cardImageFor(listing)} />
        <StripWords view={expanded ? openStripView(view, props) : view} />
        {view.status && (
          <span className="deal-strip-status">{view.status}</span>
        )}
        <ChevronDown
          size={18}
          className="deal-strip-chevron"
          aria-hidden="true"
        />
      </Button>
      <AutoHeight transition={GROW}>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id={bodyId}
              key="body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={phase} {...SETTLE_IN_PLACE}>
                  <ExpandedBody {...props} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </AutoHeight>
      {spoken}
    </motion.section>
  );
}
