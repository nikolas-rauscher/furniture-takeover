import { isMine, money, type Product } from "../../shared/marketplace";
import { Clock, Image as ImageIcon } from "./icons";
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
  !isMine(item) && item.status === "active";

/** What Pako prepares for a listing: a pickup plan for a free one, otherwise an offer. */
export const offerLabel = (item: Pick<Product, "price">) =>
  item.price === 0 ? "Plan pickup" : "Draft offer";

/**
 * Where Pako's matches stand: still being ranked while he works, ranked best
 * first once he has finished, or as found when the turn stopped early.
 */
export type ResultOrder = "pending" | "ranked" | "unranked";

/** The listing's place, with the seller's distance when they gave one. */
function placeLine(item: Product) {
  return item.distance === undefined
    ? item.location
    : `${item.location} · ${item.distance} km`;
}

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
  const details = [item.condition, item.dimensions]
    .filter((value) => value && value !== "Not specified")
    .join(" · ");
  const pickup = item.available?.split(";")[0];
  return (
    <article
      className={cn(
        "agent-product-card linked-card",
        best && "is-best",
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
        <p>{placeLine(item)}</p>
        {details && <p>{details}</p>}
        {pickup && (
          <p className="agent-product-pickup">
            <Clock size={13} aria-hidden="true" />
            <span>{pickup}</span>
          </p>
        )}
        <div className="agent-product-footer">
          <strong className="agent-product-price">
            {item.price === 0 ? "Free" : money(item.price)}
          </strong>
          <Button
            className="agent-product-offer"
            variant="outline"
            size="sm"
            aria-label={`${offerable ? offerLabel(item) : "View listing"}: ${item.title}`}
            onClick={() => (offerable ? onOffer(item) : onOpen(item))}
          >
            {offerable ? offerLabel(item) : "View listing"}
          </Button>
        </div>
      </div>
    </article>
  );
}

/** A card-sized place for the results, held while Pako ranks his matches. */
function PendingResults() {
  return (
    <section
      className="agent-listings is-pending"
      aria-label="takeover listings"
      aria-busy="true"
    >
      <div className="agent-listings-heading">
        <h3>On takeover</h3>
      </div>
      <div className="agent-product-placeholder">
        <span className="agent-product-photo" />
        <span className="agent-product-placeholder-lines">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">I'm ranking the listings I found…</span>
      </div>
    </section>
  );
}

export default function AgentListings({
  listings,
  order,
  onOpen,
  onOffer,
}: {
  listings: readonly Product[];
  order: ResultOrder;
  onOpen: (item: Product) => void;
  onOffer: (item: Product) => void;
}) {
  const multiple = listings.length > 1;
  const reducedMotion = useReducedMotion();
  // The cards land once, in their final order, so a tap never meets a card that is about to change.
  if (order === "pending") return <PendingResults />;
  const card = (item: Product, index: number) => (
    <AgentProductCard
      item={item}
      index={index}
      best={order === "ranked" && multiple && index === 0}
      onOpen={onOpen}
      onOffer={onOffer}
    />
  );
  return (
    <section
      className={`agent-listings${multiple ? " has-carousel" : " has-single-product"}`}
      aria-label="takeover listings"
    >
      {multiple ? (
        <Carousel
          opts={{
            align: "start",
            loop: false,
            duration: reducedMotion ? 0 : 25,
          }}
          aria-label="takeover listings"
        >
          <div className="agent-listings-heading">
            <h3>On takeover</h3>
            <Badge variant="secondary">{listings.length}</Badge>
            <div className="agent-carousel-controls">
              <CarouselPrevious aria-label="Previous listings" />
              <CarouselNext aria-label="Next listings" />
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
            <h3>On takeover</h3>
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
