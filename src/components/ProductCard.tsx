import { listingPhotos } from "../../shared/listingPhotos";
import { GitCompareArrows, Heart, Image as ImageIcon } from "lucide-react";
import { TODAY, money, type Product } from "../../shared/marketplace";

type ProductCardProps = {
  product: Product;
  favorite: boolean;
  showFavorite?: boolean;
  compared: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
};

export default function ProductCard({
  product,
  favorite,
  showFavorite = true,
  compared,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
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
        <button
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
        </button>
        {showFavorite && (
          <button
            className={`favorite-button ${favorite ? "favorited" : ""}`}
            type="button"
            aria-label={`${favorite ? "Remove from" : "Save to"} favourites: ${product.title}`}
            aria-pressed={favorite}
            onClick={onToggleFavorite}
          >
            <Heart size={18} fill={favorite ? "currentColor" : "none"} />
          </button>
        )}
        {listingPhotos(product).length > 1 && (
          <span className="product-photo-count">
            {listingPhotos(product).length} photos
          </span>
        )}
        {product.status === "sold" && <span className="sold-label">Sold</span>}
      </div>
      <div className="product-info">
        <div className="product-tags" aria-label="Listing details">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="product-title-row">
          <button
            className="text-button product-title"
            type="button"
            onClick={onOpen}
          >
            {product.title}
          </button>
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
        <div className="product-bottom">
          <span
            className={`pickup ${product.pickupBy === TODAY ? "today" : ""}`}
          >
            {product.available}
          </span>
          <button
            className={`compare-button ${compared ? "selected" : ""}`}
            type="button"
            aria-label={`${product.title} ${compared ? "remove from comparison" : "compare"}`}
            aria-pressed={compared}
            onClick={onToggleCompare}
          >
            <GitCompareArrows size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
