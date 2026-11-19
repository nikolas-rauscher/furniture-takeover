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
import { cn } from "@/lib/utils";
import { useEntrance } from "../hooks/useEntrance";
import "./agent-listings.css";

/** Pako can draft an offer only for someone else's listing that is still active. */
export const canOffer = (item: Product) =>
  !item.own && item.status === "active";

type AgentProductCardProps = {
  item: Product;
  /** Place among the results; later cards rise a little later. */
  index: number;
  /** Pako's first pick once he has ranked his matches. */
  best: boolean;
  onOpen: (item: Product) => void;
  onOffer: (item: Product) => void;
};

/**
 * A result in the chat. Cards rise in one after another as Pako's results
 * arrive; the delay stops growing after a few. They rise once: back in the
 * chat after opening a listing, they are simply there.
 */
function AgentProductCard({
  item,
  index,
  best,
  onOpen,
  onOffer,
}: AgentProductCardProps) {
  const entrance = useEntrance(true);
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
      className={cn(
        "agent-product-card linked-card",
        entrance.entering && "arriving",
      )}
      style={{ "--stagger": Math.min(index, 4) } as CSSProperties}
      onAnimationEnd={entrance.onAnimationEnd}
    >
      {best && <span className="agent-product-best">Best match</span>}
      <span className="agent-product-photo">
        {item.image ? (
          <img src={item.image} alt="" loading="lazy" draggable={false} />
        ) : (
          <ImageIcon size={28} aria-hidden="true" />
        )}
      </span>
      <div className="agent-product-content">
        <h4>
          <Button
            className="agent-product-title card-link"
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
}

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
  const card = (item: Product, index: number) => (
    <AgentProductCard
      item={item}
      index={index}
      best={ranked && multiple && index === 0}
      onOpen={onOpen}
      onOffer={onOffer}
    />
  );
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
