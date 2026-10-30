import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { money, type Product } from "../../shared/marketplace";
import "./compare-page.css";

type ComparePageProps = {
  items: Product[];
  onBack(): void;
  onOpen(item: Product): void;
  onRemove(id: string): void;
};

export default function ComparePage({
  items,
  onBack,
  onOpen,
  onRemove,
}: ComparePageProps) {
  return (
    <section className="compare-page">
      <div className="page-title">
        <button className="back-link" onClick={() => onBack()}>
          <ArrowLeft size={16} />
          Back
        </button>
        <h1>Compare items</h1>
      </div>
      {items.length ? (
        <div className="comparison-grid">
          {items.map((item) => (
            <article className="comparison-card" key={item.id}>
              <div className="comparison-card-heading">
                <div className="comparison-image">
                  {item.image ? (
                    <img src={item.image} alt={item.title} />
                  ) : (
                    <span className="listing-no-photo">
                      <ImageIcon size={28} aria-hidden="true" />
                      No photo
                    </span>
                  )}
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
                <div className="compare-fact">
                  <dt>Condition</dt>
                  <dd>{item.condition || "Not specified"}</dd>
                </div>
                <div className="compare-fact">
                  <dt>Dimensions</dt>
                  <dd>{item.dimensions || "Not specified"}</dd>
                </div>
                <div className="compare-fact">
                  <dt>Collection</dt>
                  <dd>{item.available || "Arrange with seller"}</dd>
                </div>
              </dl>
              <div className="comparison-card-actions">
                <button
                  className="button secondary full"
                  onClick={() => onOpen(item)}
                >
                  Open listing
                </button>
                <button
                  className="text-button"
                  aria-label={`Remove ${item.title} from comparison`}
                  onClick={() => onRemove(item.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Select listings to compare</h2>
          <button className="button secondary" onClick={() => onBack()}>
            My listings
          </button>
        </div>
      )}
    </section>
  );
}
