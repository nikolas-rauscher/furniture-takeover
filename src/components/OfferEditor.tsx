import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Banknote, Clock, MapPin, Minus, Plus } from "@/components/icons";
import { campusPickupPoints } from "../../shared/campusPickupPoints";
import { missingTerms, type DealRole, type DealTerms } from "../../shared/deal";
import {
  confirmAgreementMessage,
  counterMessage,
  offerMessage,
} from "../../shared/dealMessages";
import type { Product } from "../../shared/marketplace";
import {
  formatPickup,
  pickupSlots,
  resolvePickupAt,
} from "../../shared/pickupTime";
import {
  meetingPointChoices,
  priceChoices,
  priceStep,
  SEND_FOR_CONFIRMATION,
  type CounterRange,
  type OfferEntry,
  type OfferMode,
} from "../dealOptions";
import { shortPlace, slotLabel, termPrice, unstatedTerm } from "../dealWords";
import { useNow } from "../hooks/useNow";
import {
  futureSlot,
  proposalLine,
  proposeOffer,
  type Slot,
} from "../offerProposal";
import Modal from "./Modal";
import Pako from "./onboarding/Pako";
import { Button } from "./ui/button";
import "./deal-card.css";

type Panel = "price" | "time" | "place";

const MAX_PRICE = 1_000_000;

/** A new value or panel settles in place; the old one leaves at once. */
const SETTLE = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 34 },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
} as const;
const GROW = { type: "spring", stiffness: 360, damping: 34 } as const;

const TITLES: Record<OfferMode, string> = {
  offer: "Make an offer",
  counter: "Counter-offer",
  complete: "Complete the offer",
  change: "Change your offer",
  confirm: "Check the terms",
};

const SEND_LABELS: Record<OfferMode, string> = {
  offer: "Send offer",
  counter: "Send counter-offer",
  complete: "Send offer",
  change: "Send new offer",
  confirm: SEND_FOR_CONFIRMATION,
};

/** The message Pako writes for the chosen terms, in the words of the card's purpose. */
function draftFor(mode: OfferMode, title: string, terms: DealTerms) {
  if (mode === "offer") return offerMessage(title, terms);
  if (mode === "confirm") return confirmAgreementMessage(terms);
  return counterMessage(terms);
}

/** "2026-11-20T18:00" from a date-and-time field, read as Zurich time like every pickup. */
function typedSlot(value: string, now: Date): Slot | null {
  const pickupAt = value ? resolvePickupAt(value.replace("T", " "), now) : null;
  return pickupAt ? { pickupAt, pickupTime: formatPickup(pickupAt) } : null;
}

function pickupTimePassed(terms: DealTerms, now: number) {
  return terms.pickupAt !== null && Date.parse(terms.pickupAt) <= now;
}

/** Why Send waits, said beside it; null once the offer can go out. */
function sendBlocker(terms: DealTerms, unstated: string | null, now: Date) {
  if (pickupTimePassed(terms, now.getTime()))
    return "Choose a pickup time in the future.";
  const missing = missingTerms(terms);
  const time = missing.includes("pickupTime");
  const place = missing.includes("pickupPoint");
  if (time && place) return "Choose a pickup time and a meeting point to send.";
  if (time) return "Choose a pickup time to send.";
  if (place) return "Choose a meeting point to send.";
  return unstated === null
    ? null
    : `Add ${unstated} back to the message to send it.`;
}

/** A tap target among a few choices; the chosen one turns blue. */
export function TapChip({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      className="tap-chip"
      aria-pressed={selected}
      onClick={onSelect}
    >
      {children}
    </Button>
  );
}

/** Pako beside his proposal; the line settles anew when the student changes a term. */
function PakoProposal({ line }: { line: string }) {
  return (
    <div className="offer-pako">
      <Pako mood="happy" size={48} className="offer-pako-figure" />
      <div className="offer-pako-bubble">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={line} aria-live="polite" {...SETTLE}>
            {line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** One term as a tactile tile; a tap opens its chips below. */
function TermTile({
  icon,
  label,
  value,
  placeholder,
  open,
  panelId,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
  placeholder: string;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      className="button offer-tile"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      data-unset={value === null || undefined}
      onClick={onToggle}
    >
      <span className="offer-tile-label">
        {icon}
        {label}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value ?? placeholder}
          className="offer-tile-value"
          {...SETTLE}
        >
          {value ?? placeholder}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

function PricePanel({
  asking,
  choices,
  amount,
  onAmount,
}: {
  asking: number;
  choices: number[];
  amount: number;
  onAmount: (amount: number) => void;
}) {
  const step = priceStep(asking);
  /** What the student is typing in the price field, while they type. */
  const [typed, setTyped] = useState<string | null>(null);
  const set = (value: number) =>
    onAmount(Math.min(MAX_PRICE, Math.max(1, Math.round(value))));
  return (
    <>
      {choices.length > 0 && (
        <div className="offer-chips" role="group" aria-label="Suggested prices">
          {choices.map((price) => (
            <TapChip
              key={price}
              selected={amount === price}
              onSelect={() => set(price)}
            >
              {termPrice(price)}
            </TapChip>
          ))}
        </div>
      )}
      <div className="offer-stepper">
        <Button
          type="button"
          className="icon-button offer-step"
          aria-label={`CHF ${step} less`}
          disabled={amount <= step}
          onClick={() => set(amount - step)}
        >
          <Minus size={18} aria-hidden="true" />
        </Button>
        <label className="offer-price-field">
          <span>CHF</span>
          <input
            inputMode="numeric"
            aria-label="Your price in francs"
            value={typed ?? String(amount)}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "");
              setTyped(digits);
              if (digits) set(Number(digits));
            }}
            onBlur={() => setTyped(null)}
          />
        </label>
        <Button
          type="button"
          className="icon-button offer-step"
          aria-label={`CHF ${step} more`}
          onClick={() => set(amount + step)}
        >
          <Plus size={18} aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}

/** Pickup times to tap, and any other day and time to type. */
export function TimePanel({
  slots,
  slot,
  now,
  onSlot,
}: {
  slots: Slot[];
  slot: Slot | null;
  now: Date;
  onSlot: (slot: Slot | null) => void;
}) {
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const custom = typing && typed !== "";
  const typedTime = custom ? typedSlot(typed, now) : null;
  return (
    <>
      <div className="offer-chips" role="group" aria-label="Pickup times">
        {slots.map((option) => (
          <TapChip
            key={option.pickupAt}
            selected={!typing && slot?.pickupAt === option.pickupAt}
            onSelect={() => {
              setTyping(false);
              onSlot(option);
            }}
          >
            {slotLabel(option.pickupAt, now)}
          </TapChip>
        ))}
        <TapChip
          selected={typing}
          onSelect={() => {
            setTyping(true);
            onSlot(typedTime);
          }}
        >
          Choose another time
        </TapChip>
      </div>
      {typing && (
        <label className="offer-field">
          <span>Day and time</span>
          <input
            type="datetime-local"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              onSlot(typedSlot(event.target.value, now));
            }}
          />
          {custom && !typedTime && (
            <small className="offer-field-hint" role="alert">
              Choose a time 30 minutes to 2 months from now.
            </small>
          )}
        </label>
      )}
    </>
  );
}

function PlacePanel({
  suggested,
  place,
  onPlace,
}: {
  suggested: string[];
  place: string | null;
  onPlace: (place: string | null) => void;
}) {
  // Without a meeting point to suggest, the campus points show straight away.
  const [more, setMore] = useState(suggested.length === 0);
  const [typed, setTyped] = useState("");
  const others = campusPickupPoints
    .map((point) => point.name)
    .filter((name) => !suggested.includes(name));
  const chip = (name: string) => (
    <TapChip
      key={name}
      selected={place === name}
      onSelect={() => {
        setTyped("");
        onPlace(name);
      }}
    >
      {name}
    </TapChip>
  );
  return (
    <>
      <div className="offer-chips" role="group" aria-label="Meeting points">
        {suggested.map(chip)}
        {!more && (
          <TapChip selected={false} onSelect={() => setMore(true)}>
            More meeting points
          </TapChip>
        )}
      </div>
      {more && (
        <>
          <div
            className="offer-chips"
            role="group"
            aria-label="Campus meeting points"
          >
            {others.map(chip)}
          </div>
          <label className="offer-field">
            <span>Or another public place</span>
            <input
              value={typed}
              maxLength={240}
              placeholder="Pick a public place"
              onChange={(event) => {
                setTyped(event.target.value);
                onPlace(event.target.value.trim() || null);
              }}
            />
          </label>
        </>
      )}
    </>
  );
}

/** The message as the other student will read it; editing it is one tap away. */
function MessagePreview({
  message,
  otherName,
  edited,
  onChange,
  onRestore,
}: {
  message: string;
  otherName: string;
  edited: boolean;
  onChange: (text: string) => void;
  onRestore: () => void;
}) {
  const headingId = useId();
  const [editing, setEditing] = useState(false);
  return (
    <section className="offer-message-preview" aria-labelledby={headingId}>
      <div className="offer-message-head">
        <h3 id={headingId}>Message to {otherName}</h3>
        {editing ? (
          edited && (
            <Button
              type="button"
              className="button quiet small"
              onClick={() => {
                onRestore();
                setEditing(false);
              }}
            >
              Restore Pako's draft
            </Button>
          )
        ) : (
          <Button
            type="button"
            className="button quiet small"
            onClick={() => setEditing(true)}
          >
            Edit message
          </Button>
        )}
      </div>
      {editing ? (
        <textarea
          className="offer-message"
          aria-label={`Message to ${otherName}`}
          maxLength={4000}
          rows={3}
          autoFocus
          value={message}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <p className="offer-message-bubble">{message}</p>
      )}
    </section>
  );
}

/**
 * The offer card: Pako's complete proposal, said in his words with the reason
 * for each term, the terms as tiles that open their chips on a tap, and the
 * message he wrote for them. Nothing is sent until the student taps Send;
 * sending proposes the terms, and the other student still confirms. A sheet
 * on phones, a card on desktop.
 */
export default function OfferEditor({
  open,
  entry,
  listing,
  role,
  otherName,
  homePoint,
  namedPrice,
  counter,
  busy,
  error,
  onSend,
  onClose,
}: {
  /** False closes the card with its animation, such as once the offer went out. */
  open: boolean;
  entry: OfferEntry;
  listing: Pick<Product, "title" | "price" | "available" | "pickupPoint">;
  role: DealRole;
  otherName: string;
  /** The campus meeting point near where the student searches from. */
  homePoint: string | undefined;
  /** A price the student named to Pako in the search chat. */
  namedPrice: number | null;
  /** Both sides' latest prices, when countering. */
  counter?: CounterRange;
  busy: boolean;
  error: string;
  onSend: (terms: DealTerms, message: string) => void;
  onClose: () => void;
}) {
  const { mode } = entry;
  const panelId = useId();
  const now = useNow();
  const free = listing.price === 0;
  const fulfillment = entry.terms.fulfillment ?? "pickup";
  const pickup = fulfillment === "pickup";
  const prices = priceChoices({ asking: listing.price, counter });
  const slots = useMemo(() => {
    const named = futureSlot(entry.terms, now);
    const offered = pickupSlots(listing.available, now);
    return named
      ? [named, ...offered.filter((slot) => slot.pickupAt !== named.pickupAt)]
      : offered;
  }, [entry.terms, listing.available, now]);
  const [proposal] = useState(() =>
    proposeOffer({
      mode,
      terms: entry.terms,
      asking: listing.price,
      counter,
      counterChoices: prices,
      namedPrice,
      slots,
      listingPoint: listing.pickupPoint?.name,
      homePoint,
      now,
    }),
  );
  const [amount, setAmount] = useState(proposal.amount);
  const [slot, setSlot] = useState(proposal.slot);
  const [place, setPlace] = useState(proposal.place);
  const [panel, setPanel] = useState<Panel | null>(
    pickup && !proposal.slot ? "time" : null,
  );
  const togglePanel = (next: Panel) =>
    setPanel((current) => (current === next ? null : next));
  const line = proposalLine(
    proposal,
    {
      price: amount !== proposal.amount,
      time: slot?.pickupAt !== proposal.slot?.pickupAt,
      place: place !== proposal.place,
    },
    {
      mode,
      role,
      otherName,
      available: listing.available,
      shipping: !pickup,
      now,
    },
  );
  const terms: DealTerms = {
    amount: free ? 0 : amount,
    fulfillment,
    pickupAt: pickup ? (slot?.pickupAt ?? null) : null,
    pickupTime: pickup ? (slot?.pickupTime ?? null) : null,
    pickupPoint: pickup ? place : null,
  };
  const [written, setWritten] = useState<string | null>(null);
  const message = written ?? draftFor(mode, listing.title, terms);
  const blocker = sendBlocker(terms, unstatedTerm(message, terms), now);
  const description = `${listing.title} · ${free ? "Free" : `Asking price ${termPrice(listing.price)}`}`;
  return (
    <Modal
      sheet
      open={open}
      title={free && mode === "offer" ? "Suggest pickup" : TITLES[mode]}
      description={description}
      onClose={onClose}
    >
      <form
        className="offer-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          if (pickupTimePassed(terms, Date.now())) {
            setSlot(null);
            setPanel("time");
            return;
          }
          if (blocker === null) onSend(terms, message.trim());
        }}
      >
        <PakoProposal line={line} />
        <div className="offer-terms">
          <div className="offer-tiles" role="group" aria-label="Terms">
            {!free && (
              <TermTile
                icon={<Banknote size={14} aria-hidden="true" />}
                label="Price"
                value={termPrice(amount)}
                placeholder="Add price"
                open={panel === "price"}
                panelId={panelId}
                onToggle={() => togglePanel("price")}
              />
            )}
            {pickup && (
              <>
                <TermTile
                  icon={<Clock size={14} aria-hidden="true" />}
                  label="Pickup time"
                  value={slot && slotLabel(slot.pickupAt, now)}
                  placeholder="Choose a time"
                  open={panel === "time"}
                  panelId={panelId}
                  onToggle={() => togglePanel("time")}
                />
                <TermTile
                  icon={<MapPin size={14} aria-hidden="true" />}
                  label="Meeting point"
                  value={place && shortPlace(place)}
                  placeholder="Choose a place"
                  open={panel === "place"}
                  panelId={panelId}
                  onToggle={() => togglePanel("place")}
                />
              </>
            )}
          </div>
          <AutoHeight transition={GROW}>
            <AnimatePresence mode="wait" initial={false}>
              {panel && (
                <motion.div
                  key={panel}
                  id={panelId}
                  className="offer-panel"
                  {...SETTLE}
                >
                  {panel === "price" && (
                    <PricePanel
                      asking={listing.price}
                      choices={prices}
                      amount={amount}
                      onAmount={setAmount}
                    />
                  )}
                  {panel === "time" && (
                    <TimePanel
                      slots={slots}
                      slot={slot}
                      now={now}
                      onSlot={setSlot}
                    />
                  )}
                  {panel === "place" && (
                    <PlacePanel
                      suggested={meetingPointChoices(
                        entry.terms.pickupPoint,
                        listing.pickupPoint?.name,
                        homePoint,
                      )}
                      place={place}
                      onPlace={setPlace}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </AutoHeight>
        </div>
        <MessagePreview
          message={message}
          otherName={otherName}
          edited={written !== null}
          onChange={setWritten}
          onRestore={() => setWritten(null)}
        />
        <div className="offer-send">
          {blocker && (
            <p className="offer-blocker" role="status">
              {blocker}
            </p>
          )}
          <Button
            type="submit"
            animateIcon
            className="button primary large full"
            disabled={blocker !== null || busy}
          >
            {busy ? "Sending…" : SEND_LABELS[mode]}
          </Button>
          {error && (
            <p className="chat-error" role="alert">
              {error}
            </p>
          )}
          <small className="offer-note">
            This sends your terms. {otherName} still needs to confirm.
          </small>
        </div>
      </form>
    </Modal>
  );
}
