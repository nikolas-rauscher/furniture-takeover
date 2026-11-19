import { money, type Product } from "../../shared/marketplace";
import { Image as ImageIcon } from "./icons";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import "./agent-listings.css";

/** Pako can draft an offer only for someone else's listing that is still active. */
export const canOffer = (item: Product) =>
  !item.own && item.status === "active";

export default function AgentListings({
  listings,
  ranked,
  onOpen,
  onOffer,
}: {
  listings: readonly Product[];
  /** Pako has finished and shows his matches best first. */
  ranked: boolean;
  onOpen: (item: Product) => void;
  onOffer: (item: Product) => void;
}) {
  const multiple = listings.length > 1;
  const reducedMotion = useReducedMotion();
  /** Cards rise in one after another; the delay stops growing after a few. */
  const card = (item: Product, index: number) => {
    const offerable = canOffer(item);
    const details = [
      item.condition,
      item.dimensions,
      item.available?.split(";")[0],
    ]
      .filter((value) => value && value !== "Not specified")
      .join(" · ");
    return (
      <article
        className="agent-product-card"
        style={{ "--stagger": Math.min(index, 4) } as CSSProperties}
      >
        {ranked && multiple && index === 0 && (
          <span className="agent-product-best">Best match</span>
        )}
        <Button
          className="agent-product-photo"
          variant="plain"
          aria-label={`View ${item.title}`}
          onClick={() => onOpen(item)}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <ImageIcon size={28} aria-hidden="true" />
          )}
        </Button>
        <div className="agent-product-content">
          <h4>
            <Button
              className="agent-product-title"
              variant="link"
              onClick={() => onOpen(item)}
            >
              {item.title}
            </Button>
          </h4>
          <p>{item.location}</p>
          {details && <p>{details}</p>}
          <div className="agent-product-footer">
            <strong className="agent-product-price">
              {item.price === 0 ? "Free" : money(item.price)}
            </strong>
            <Button
              className="agent-product-offer"
              variant="outline"
              size="sm"
              onClick={() => (offerable ? onOffer(item) : onOpen(item))}
            >
              {!offerable
                ? "View listing"
                : item.price === 0
                  ? "Plan pickup with Pako"
                  : "Draft an offer with Pako"}
            </Button>
          </div>
        </div>
      </article>
    );
  };
  return (
    <section
      className={`agent-listings${multiple ? " has-carousel" : " has-single-product"}`}
      aria-label="Takeover listings"
    >
      {multiple ? (
        <Carousel
          opts={{
            align: "start",
            loop: false,
            duration: reducedMotion ? 0 : 25,
          }}
          aria-label="Takeover product results"
        >
          <div className="agent-listings-heading">
            <h3>On Takeover</h3>
            <Badge variant="secondary">{listings.length}</Badge>
            <div className="agent-carousel-controls">
              <CarouselPrevious aria-label="Previous products" />
              <CarouselNext aria-label="Next products" />
            </div>
          </div>
          <CarouselContent className="agent-product-track">
            {listings.map((item, index) => (
              <CarouselItem
                key={item.id}
                className="agent-product-slide"
                aria-label={`${index + 1} of ${listings.length}`}
              >
                {card(item, index)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        <>
          <div className="agent-listings-heading">
            <h3>On Takeover</h3>
            <Badge variant="secondary">{listings.length}</Badge>
          </div>
          {listings.map((item, index) => (
            <div key={item.id}>{card(item, index)}</div>
          ))}
        </>
      )}
    </section>
  );
}
