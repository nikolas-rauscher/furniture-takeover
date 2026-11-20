import { useState, type ReactNode } from "react";
import {
  Banknote,
  Clock,
  Handshake,
  MapPin,
  Package,
} from "@/components/icons";
import { campusPickupPoints } from "../../shared/campusPickupPoints";
import type { Product } from "../../shared/marketplace";
import { termPrice, type ShownTerms } from "../dealWords";
import "./deal-card.css";

/** A known meeting point's address and a map link, once the pickup is booked. */
export function PlaceNote({
  name,
  listingPoint,
}: {
  name: string;
  listingPoint: Product["pickupPoint"] | undefined;
}) {
  const point = [listingPoint, ...campusPickupPoints].find(
    (candidate) => candidate?.name === name,
  );
  if (!point) return null;
  return (
    <>
      {point.address} ·{" "}
      <a
        aria-label={`Open ${point.name} in Maps`}
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.name} ${point.address}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Map
      </a>
    </>
  );
}

type TermField = keyof ShownTerms;

const HANDOVER: Record<NonNullable<ShownTerms["fulfillment"]>, string> = {
  pickup: "Pickup",
  shipping: "Shipping",
};

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
