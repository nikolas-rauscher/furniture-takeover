import type { CSSProperties } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, Image as ImageIcon } from "@/components/icons";
import { money, type Product } from "../../shared/marketplace";
import Pako from "./onboarding/Pako";
import "./compare-page.css";

type ComparePageProps = {
  /** Listings have loaded, so a kept comparison shows at once instead of the empty state. */
  loaded: boolean;
  items: Product[];
  onBack(): void;
  onOpen(item: Product): void;
  onRemove(id: string): void;
};

type Fact = { label: string; value(item: Product): string };

/** What students weigh between listings, in the order both views list it. */
const FACTS: Fact[] = [
  { label: "Condition", value: (item) => item.condition || "Not specified" },
  { label: "Dimensions", value: (item) => item.dimensions || "Not specified" },
  {
    label: "Collection",
    value: (item) => item.available || "Arrange with seller",
  },
];
const PRICE: Fact = { label: "Price", value: (item) => money(item.price) };

function ListingImage({ item }: { item: Product }) {
  return item.image ? (
    <img src={item.image} alt={item.title} />
  ) : (
    <span className="listing-no-photo">
      <ImageIcon size={28} aria-hidden="true" />
      No photo
    </span>
  );
}

/** Phones read the facts across: one column per listing, its name pinned above. */
function FactTable({ items }: { items: Product[] }) {
  return (
    <table className="comparison-table">
      <caption className="sr-only">Listings side by side</caption>
      <thead>
        <tr>
          <td />
          {items.map((item) => (
            <th key={item.id} scope="col">
              <span className="comparison-table-thumb" aria-hidden="true">
                {item.image ? (
                  <img src={item.image} alt="" />
                ) : (
                  <ImageIcon size={16} />
                )}
              </span>
              {item.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[PRICE, ...FACTS].map((fact) => (
          <tr key={fact.label}>
            <th scope="row">{fact.label}</th>
            {items.map((item) => (
              <td key={item.id}>{fact.value(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ComparisonCard({
  item,
  onOpen,
  onRemove,
}: {
  item: Product;
  onOpen(): void;
  onRemove(): void;
}) {
  return (
    <article className="comparison-card">
      <div className="comparison-card-heading">
        <div className="comparison-image">
          <ListingImage item={item} />
        </div>
        <div className="comparison-card-title">
          <h2>{item.title}</h2>
          <strong className="compare-price">{money(item.price)}</strong>
          {(item.demo || item.status !== "active") && (
            <p className="comparison-status">
              {[
                item.demo ? "Sample listing" : "",
                item.status !== "active" ? item.status : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
      <dl className="comparison-facts">
        {FACTS.map((fact) => (
          <div className="compare-fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value(item)}</dd>
          </div>
        ))}
      </dl>
      <div className="comparison-card-actions">
        <Button className="button secondary small full" onClick={onOpen}>
          Open listing
        </Button>
        <Button
          className="text-button"
          aria-label={`Remove ${item.title} from comparison`}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </article>
  );
}

export default function ComparePage({
  loaded,
  items,
  onBack,
  onOpen,
  onRemove,
}: ComparePageProps) {
  return (
    <section className="compare-page">
      <div className="page-title">
        <Button className="back-link" onClick={() => onBack()}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <h1>Compare items</h1>
      </div>
      {!loaded ? null : items.length ? (
        <>
          {items.length > 1 && <FactTable items={items} />}
          <div
            className="comparison-grid"
            style={{ "--compare-count": items.length } as CSSProperties}
          >
            {items.map((item) => (
              <ComparisonCard
                key={item.id}
                item={item}
                onOpen={() => onOpen(item)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="compare-empty">
          <Pako mood="wave" size={80} />
          <h2>Select listings to compare</h2>
          <p>Tap the compare tile on up to three listings.</p>
          <Button className="button secondary" onClick={() => onBack()}>
            Choose listings
          </Button>
        </div>
      )}
    </section>
  );
}
