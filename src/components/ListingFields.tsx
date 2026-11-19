import { useState, type ReactNode } from "react";
import { listingConditions } from "../../shared/marketplace";
import { plainPrice, priceText } from "../priceText";
import { Input } from "./ui/input";
import { SelectField } from "./ui/select-field";
import { Textarea } from "./ui/textarea";
import type { ListingDraft } from "./SellFlow";

/** Ids of the required fields, so a missing one can be focused from the checklist. */
export type ListingFieldIds = Record<
  "title" | "description" | "price" | "location",
  string
>;

/**
 * The asking price, written as the app writes prices (1,250) while the student
 * does not type in it; the draft keeps the plain amount.
 */
function PriceField({
  id,
  form,
  price,
  onPrice,
}: {
  id: string;
  form?: string;
  price: string;
  onPrice: (price: string) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const amount = Number(price);
  const shown =
    price.trim() && Number.isFinite(amount) ? priceText(amount) : price;
  return (
    <Input
      id={id}
      form={form}
      required
      inputMode="decimal"
      autoComplete="off"
      value={typed ?? shown}
      onFocus={() => setTyped(shown)}
      onChange={(event) => {
        setTyped(event.target.value);
        onPrice(plainPrice(event.target.value));
      }}
      onBlur={() => setTyped(null)}
      placeholder="Your asking price"
    />
  );
}

/** The listing's details as a form, in the details dialog or in place of Pako's conversation. */
export default function ListingFields({
  draft,
  ids,
  form,
  pickupMin,
  measurement,
  priceContext,
  onDraftChange,
}: {
  draft: ListingDraft;
  ids: ListingFieldIds;
  /** The save form the fields belong to when they sit outside it. */
  form?: string;
  pickupMin: string;
  /** The measurement field's label and hint for this kind of item. */
  measurement: { label: string; placeholder: string };
  /** Prices of similar listings, shown under the price. */
  priceContext?: ReactNode;
  onDraftChange: (changes: Partial<ListingDraft>) => void;
}) {
  return (
    <div className="review-form">
      <label>
        Title
        <Input
          id={ids.title}
          form={form}
          required
          maxLength={180}
          pattern=".*\S.*"
          title="Enter a listing title."
          value={draft.title}
          onChange={(event) => onDraftChange({ title: event.target.value })}
        />
      </label>
      <label>
        Description
        <Textarea
          id={ids.description}
          form={form}
          required
          rows={5}
          maxLength={4000}
          value={draft.description}
          onChange={(event) =>
            onDraftChange({ description: event.target.value })
          }
        />
      </label>
      <div className="form-grid">
        <label>
          Price (CHF)
          <PriceField
            id={ids.price}
            form={form}
            price={draft.price}
            onPrice={(price) => onDraftChange({ price })}
          />
        </label>
        <label>
          Condition<span className="optional">Optional</span>
          <SelectField
            aria-label="Condition"
            value={draft.condition}
            onValueChange={(condition) => onDraftChange({ condition })}
            options={[
              ...new Set(["", ...listingConditions, draft.condition]),
            ].map((value) => ({
              value,
              label: value || "Not specified",
            }))}
          />
        </label>
        <label>
          {measurement.label}
          <span className="optional">Optional</span>
          <Input
            form={form}
            value={draft.dimensions}
            maxLength={160}
            onChange={(event) =>
              onDraftChange({ dimensions: event.target.value })
            }
            placeholder={measurement.placeholder}
          />
        </label>
      </div>
      {priceContext}
      <h2 className="form-section-title collection-title">Pickup</h2>
      <div className="form-grid">
        <label>
          Pickup location
          <Input
            id={ids.location}
            form={form}
            required
            maxLength={120}
            pattern=".*\S.*"
            title="Enter a pickup location."
            value={draft.location}
            onChange={(event) =>
              onDraftChange({ location: event.target.value })
            }
          />
        </label>
        <label>
          Pickup deadline<span className="optional">Optional</span>
          <Input
            form={form}
            type="date"
            min={pickupMin}
            value={draft.pickup}
            onChange={(event) => onDraftChange({ pickup: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
