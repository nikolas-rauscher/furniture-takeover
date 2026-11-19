import { useId, useMemo, useState, type ReactNode } from "react";
import { Minus, Plus } from "@/components/icons";
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
  confirmLabel,
  meetingPointChoices,
  priceChoices,
  priceStep,
  type OfferEntry,
  type OfferMode,
} from "../dealOptions";
import { slotLabel, termPrice, unstatedTerm } from "../dealWords";
import { PakoLabel } from "./ChatParts";
import Modal from "./Modal";
import { Button } from "./ui/button";
import "./deal-card.css";

type Slot = { pickupAt: string; pickupTime: string };

const MAX_PRICE = 1_000_000;

const TITLES: Record<OfferMode, string> = {
  offer: "Make an offer",
  counter: "Counter-offer",
  complete: "Choose time & place",
  change: "Change your offer",
  confirm: "Pick a time to confirm",
};

/** The message Pako writes for the chosen terms, in the words of the card's purpose. */
function draftFor(mode: OfferMode, title: string, terms: DealTerms) {
  if (mode === "offer") return offerMessage(title, terms);
  if (mode === "confirm") return confirmAgreementMessage(terms);
  return counterMessage(terms);
}

function sendLabel(mode: OfferMode, role: DealRole, terms: DealTerms) {
  if (mode === "confirm") return confirmLabel(role, terms);
  return mode === "counter" ? "Send counter" : "Send offer";
}

/** A future pickup the card can start from, such as the time the other student named. */
const futureSlot = (terms: DealTerms, now: Date): Slot | null =>
  terms.pickupAt && Date.parse(terms.pickupAt) > now.getTime()
    ? { pickupAt: terms.pickupAt, pickupTime: formatPickup(terms.pickupAt) }
    : null;

/** "2026-11-20T18:00" from a date-and-time field, read as Zurich time like every pickup. */
function typedSlot(value: string, now: Date): Slot | null {
  const pickupAt = value ? resolvePickupAt(value.replace("T", " "), now) : null;
  return pickupAt ? { pickupAt, pickupTime: formatPickup(pickupAt) } : null;
}

/** A tap target among a few choices; the chosen one turns blue. */
function TapChip({
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

function OfferRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="offer-row" aria-labelledby={id}>
      <h3 id={id}>{label}</h3>
      {children}
    </section>
  );
}

function PriceRow({
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
    <OfferRow label="Price">
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
    </OfferRow>
  );
}

function TimeRow({
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
    <OfferRow label="When">
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
          Other…
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
              Pick a time at least half an hour from now and within the next two
              months.
            </small>
          )}
        </label>
      )}
    </OfferRow>
  );
}

function PlaceRow({
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
    <OfferRow label="Where">
      <div className="offer-chips" role="group" aria-label="Meeting points">
        {suggested.map(chip)}
        {!more && (
          <TapChip selected={false} onSelect={() => setMore(true)}>
            Other…
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
    </OfferRow>
  );
}

/**
 * The offer card: price steps, pickup slots from the listing's own pickup
 * times and campus meeting points, then the message Pako writes for them.
 * Nothing is sent until the student taps the card's button; sending an offer
 * counts as the sender's confirmation. A sheet on phones, a card on desktop.
 */
export default function OfferEditor({
  open,
  entry,
  listing,
  role,
  otherName,
  homePoint,
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
  /** Both sides' latest prices, when countering. */
  counter?: { theirs: number; mine: number };
  busy: boolean;
  error: string;
  onSend: (terms: DealTerms, message: string) => void;
  onClose: () => void;
}) {
  const { mode } = entry;
  const [now] = useState(() => new Date());
  const free = listing.price === 0;
  const prices = priceChoices({ asking: listing.price, counter });
  // A counter starts between both prices; anything else from the terms it opens with.
  const [amount, setAmount] = useState(
    () =>
      (mode === "counter" ? prices[Math.floor(prices.length / 2)] : undefined) ??
      entry.terms.amount ??
      listing.price,
  );
  const fulfillment = entry.terms.fulfillment ?? "pickup";
  const pickup = fulfillment === "pickup";
  const slots = useMemo(() => {
    const named = futureSlot(entry.terms, now);
    const offered = pickupSlots(listing.available, now);
    return named
      ? [named, ...offered.filter((slot) => slot.pickupAt !== named.pickupAt)]
      : offered;
  }, [entry.terms, listing.available, now]);
  const [slot, setSlot] = useState(() => futureSlot(entry.terms, now));
  const suggestedPlaces = meetingPointChoices(
    entry.terms.pickupPoint,
    listing.pickupPoint?.name,
    homePoint,
  );
  const [place, setPlace] = useState(
    () => entry.terms.pickupPoint ?? listing.pickupPoint?.name ?? null,
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
  const unstated = unstatedTerm(message, terms);
  const states = unstated === null;
  const complete = missingTerms(terms).length === 0;
  const description = `${listing.title} · ${free ? "free" : `asking ${termPrice(listing.price)}`}`;
  return (
    <Modal
      sheet
      open={open}
      title={free && mode === "offer" ? "Plan the pickup" : TITLES[mode]}
      description={description}
      onClose={onClose}
    >
      <form
        className="offer-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (complete && states && !busy) onSend(terms, message.trim());
        }}
      >
        {!free && (
          <PriceRow
            asking={listing.price}
            choices={prices}
            amount={amount}
            onAmount={setAmount}
          />
        )}
        {pickup && (
          <>
            <TimeRow slots={slots} slot={slot} now={now} onSlot={setSlot} />
            <PlaceRow
              suggested={suggestedPlaces}
              place={place}
              onPlace={setPlace}
            />
          </>
        )}
        <OfferRow label="Message">
          <textarea
            className="offer-message"
            aria-label={`Message to ${otherName}`}
            maxLength={4000}
            rows={3}
            value={message}
            onChange={(event) => setWritten(event.target.value)}
          />
          {written === null ? (
            <PakoLabel>Pako drafted this for you. Check it, then send.</PakoLabel>
          ) : (
            !states && (
              <p className="offer-note" role="status">
                Your text no longer mentions {unstated}. Add it back so{" "}
                {otherName} reads exactly what they confirm.{" "}
                <Button
                  type="button"
                  className="chat-listing-link"
                  onClick={() => setWritten(null)}
                >
                  Use Pako's wording
                </Button>
              </p>
            )
          )}
        </OfferRow>
        <div className="offer-send">
          <Button
            type="submit"
            animateIcon
            className="button primary large full"
            disabled={!complete || !states || busy}
          >
            {busy ? "Sending…" : sendLabel(mode, role, terms)}
          </Button>
          {error && (
            <p className="chat-error" role="alert">
              {error}
            </p>
          )}
          <small className="offer-note">
            {mode === "confirm"
              ? `${otherName} confirms with one tap after you.`
              : `Sending your offer counts as your confirmation. ${otherName} confirms with one tap.`}
          </small>
        </div>
      </form>
    </Modal>
  );
}
