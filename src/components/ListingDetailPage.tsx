import type { ReactNode } from "react";
import {
  ArrowLeft,
  GitCompareArrows,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
} from "lucide-react";
import { listingPhotos } from "../../shared/listingPhotos";
import { money, type Product } from "../../shared/marketplace";
import { relatedListings } from "../../shared/relatedListings";
import PhotoGallery from "./PhotoGallery";
import "./listing-detail.css";

type ListingDetailPageProps = {
  cloud?: boolean;
  selected?: Product;
  catalog?: Product[];
  renderProduct?: (product: Product) => ReactNode;
  reportAction?: ReactNode;
  favorite?: boolean;
  compared?: boolean;
  onToggleFavorite?: () => void;
  onToggleCompare?: () => void;
  onBack(): void;
  onMessage(): void;
  onEdit(): void;
  onAskAgent(): void;
};

export default function ListingDetailPage({
  cloud = false,
  selected,
  catalog = [],
  renderProduct,
  reportAction,
  favorite = false,
  compared = false,
  onToggleFavorite,
  onToggleCompare,
  onBack,
  onMessage,
  onEdit,
  onAskAgent,
}: ListingDetailPageProps) {
  if (!selected)
    return (
      <div className="empty-state">
        <h1>Listing not found</h1>
        <button className="button secondary" onClick={onBack}>
          Back to listings
        </button>
      </div>
    );
  const similar = renderProduct ? relatedListings(selected, catalog) : [];
  const description = selected.demo
    ? selected.description
        .split(/\n\n(?:Sample listing for testing|SYNTHETIC DEMO)/i)[0]
        .trim()
    : selected.description;
  const samplePhotoNote =
    selected.description.match(/Photo (?:illustrates|shows) [^\n]+/)?.[0] ?? "";
  const mobileContact = !selected.own && selected.status === "active";
  return (
    <article
      className={`listing-detail${mobileContact ? " has-mobile-contact" : ""}`}
    >
      <button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to listings
      </button>
      <div className="listing-detail-main">
        <div className="listing-detail-media">
          <PhotoGallery
            key={selected.id}
            images={listingPhotos(selected)}
            title={selected.title}
          />
          {(selected.demo || selected.photoSourceUrl || !cloud) && (
            <div className="listing-detail-provenance">
              {selected.demo ? (
                <p>
                  <strong>Sample listing.</strong> Price and pickup details are
                  fictional; this seller cannot reply. {samplePhotoNote}
                </p>
              ) : !cloud ? (
                <p>
                  Saved in this browser. Not published to an external
                  marketplace.
                </p>
              ) : null}
              {selected.photoSourceUrl && (
                <a
                  href={selected.photoSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Original photo listing
                </a>
              )}
            </div>
          )}
        </div>
        <div className="listing-detail-summary">
          <div className="listing-detail-heading">
            {selected.own && (
              <span className="listing-detail-owner">Your listing</span>
            )}
            <h1>{selected.title}</h1>
            <div className="listing-detail-price-row">
              <strong className="listing-detail-price">
                {money(selected.price)}
              </strong>
              {selected.status !== "active" && (
                <span className="listing-detail-status">
                  {selected.status === "sold"
                    ? "Sold"
                    : selected.status === "reserved"
                      ? "Reserved"
                      : "Withdrawn"}
                </span>
              )}
            </div>
            <p className="listing-detail-location">
              <MapPin size={15} aria-hidden="true" />
              {selected.location}
            </p>
          </div>
          <dl className="listing-detail-facts">
            <div>
              <dt>Condition</dt>
              <dd>{selected.condition || "Not specified"}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>{selected.dimensions || "Not specified"}</dd>
            </div>
            <div>
              <dt>Collection</dt>
              <dd>{selected.available || "Arrange with seller"}</dd>
            </div>
          </dl>
          <div className="listing-detail-seller">
            <span className="listing-detail-avatar" aria-hidden="true">
              {selected.seller
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase() || selected.initials}
            </span>
            <div>
              <strong>{selected.seller || "Seller"}</strong>
              <span>{selected.own ? "Your listing" : "Listed by seller"}</span>
            </div>
          </div>
          <div className="listing-detail-actions">
            {(!cloud || !selected.own) && (
              <div
                className={
                  mobileContact ? "listing-detail-mobile-contact" : undefined
                }
              >
                <button
                  className="button primary full"
                  type="button"
                  disabled={selected.status !== "active"}
                  onClick={onMessage}
                >
                  <MessageCircle size={17} /> Message seller
                </button>
              </div>
            )}
            {(!cloud || selected.own) && (
              <div className="listing-detail-owner-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={onEdit}
                >
                  <Pencil size={16} /> Edit listing
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={onAskAgent}
                >
                  Ask the agent
                </button>
              </div>
            )}
            {(onToggleFavorite || onToggleCompare) && (
              <div className="listing-detail-tools">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    aria-pressed={favorite}
                  >
                    <Heart
                      size={16}
                      fill={favorite ? "currentColor" : "none"}
                    />
                    {favorite ? "Saved" : "Save item"}
                  </button>
                )}
                {onToggleCompare && (
                  <button
                    type="button"
                    onClick={onToggleCompare}
                    aria-pressed={compared}
                  >
                    <GitCompareArrows size={16} />
                    {compared ? "Added to compare" : "Compare"}
                  </button>
                )}
              </div>
            )}
          </div>
          {reportAction && (
            <div className="listing-detail-report">{reportAction}</div>
          )}
          {description && (
            <section className="listing-detail-description">
              <h2>About this item</h2>
              <p>{description}</p>
            </section>
          )}
          {selected.pickupPoint && (
            <section className="listing-detail-pickup">
              <MapPin size={17} aria-hidden="true" />
              <div>
                <h2>Suggested meeting point</h2>
                <p>
                  <strong>{selected.pickupPoint.name}</strong>
                  <br />
                  {selected.pickupPoint.address}
                </p>
                <div className="listing-detail-pickup-links">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.pickupPoint.name + " " + selected.pickupPoint.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Maps
                  </a>
                  <a
                    href={selected.pickupPoint.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Address source
                  </a>
                </div>
                <p className="listing-detail-pickup-note">
                  {selected.demo
                    ? "Real meeting point; this sample item is not stored here."
                    : "Confirm the meeting point with the seller before travelling."}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
      {similar.length > 0 && renderProduct && (
        <section
          className="listing-detail-related"
          aria-labelledby="similar-items-heading"
        >
          <div className="listing-detail-related-heading">
            <h2 id="similar-items-heading">Similar items</h2>
            <p>More available listings with details in common.</p>
          </div>
          <div className="listing-detail-related-grid">
            {similar.map((item) => (
              <div key={item.id}>{renderProduct(item)}</div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
