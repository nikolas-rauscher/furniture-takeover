import type { ReactNode } from "react";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { listingPhotos } from "../../shared/listingPhotos";
import { money, type Product } from "../../shared/marketplace";
import PhotoGallery from "./PhotoGallery";

type ListingDetailPageProps = {
  selected?: Product;
  onBack(): void;
  onMessage(): void;
  onEdit(): void;
  onAskAgent(): void;
  /** Feature-flagged availability prototype; replaces "Message seller". */
  availabilityPanel?: ReactNode;
};

export default function ListingDetailPage({
  selected,
  onBack,
  onMessage,
  onEdit,
  onAskAgent,
  availabilityPanel,
}: ListingDetailPageProps) {
  return selected ? (
    <>
      <button className="back-link" onClick={() => onBack()}>
        <ArrowLeft size={16} />
        My listings
      </button>
      <div className="detail-layout">
        <div className="detail-photo">
          <PhotoGallery
            key={selected.id}
            images={listingPhotos(selected)}
            title={selected.title}
          />
        </div>
        <div className="detail-summary">
          <span className="source-label">
            {selected.demo
              ? "Demo listing · Fictional offer"
              : "Your local listing"}
          </span>
          <h1>{selected.title}</h1>
          <strong className="detail-price">{money(selected.price)}</strong>
          <div className="detail-meta">
            <span>
              <MapPin size={15} />
              {selected.location}
            </span>
          </div>
          {selected.pickupPoint && (
            <div className="detail-description">
              <strong>Suggested meeting point</strong>
              <p>
                {selected.pickupPoint.name}
                <br />
                {selected.pickupPoint.address}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.pickupPoint.name + " " + selected.pickupPoint.address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Maps
              </a>
              {" · "}
              <a
                href={selected.pickupPoint.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Address source
              </a>
              <p>
                This is a real place near EPFL. Arrange a meeting with the
                seller; this demo item is not stored there.
              </p>
            </div>
          )}
          <div className="detail-description">
            <p>{selected.description}</p>
            {selected.photoSourceUrl && (
              <a
                href={selected.photoSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View original photo listing
              </a>
            )}
          </div>
          <div className="facts">
            <div>
              <span>Condition</span>
              <strong>{selected.condition || "Not specified"}</strong>
            </div>
            <div>
              <span>Dimensions</span>
              <strong>{selected.dimensions}</strong>
            </div>
            <div>
              <span>Collection</span>
              <strong>{selected.available}</strong>
            </div>
          </div>
          {availabilityPanel ?? (
            <button
              className="button primary full"
              disabled={selected.status !== "active"}
              onClick={() => onMessage()}
            >
              Message seller
            </button>
          )}
          <button className="button secondary full" onClick={() => onEdit()}>
            <Pencil size={16} />
            Edit listing
          </button>
          <button
            className="button secondary full"
            onClick={() => {
              onAskAgent();
            }}
          >
            Ask the agent
          </button>
          <p className="quiet-caption">
            {selected.demo
              ? "Demo listing stored in the local database."
              : "Saved in this browser."}{" "}
            Not published to an external marketplace.
          </p>
        </div>
      </div>
    </>
  ) : (
    <div className="empty-state">
      <h1>Listing not found</h1>
      <button className="button secondary" onClick={() => onBack()}>
        My listings
      </button>
    </div>
  );
}
