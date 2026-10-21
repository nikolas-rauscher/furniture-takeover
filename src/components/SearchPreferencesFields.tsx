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
        <input
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
        <input
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
        <input
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
        <input
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
        <select
          value={value.condition}
          onChange={(event) =>
            onChange({ ...value, condition: event.target.value })
          }
        >
          <option>All</option>
          <option>Very good</option>
          <option>Good</option>
          <option>Used</option>
          {!["All", "Very good", "Good", "Used"].includes(value.condition) && (
            <option>{value.condition}</option>
          )}
        </select>
      </label>
      <label>
        Source
        <select
          value={value.source}
          onChange={(event) =>
            onChange({
              ...value,
              source: event.target.value as Criteria["source"],
            })
          }
        >
          <option>All</option>
          <option>takeover</option>
          <option>Ricardo</option>
          <option>Anibis</option>
          <option>Tutti</option>
          <option>Petitesannonces</option>
          <option>Kleinanzeigen</option>
          <option>eBay</option>
          {![
            "All",
            "takeover",
            "Ricardo",
            "Anibis",
            "Tutti",
            "Petitesannonces",
            "Kleinanzeigen",
            "eBay",
          ].includes(value.source) && <option>{value.source}</option>}
        </select>
      </label>
    </div>
  );
}
