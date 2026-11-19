import { useState, type ReactNode } from "react";
import {
  Banknote,
  Clock,
  Handshake,
  MapPin,
  Package,
} from "@/components/icons";
import { money } from "../../shared/marketplace";
import "./deal-card.css";

/** The terms as students read them; null where nothing is settled yet. */
export type ShownTerms = {
  amount: number | null;
  fulfillment: "pickup" | "shipping" | null;
  /** The pickup in words, such as "Thu 20 Nov, 18:00". */
  pickupTime: string | null;
  pickupPoint: string | null;
};
type TermField = keyof ShownTerms;

const HANDOVER: Record<NonNullable<ShownTerms["fulfillment"]>, string> = {
  pickup: "Pickup",
  shipping: "Shipping",
};

/** A price as a deal states it: a free item says so instead of "CHF 0". */
export const termPrice = (amount: number) =>
  amount === 0 ? "Free" : money(amount);

/** The listing's photo, or a parcel when there is none or it cannot load. */
export function DealTile({ image }: { image?: string }) {
  const [brokenImage, setBrokenImage] = useState<string>();
  return image && image !== brokenImage ? (
    <img
      className="deal-tile"
      src={image}
      alt=""
      onError={() => setBrokenImage(image)}
    />
  ) : (
    <span className="deal-tile" aria-hidden="true">
      <Package size={18} />
    </span>
  );
}

function Term({
  field,
  icon,
  label,
  value,
  unknown,
  note,
}: {
  field: TermField;
  icon: ReactNode;
  label: string;
  value: string | null;
  unknown: string;
  /** A line under the value, such as the other student's own words. */
  note?: ReactNode;
}) {
  return (
    <div data-term={field} data-open={value === null || undefined}>
      <dt>
        {icon}
        {label}
      </dt>
      <dd>{value ?? unknown}</dd>
      {note && <dd className="deal-card-term-note">{note}</dd>}
    </div>
  );
}

/**
 * The four terms of a deal as tiles, two by two: the price, the handover and,
 * unless the item is shipped, the pickup time and the meeting point.
 */
export function DealTermsGrid({
  terms,
  unknown,
  amountLabel = "Offer",
  notes = {},
}: {
  terms: ShownTerms;
  /** What a tile says while its term is not settled. */
  unknown: Record<TermField, string>;
  amountLabel?: string;
  notes?: Partial<Record<TermField, ReactNode>>;
}) {
  return (
    <dl className="deal-card-terms">
      <Term
        field="amount"
        icon={<Banknote size={14} aria-hidden="true" />}
        label={amountLabel}
        value={terms.amount === null ? null : termPrice(terms.amount)}
        unknown={unknown.amount}
        note={notes.amount}
      />
      <Term
        field="fulfillment"
        icon={<Handshake size={14} aria-hidden="true" />}
        label="Handover"
        value={terms.fulfillment && HANDOVER[terms.fulfillment]}
        unknown={unknown.fulfillment}
        note={notes.fulfillment}
      />
      {terms.fulfillment !== "shipping" && (
        <>
          <Term
            field="pickupTime"
            icon={<Clock size={14} aria-hidden="true" />}
            label="Pickup time"
            value={terms.pickupTime}
            unknown={unknown.pickupTime}
            note={notes.pickupTime}
          />
          <Term
            field="pickupPoint"
            icon={<MapPin size={14} aria-hidden="true" />}
            label="Meeting point"
            value={terms.pickupPoint}
            unknown={unknown.pickupPoint}
            note={notes.pickupPoint}
          />
        </>
      )}
    </dl>
  );
}
