import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { listingPhotos } from "../../shared/listingPhotos";
import { GitCompareArrows, Image as ImageIcon } from "@/components/icons";
import SaveToggle from "./SaveToggle";
import { TODAY, money, type Product } from "../../shared/marketplace";

type ProductCardProps = {
  product: Product;
  favorite: boolean;
  showFavorite?: boolean;
  compared: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
  /** Feature-flagged availability prototypes; absent on main. */
  statusLabel?: ReactNode;
  availabilityNote?: ReactNode;
};

export default function ProductCard({
  product,
  favorite,
  showFavorite = true,
  compared,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
  statusLabel,
  availabilityNote,
}: ProductCardProps) {
  const itemTags = product.tags?.filter((tag) => tag !== "Demo") ?? [];
  const tags = [
    ...new Set(
      itemTags.length
        ? itemTags
        : [
            product.condition,
            product.price === 0 ? "Free" : "",
            product.dimensions.length <= 32 ? product.dimensions : "",
          ],
    ),
  ]
    .filter((tag) => Boolean(tag) && tag !== "Not specified")
    .slice(0, 3);
  return (
    <article className="product-card">
      <div className="product-photo">
        <Button
          className="photo-link"
          type="button"
          onClick={onOpen}
          aria-label={`${product.title} view`}
        >
          {product.image ? (
            <img src={product.image} alt={product.title} loading="lazy" />
          ) : (
            <span className="listing-no-photo">
              <ImageIcon size={32} />
              <span>No photo</span>
            </span>
          )}
        </Button>
        {showFavorite && (
          <SaveToggle
            title={product.title}
            saved={favorite}
            onToggle={onToggleFavorite}
            iconOnly
          />
        )}
        {listingPhotos(product).length > 1 && (
          <span className="product-photo-count">
            {listingPhotos(product).length} photos
          </span>
        )}
        {product.status === "sold" && <span className="sold-label">Sold</span>}
        {statusLabel}
      </div>
      <div className="product-info">
        <div className="product-tags" aria-label="Listing details">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="product-title-row">
          <Button
            className="text-button product-title"
            type="button"
            onClick={onOpen}
          >
            {product.title}
          </Button>
          <strong>{money(product.price)}</strong>
        </div>
        <p className="product-location">
          {product.location}
          <span>Distance unverified</span>
        </p>
        {product.pickupPoint && (
          <p className="product-pickup-address">
            {product.pickupPoint.address}
          </p>
        )}
        {availabilityNote}
        <div className="product-bottom">
          <span
            className={`pickup ${product.pickupBy === TODAY ? "today" : ""}`}
          >
            {product.available}
          </span>
          <Button
            className={`compare-button ${compared ? "selected" : ""}`}
            type="button"
            aria-label={`${product.title} ${compared ? "remove from comparison" : "compare"}`}
            aria-pressed={compared}
            onClick={onToggleCompare}
          >
            <GitCompareArrows size={16} />
          </Button>
        </div>
      </div>
    </article>
  );
}
