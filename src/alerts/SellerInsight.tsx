import { money } from "../../shared/marketplace";
import type { DemandLadder, SimilarListings } from "./matching";
import "./alerts.css";

type SellerInsightProps = {
  /** Asking price being typed; NaN while it is empty or invalid. */
  price: number;
  ladder: DemandLadder;
  similar: SimilarListings | null;
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** Facts for the seller while listing; counts only, never who is watching. */
export default function SellerInsight({
  price,
  ladder,
  similar,
}: SellerInsightProps) {
  const asking = ladder.rungs[0];
  const anyDemand = ladder.rungs.some((rung) => rung.count > 0);
  if (!anyDemand && !similar) return null;
  return (
    <div className="seller-insight" aria-label="Demand and price context">
      {anyDemand && asking && (
        <div>
          <p className="listing-demand">
            {asking.count > 0
              ? `${plural(asking.count, "saved search", "saved searches")} would be alerted at ${money(price)}.`
              : `No saved search would be alerted at ${money(price)}.`}
            {ladder.noLimit > 0 &&
              ` ${ladder.noLimit} of them ${ladder.noLimit === 1 ? "has" : "have"} no price limit.`}
          </p>
          {ladder.rungs.length > 1 && (
            <ul className="demand-ladder" aria-label="Alerts by asking price">
              {ladder.rungs.map((rung) => (
                <li key={rung.price}>
                  <span>{money(rung.price)}</span>
                  <strong>{rung.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {similar && (
        <p className="listing-supply">
          {plural(similar.count, "similar listing", "similar listings")} on
          Takeover:{" "}
          {similar.min === similar.max
            ? money(similar.min)
            : `${money(similar.min)}–${money(similar.max)}`}
          {similar.median !== null && `, median ${money(similar.median)}`}.
        </p>
      )}
      <small>Based on saved searches and listings in this browser.</small>
    </div>
  );
}
