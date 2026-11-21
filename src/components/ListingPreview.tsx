import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  Image as ImageIcon,
  MapPin,
  Sparkles,
} from "@/components/icons";
import { money, shortDate } from "../../shared/marketplace";
import { undatedPickup } from "../listingQuestions";
import type { ListingDraft } from "../listingDraft";
import { Button } from "./ui/button";
import "./listing-preview.css";

/** A detail Pako just filled in settles into place, like the fields of the intro's card. */
const FILL_IN = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
} as const;

/** The card's description; a sentence just added to its end glows for a moment. */
function DescriptionPreview({ text }: { text: string }) {
  const [shown, setShown] = useState({ text, added: "" });
  if (shown.text !== text)
    setShown({
      text,
      added:
        shown.text && text.startsWith(shown.text)
          ? text.slice(shown.text.length)
          : "",
    });
  const kept = text.slice(0, text.length - shown.added.length);
  return (
    <p className="listing-card-description">
      {kept}
      {shown.added && (
        <span key={text} className="listing-card-added">
          {shown.added}
        </span>
      )}
    </p>
  );
}

/** Where a detail Pako is still writing will appear. */
function Pending({ lines = 1 }: { lines?: number }) {
  return (
    <span className="listing-card-pending" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

/** A detail of the card, filled in when it arrives. */
function Fact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <motion.dd key={value} {...FILL_IN}>
        {icon}
        {value}
      </motion.dd>
    </div>
  );
}

type Props = {
  draft: ListingDraft;
  photos: readonly string[];
  /** The price on the card: the student's own, else Pako's suggestion until it is accepted. */
  price: number | undefined;
  /** The price is still only Pako's suggestion; the card shows it muted until chosen. */
  suggested: boolean;
  /** Opens Pako's price question, where the suggestion is decided. */
  onReviewPrice?: () => void;
  /** Prices of similar listings, shown on wider screens. */
  insight: ReactNode;
  /** Pako is writing the listing, so empty details are about to arrive. */
  writing: boolean;
  /** What the size is called for this kind of item. */
  measurementLabel: string;
  onEditPhotos: () => void;
};

/** The listing as buyers will see it, filling in while Pako writes it. */
export default function ListingPreview({
  draft,
  photos,
  price,
  suggested,
  onReviewPrice,
  insight,
  writing,
  measurementLabel,
  onEditPhotos,
}: Props) {
  return (
    <article
      className="listing-card"
      aria-label="Listing preview"
      aria-busy={writing}
    >
      <Button
        className="listing-card-photo"
        onClick={onEditPhotos}
        aria-label={`Edit listing photos (${photos.length})`}
      >
        {draft.image ? (
          <img src={draft.image} alt="" />
        ) : (
          <ImageIcon size={28} aria-hidden="true" />
        )}
        <span className="listing-card-photo-count" aria-hidden="true">
          <ImageIcon size={12} />
          {photos.length}
        </span>
      </Button>
      <div className="listing-card-head">
        <AnimatePresence initial={false}>
          {writing && (
            <motion.span
              className="chip listing-card-writing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Sparkles size={14} aria-hidden="true" />
              Pako is writing…
            </motion.span>
          )}
        </AnimatePresence>
        <h2>
          {draft.title || !writing ? (
            <motion.span key={draft.title} {...FILL_IN}>
              {draft.title || "Your item"}
            </motion.span>
          ) : (
            <Pending />
          )}
        </h2>
        <div className="listing-card-price">
          <motion.strong
            key={price ?? "not-set"}
            data-tentative={suggested || price === undefined || undefined}
            {...FILL_IN}
          >
            {price === undefined ? "Price not set" : money(price)}
          </motion.strong>
          {suggested && price !== undefined && (
            <button
              type="button"
              className="chip listing-card-suggested"
              aria-label={`Suggested price ${money(price)}. Choose your asking price.`}
              disabled={!onReviewPrice}
              onClick={onReviewPrice}
            >
              Suggested
            </button>
          )}
        </div>
      </div>
      <div className="listing-card-details">
        {(draft.condition || draft.dimensions) && (
          <dl className="listing-card-facts">
            {draft.condition && (
              <Fact label="Condition" value={draft.condition} />
            )}
            {draft.dimensions && (
              <Fact label={measurementLabel} value={draft.dimensions} />
            )}
          </dl>
        )}
        {draft.description ? (
          <DescriptionPreview text={draft.description} />
        ) : (
          writing && <Pending lines={3} />
        )}
        <dl className="listing-card-facts">
          <Fact
            label="Pickup area"
            value={draft.location}
            icon={<MapPin size={14} aria-hidden="true" />}
          />
          <Fact
            label="Pickup"
            value={
              draft.pickup
                ? `By ${shortDate(draft.pickup)}`
                : undatedPickup(draft.description)
            }
            icon={<CalendarDays size={14} aria-hidden="true" />}
          />
        </dl>
        <div className="listing-card-insight">{insight}</div>
      </div>
    </article>
  );
}
