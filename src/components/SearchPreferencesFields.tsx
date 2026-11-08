import { SelectField } from "./ui/select-field";
import { Input } from "./ui/input";
import { TODAY, type Criteria } from "../../shared/marketplace";

type SearchPreferencesFieldsProps = {
  value: Criteria;
  onChange: (criteria: Criteria) => void;
};

export default function SearchPreferencesFields({
  value,
  onChange,
}: SearchPreferencesFieldsProps) {
  return (
    <div className="form-grid">
      <label className="query-field">
        Looking for
        <Input
          value={
            value.query || (value.category === "All" ? "" : value.category)
          }
          placeholder="Describe any item or requirement"
          onChange={(event) =>
            onChange({ ...value, category: "All", query: event.target.value })
          }
        />
      </label>
      <label>
        Max. price (CHF)
        <Input
          type="number"
          required
          inputMode="decimal"
          step="0.01"
          min="0"
          max="1000000"
          value={Number.isNaN(value.maxPrice) ? "" : value.maxPrice}
          onChange={(event) =>
            onChange({ ...value, maxPrice: event.target.valueAsNumber })
          }
        />
      </label>
      <label>
        Distance (km)
        <Input
          type="number"
          required
          inputMode="decimal"
          step="0.1"
          min="0"
          max="500"
          value={Number.isNaN(value.radius) ? "" : value.radius}
          onChange={(event) =>
            onChange({ ...value, radius: event.target.valueAsNumber })
          }
        />
      </label>
      <label>
        Pickup by
        <Input
          type="date"
          min={TODAY}
          value={value.pickup}
          onChange={(event) =>
            onChange({ ...value, pickup: event.target.value })
          }
        />
      </label>
      <label>
        Condition
        <SelectField
          aria-label="Condition"
          value={value.condition}
          onValueChange={(condition) => onChange({ ...value, condition })}
          options={[
            ...new Set(["All", "Very good", "Good", "Used", value.condition]),
          ].map((option) => ({ value: option, label: option }))}
        />
      </label>
      <label>
        Source
        <SelectField
          aria-label="Source"
          value={value.source}
          onValueChange={(source) =>
            onChange({ ...value, source: source as Criteria["source"] })
          }
          options={[
            ...new Set([
              "All",
              "takeover",
              "Ricardo",
              "Anibis",
              "Tutti",
              "Petitesannonces",
              "Kleinanzeigen",
              "eBay",
              value.source,
            ]),
          ].map((option) => ({
            value: option,
            label: option === "takeover" ? "Takeover" : option,
          }))}
        />
      </label>
    </div>
  );
}
