import { Button } from "./ui/button";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  Car,
  GitCompareArrows,
  Handshake,
  MapPin,
  MessageCircle,
  Pencil,
  Truck,
} from "@/components/icons";
import type { StripView } from "../dealWords";
import { listingPhotos } from "../../shared/listingPhotos";
import { isMine, money, type Product } from "../../shared/marketplace";
import { transportGuidance } from "../transportGuidance";
import { relatedListings } from "../../shared/relatedListings";
import PhotoGallery from "./PhotoGallery";
import SaveToggle from "./SaveToggle";
import PakoReaction from "./PakoReaction";
import { canOffer, offerLabel } from "./AgentListings";
import "./listing-detail.css";

type ListingDetailPageProps = {
  cloud?: boolean;
  selected?: Product;
  /** Whether the listings are known; until then a missing listing may still come. */
  loaded: boolean;
  catalog?: Product[];
  renderProduct?: (product: Product) => ReactNode;
  reportAction?: ReactNode;
  favorite?: boolean;
  compared?: boolean;
  onToggleFavorite?: () => void;
  onToggleCompare?: () => void;
  /** Names where Back leads: the chat, the catalogue, your listings… */
  backLabel: string;
  onBack(): void;
  onMessage(): void;
  /** Pako drafts an offer, or plans the pickup of a free item. */
  onOffer(): void;
  /** The buyer's deal on this listing, read from their conversation. */
  deal?: StripView;
  /** Opens the conversation the deal is in. */
  onOpenChat(): void;
  onEdit(): void;
  onAskAgent(): void;
  /** Feature-flagged availability prototype; replaces "Message seller". */
  availabilityPanel?: ReactNode;
};

/** Where the buyer's deal on this listing stands, in the words of its thread. */
function ListingDeal({ view }: { view: StripView }) {
  const booked = view.tone === "booked";
  return (
    <p className="listing-detail-deal" data-tone={view.tone}>
      <span className="listing-detail-deal-icon" aria-hidden="true">
        {booked ? <CalendarCheck size={17} /> : <Handshake size={17} />}
      </span>
      <span>
        <strong>{booked ? "Reserved for you" : view.lead}</strong>
        {[view.detail, view.status].filter(Boolean).map((part) => (
          <span key={part}> · {part}</span>
        ))}
      </span>
    </p>
  );
}

/** The transport estimate in a facts tile: short, so it stays one line in any font. */
const TRANSPORT_TILES = {
  car: "Estate car may do",
  van: "Van likely needed",
  unknown: "Ask for measurements",
} as const;

export default function ListingDetailPage({
  cloud = false,
  selected,
  loaded,
  catalog = [],
  renderProduct,
  reportAction,
  favorite = false,
  compared = false,
  onToggleFavorite,
  onToggleCompare,
  backLabel,
  onBack,
  onMessage,
  onOffer,
  deal,
  onOpenChat,
  onEdit,
  onAskAgent,
  availabilityPanel,
}: ListingDetailPageProps) {
  if (!selected && !loaded) return null;
  if (!selected)
    return (
      <div className="listing-detail-missing">
        <PakoReaction mood="sad" size={88} />
        <h1>Listing unavailable</h1>
        <p>Go back to browse other listings.</p>
        <Button className="button secondary" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    );
  const similar = renderProduct ? relatedListings(selected, catalog) : [];
  const transport = transportGuidance(selected.title, selected.dimensions);
  const mine = isMine(selected);
  /** Leads the main action's label where it docks at the bottom of a phone screen. */
  const dockPrice = (
    <span className="listing-detail-dock-price">
      {money(selected.price)} ·{" "}
    </span>
  );
  return (
    <article className="listing-detail">
      <Button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> {backLabel}
      </Button>
      <div className="listing-detail-main">
        <div className="listing-detail-media">
          <PhotoGallery
            key={selected.id}
            images={listingPhotos(selected)}
            title={selected.title}
          />
          {!cloud && !selected.demo && (
            <div className="listing-detail-provenance">
              <p>
                Saved in this browser. Not published to an external
                marketplace.
              </p>
            </div>
          )}
        </div>
        <div className="listing-detail-summary">
          <div className="listing-detail-card">
            <div className="listing-detail-heading">
              {mine && (
                <span className="listing-detail-owner">Your listing</span>
              )}
              <h1>{selected.title}</h1>
              <div className="listing-detail-price-row">
                <strong className="listing-detail-price">
                  {money(selected.price)}
                </strong>
                {selected.status !== "active" && (
                  <span
                    className="listing-detail-status"
                    data-mine={deal?.tone === "booked" || undefined}
                  >
                    {selected.status === "sold"
                      ? "Sold"
                      : selected.status === "reserved"
                        ? deal?.tone === "booked"
                          ? "Reserved for you"
                          : "Reserved"
                        : "Archived"}
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
                <dt>Pickup</dt>
                <dd>{selected.available || "Ask the seller"}</dd>
              </div>
              {transport && (
                <div data-vehicle={transport.vehicle}>
                  <dt>
                    {transport.vehicle === "van" ? (
                      <Truck size={14} aria-hidden="true" />
                    ) : (
                      <Car size={14} aria-hidden="true" />
                    )}
                    Transport
                  </dt>
                  <dd>{TRANSPORT_TILES[transport.vehicle]}</dd>
                </div>
              )}
            </dl>
            {transport && (
              <p className="quiet-caption listing-detail-transport-note">
                {transport.message} {transport.note}
              </p>
            )}
            {!mine && (
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
                  {selected.seller && <span>Seller</span>}
                </div>
              </div>
            )}
            <div className="listing-detail-actions">
              {mine ? (
                <div className="listing-detail-owner-actions">
                  <div className="listing-detail-dock">
                    <Button
                      className="button secondary small"
                      type="button"
                      onClick={onEdit}
                    >
                      <Pencil size={16} />
                      <span>{dockPrice}Edit listing</span>
                    </Button>
                  </div>
                  <Button
                    className="button secondary small"
                    type="button"
                    onClick={onAskAgent}
                  >
                    Ask Pako to improve this listing
                  </Button>
                </div>
              ) : (
                <>
                  {deal && <ListingDeal view={deal} />}
                  <div
                    className={
                      (selected.status === "active" || deal) &&
                      !availabilityPanel
                        ? "listing-detail-dock"
                        : undefined
                    }
                  >
                    {availabilityPanel ??
                      (deal ? (
                        <Button
                          animateIcon
                          className="button primary full"
                          type="button"
                          onClick={onOpenChat}
                        >
                          <MessageCircle size={17} />
                          <span>{dockPrice}Open conversation</span>
                        </Button>
                      ) : (
                        <Button
                          animateIcon
                          className="button primary full"
                          type="button"
                          disabled={selected.status !== "active"}
                          onClick={onMessage}
                        >
                          <MessageCircle size={17} />
                          <span>{dockPrice}Message seller</span>
                        </Button>
                      ))}
                  </div>
                  {!deal && canOffer(selected) && (
                    <Button
                      className="button secondary listing-detail-offer"
                      type="button"
                      onClick={onOffer}
                    >
                      <PakoReaction mood="idle" size={26} still />
                      {offerLabel(selected)} with Pako
                    </Button>
                  )}
                </>
              )}
              {(onToggleFavorite || onToggleCompare) && (
                <div className="listing-detail-tools">
                  {onToggleFavorite && (
                    <SaveToggle
                      title={selected.title}
                      saved={favorite}
                      onToggle={onToggleFavorite}
                    />
                  )}
                  {onToggleCompare && (
                    <Button
                      type="button"
                      onClick={onToggleCompare}
                      aria-pressed={compared}
                    >
                      <GitCompareArrows size={16} />
                      Compare
                    </Button>
                  )}
                </div>
              )}
            </div>
            {reportAction && (
              <div className="listing-detail-report">{reportAction}</div>
            )}
          </div>
          {selected.description && (
            <section className="listing-detail-description">
              <h2>About this item</h2>
              <p>{selected.description}</p>
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
                    Check address source
                  </a>
                </div>
                <p className="listing-detail-pickup-note">
                  Confirm the meeting point with the seller before travelling.
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
