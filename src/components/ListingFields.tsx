import type { ReactNode } from "react";
import { Input } from "./ui/input";
import { SelectField } from "./ui/select-field";
import { Textarea } from "./ui/textarea";
import type { ListingDraft } from "./SellFlow";

/** Ids of the required fields, so a missing one can be focused from the checklist. */
export type ListingFieldIds = Record<
  "title" | "description" | "price" | "location",
  string
>;

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
          title="Enter a title with at least one non-space character."
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
          <Input
            id={ids.price}
            form={form}
            required
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max="10000"
            value={draft.price}
            onChange={(event) => onDraftChange({ price: event.target.value })}
            placeholder="Your asking price"
          />
        </label>
        <label>
          Condition<span className="optional">Optional</span>
          <SelectField
            aria-label="Condition"
            value={draft.condition}
            onValueChange={(condition) => onDraftChange({ condition })}
            options={[
              ...new Set(["", "Very good", "Good", "Used", draft.condition]),
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
      <h2 className="form-section-title collection-title">Collection</h2>
      <div className="form-grid">
        <label>
          Pickup location
          <Input
            id={ids.location}
            form={form}
            required
            maxLength={120}
            pattern=".*\S.*"
            title="Enter a pickup location with at least one non-space character."
            value={draft.location}
            onChange={(event) =>
              onDraftChange({ location: event.target.value })
            }
          />
        </label>
        <label>
          Last day to collect<span className="optional">Optional</span>
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
