import { AnimatePresence, motion } from "motion/react";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import { useId, useState } from "react";
import { Check, ChevronDown } from "@/components/icons";
import { campusPickupPoints } from "../../shared/campusPickupPoints";
import type { Deal, DealPhase, DealRole, DealTerms } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { ThreadFacts, ThreadTurn } from "../../shared/threadTurn";
import {
  dealOptions,
  lookedAgreedTerms,
  type DealOption,
} from "../dealOptions";
import {
  dealStrip,
  shownTerms,
  termsSummary,
  type StripView,
} from "../dealWords";
import BookedBanner from "./BookedBanner";
import { PakoLabel } from "./ChatParts";
import { DealTermsGrid, DealTile } from "./DealTerms";
import { Button } from "./ui/button";
import "./deal-card.css";

/** A new state settles in place of the last one, like Pako's tray; the old one leaves at once. */
const SWAP = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 34 },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
} as const;
/** The card grows out of the strip and folds back into it. */
const GROW = { type: "spring", stiffness: 360, damping: 34 } as const;
const OPEN = {
  amount: "Open",
  fulfillment: "Open",
  pickupTime: "Open",
  pickupPoint: "Open",
};

type Listing = Pick<Product, "title" | "image" | "price" | "status"> & {
  pickupPoint?: Product["pickupPoint"];
};
type Seat = { name: string; done: boolean };

/** Whose confirmation the deal has: the side that offered, then the side that can confirm. */
function seats(phase: DealPhase, otherName: string): [Seat, Seat] | null {
  const you = (done: boolean) => ({ name: "You", done });
  const them = (done: boolean) => ({ name: otherName, done });
  if (phase === "offer_received" || phase === "partial_received")
    return [them(true), you(false)];
  if (
    phase === "you_confirmed" ||
    phase === "waiting" ||
    phase === "no_answer"
  )
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

/** The other student's own words under each term Pako read as agreed. */
function quotesOf(facts: ThreadFacts) {
  const quote = (fact?: { quote: string }) =>
    fact && <q className="deal-card-quote">{fact.quote}</q>;
  return {
    amount: quote(facts.amount),
    fulfillment: quote(facts.fulfillment),
    pickupTime: quote(facts.pickupTime),
    pickupPoint: quote(facts.pickupPoint),
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

/** A known meeting point's address and a map under its tile, once the pickup is booked. */
function placeNote(name: string, listing: Listing) {
  const point = [listing.pickupPoint, ...campusPickupPoints].find(
    (candidate) => candidate?.name === name,
  );
  if (!point) return undefined;
  return (
    <>
      {point.address} ·{" "}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name} ${point.address}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Map ↗
      </a>
    </>
  );
}

/** What the tiles say under their values: the words Pako read as agreed, or where to meet. */
function termNotes(
  phase: DealPhase,
  terms: DealTerms,
  turn: ThreadTurn | null,
  listing: Listing,
) {
  if (phase === "looks_agreed" && turn) return quotesOf(turn.facts);
  if ((phase === "agreed" || phase === "completed") && terms.pickupPoint)
    return { pickupPoint: placeNote(terms.pickupPoint, listing) };
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
  busy,
  onConfirm,
  onBack,
}: {
  option: Extract<DealOption, { kind: "act" }>;
  busy: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div className="deal-card-confirm" {...SWAP}>
      <p className="deal-card-question">{option.confirm}</p>
      <p className="deal-card-sends">
        Sends: <q>{option.message}</q>
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
          Back
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
}: Omit<Props, "expanded" | "onToggle">) {
  const [asking, setAsking] = useState<Extract<DealOption, { kind: "act" }>>();
  const options = dealOptions({
    phase,
    deal,
    listing,
    role,
    otherName,
    turn,
    now: new Date(),
  });
  const terms = cardTerms(phase, deal, turn);
  const pair = seats(phase, otherName);
  const choose = (option: DealOption) =>
    option.kind === "act" && option.confirm
      ? setAsking(option)
      : onOption(option);
  const { primary } = options;
  const booked = phase === "agreed" || phase === "completed";
  return (
    <div className="deal-card-body">
      {booked && deal?.agreed && (
        <BookedBanner
          takeFocus={confirmedHere}
          detail={
            role === "buyer" ? "Reserved for you" : `Reserved for ${otherName}`
          }
        >
          {phase === "completed"
            ? role === "buyer"
              ? "Picked up"
              : "Sold"
            : deal.agreed.terms.fulfillment === "shipping"
              ? "Deal agreed"
              : "Pickup booked"}
        </BookedBanner>
      )}
      {phase === "looks_agreed" && (
        <PakoLabel>Looks agreed · Confirm so {otherName} can confirm too.</PakoLabel>
      )}
      {pair && <Seats pair={pair} />}
      {terms && (
        <DealTermsGrid
          terms={shownTerms(terms)}
          unknown={OPEN}
          amountLabel={booked ? "Price" : "Offer"}
          notes={termNotes(phase, terms, turn, listing)}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {asking ? (
          <ConfirmStep
            key="confirm"
            option={asking}
            busy={busy}
            onConfirm={() => onOption(asking)}
            onBack={() => setAsking(undefined)}
          />
        ) : (
          <motion.div key="actions" className="deal-card-choices" {...SWAP}>
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
                Sends: <q>{primary.message}</q>
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

/** What the card tells a screen reader when the deal changes. */
function announcement(view: StripView, terms: DealTerms | null) {
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
};

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
    phase === "looks_agreed" && turn ? lookedAgreedTerms(turn, deal) : undefined;
  const view = dealStrip({
    phase,
    deal,
    role,
    other: otherName,
    listing,
    agreedTerms,
  });
  if (!view) return null;
  const spoken = (
    <p className="sr-only" role="status">
      {announcement(view, cardTerms(phase, deal, turn))}
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
      now: new Date(),
    });
    return (
      <motion.section
        layout
        className="thread-deal"
        data-tone={view.tone}
        aria-label={`Deal for ${listing.title}`}
        transition={GROW}
      >
        <div className="deal-strip">
          <DealTile image={listing.image} />
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
        <DealTile image={listing.image} />
        <StripWords view={view} />
        {view.status && <span className="deal-strip-status">{view.status}</span>}
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
                <motion.div key={phase} {...SWAP}>
                  <CardBody {...props} />
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
