import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { cardImageFor, listingPhotos } from "../../shared/listingPhotos";
import {
  Clock,
  GitCompareArrows,
  Image as ImageIcon,
  MapPin,
} from "@/components/icons";
import SaveToggle from "./SaveToggle";
import { useEntrance } from "../hooks/useEntrance";
import { cn } from "@/lib/utils";
import {
  TODAY,
  money,
  placeLine,
  type Product,
} from "../../shared/marketplace";
import type { CardAvailability } from "../availability/useAvailability";
import "./product-card.css";

type ProductCardProps = {
  product: Product;
  /** A listing that joins a grid already on screen rises into place; others are simply there. */
  arriving?: boolean;
  favorite: boolean;
  showFavorite?: boolean;
  compared: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
  /** Reservation state from the availability prototype, when it runs. */
  availability?: CardAvailability;
  /** The student's own deal reserved it for them. */
  reservedForYou?: boolean;
  /** A note under the details, such as a saved item's price drop. */
  footer?: ReactNode;
};

/** A sticker on the photo tells what matters before the details: sold, reserved or free. */
function productSticker(product: Product, reservedForYou: boolean) {
  if (product.status === "sold") return "Sold";
  if (product.status === "reserved")
    return reservedForYou ? "Reserved for you" : "Reserved";
  return product.price === 0 ? "Free" : "";
}

const stickerTone = (sticker: string) =>
  sticker === "Reserved for you" ? "mine" : sticker.toLowerCase();

export default function ProductCard({
  product,
  arriving = false,
  favorite,
  showFavorite = true,
  compared,
  onOpen,
  onToggleFavorite,
  onToggleCompare,
  availability,
  reservedForYou = false,
  footer,
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
  const sticker =
    availability?.sticker ?? productSticker(product, reservedForYou);
  const entrance = useEntrance(arriving);
  return (
    <article
      className={cn(
        "product-card linked-card",
        entrance.entering && "arriving",
      )}
      data-status={product.status}
      onAnimationEnd={entrance.onAnimationEnd}
    >
      <div className="product-photo">
        {product.image ? (
          <img
            src={cardImageFor(product)}
            alt=""
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="listing-no-photo">
            <ImageIcon size={32} aria-hidden="true" />
            <span>No photo</span>
          </span>
        )}
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
          <span className="product-sticker" data-tone={stickerTone(sticker)}>
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
          className="text-button product-title card-link"
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
            title={compared ? "Remove from comparison" : "Compare"}
            aria-pressed={compared}
            onClick={onToggleCompare}
          >
            <GitCompareArrows size={16} aria-hidden="true" />
          </Button>
        </div>
        <p className="product-location">
          <MapPin size={14} aria-hidden="true" />
          <span>{placeLine(product)}</span>
        </p>
        {availability?.note && (
          <p className="product-availability">
            <Clock size={14} aria-hidden="true" />
            <span>{availability.note}</span>
          </p>
        )}
        {product.pickupPoint && (
          <p className="product-pickup-address">
            {product.pickupPoint.address}
          </p>
        )}
        <p className={`pickup ${product.pickupBy === TODAY ? "today" : ""}`}>
          {product.available}
        </p>
        {footer}
      </div>
    </article>
  );
}
