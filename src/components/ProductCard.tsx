import { Button } from "./ui/button";
import { listingPhotos } from "../../shared/listingPhotos";
import {
  GitCompareArrows,
  Image as ImageIcon,
  MapPin,
} from "@/components/icons";
import SaveToggle from "./SaveToggle";
import { TODAY, money, type Product } from "../../shared/marketplace";
import "./product-card.css";

type ProductCardProps = {
  product: Product;
  favorite: boolean;
  showFavorite?: boolean;
  compared: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
};

/** A sticker on the photo tells what matters before the details: sold, reserved or free. */
function productSticker(product: Product) {
  if (product.status === "sold") return "Sold";
  if (product.status === "reserved") return "Reserved";
  return product.price === 0 ? "Free" : "";
}

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
            product.dimensions.length <= 32 ? product.dimensions : "",
          ],
    ),
  ]
    .filter((tag) => Boolean(tag) && tag !== "Not specified")
    .slice(0, 3);
  const sticker = productSticker(product);
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
        {sticker && (
          <span className="product-sticker" data-tone={sticker.toLowerCase()}>
            {sticker}
          </span>
        )}
      </div>
      <div className="product-info">
        <div className="product-tags" aria-label="Listing details">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <Button
          className="text-button product-title"
          type="button"
          onClick={onOpen}
        >
          {product.title}
        </Button>
        <div className="product-price-row">
          <strong>{money(product.price)}</strong>
          <Button
            className={`compare-button ${compared ? "selected" : ""}`}
            type="button"
            aria-label={`${product.title} ${compared ? "remove from comparison" : "compare"}`}
            aria-pressed={compared}
            onClick={onToggleCompare}
          >
            <GitCompareArrows size={16} aria-hidden="true" />
          </Button>
        </div>
        <p className="product-location">
          <MapPin size={14} aria-hidden="true" />
          <span>{product.location}</span>
        </p>
        <p className="product-distance">Distance unverified</p>
        {product.pickupPoint && (
          <p className="product-pickup-address">
            {product.pickupPoint.address}
          </p>
        )}
        <p className={`pickup ${product.pickupBy === TODAY ? "today" : ""}`}>
          {product.available}
        </p>
      </div>
    </article>
  );
}
