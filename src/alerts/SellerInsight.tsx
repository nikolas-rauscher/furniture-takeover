import { money } from "../../shared/marketplace";
import type { DemandLadder, SimilarListings } from "./matching";
import "./seller-insight.css";

type SellerInsightProps = {
  similar: SimilarListings | null;
  /** Developer mode only: saved searches in this browser that would get an alert. */
  ladder?: DemandLadder;
};

/** "CHF 40–110 · most around CHF 65": the range, and the median once there are enough. */
function priceRange({ min, max, median }: SimilarListings) {
  const range = min === max ? money(min) : `${money(min)}–${money(max)}`;
  return median === null ? range : `${range} · most around ${money(median)}`;
}

/** Prices of similar listings while the seller decides; counts only, never who is watching. */
export default function SellerInsight({ similar, ladder }: SellerInsightProps) {
  const demand =
    ladder && ladder.rungs.some((rung) => rung.count > 0) ? ladder : undefined;
  if (!similar && !demand) return null;
  return (
    <div className="seller-insight" aria-label="Asking prices on takeover">
      {similar && (
        <p className="seller-insight-range">
          {similar.count === 1
            ? "1 similar listing on Takeover: "
            : `${similar.count} similar on Takeover: `}
          <strong>{priceRange(similar)}</strong>
        </p>
      )}
      {demand && (
        <div className="seller-insight-demand">
          <p>
            Developer mode · alerts this browser&apos;s saved searches would get
          </p>
          <ul aria-label="Alerts by asking price">
            {demand.rungs.map((rung) => (
              <li key={rung.price}>
                <span>{money(rung.price)}</span>
                <strong>{rung.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
