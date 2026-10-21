import { ArrowLeft } from "lucide-react";
import { money, type Product } from "../../shared/marketplace";

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
    <>
      <div className="page-title">
        <button className="back-link" onClick={() => onBack()}>
          <ArrowLeft size={16} />
          My space
        </button>
        <h1>Compare your listings</h1>
      </div>
      {items.length ? (
        <div className="comparison-grid">
          {items.map((item) => (
            <article className="comparison-card" key={item.id}>
              <div className="comparison-image">
                <img src={item.image} alt={item.title} />
              </div>
              <h2>{item.title}</h2>
              <strong className="compare-price">{money(item.price)}</strong>
              <div>
                <div className="compare-fact">
                  <span>Condition</span>
                  <strong>{item.condition || "Not specified"}</strong>
                </div>
                <div className="compare-fact">
                  <span>Dimensions</span>
                  <strong>{item.dimensions}</strong>
                </div>
                <div className="compare-fact">
                  <span>Collection</span>
                  <strong>{item.available}</strong>
                </div>
              </div>
              <button
                className="button secondary full"
                onClick={() => onOpen(item)}
              >
                Open listing
              </button>
              <button className="text-button" onClick={() => onRemove(item.id)}>
                Remove
              </button>
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
    </>
  );
}
