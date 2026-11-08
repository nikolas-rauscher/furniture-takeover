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
import "./agent-listings.css";

export default function AgentListings({
  listings,
  onOpen,
  onOffer,
}: {
  listings: readonly Product[];
  onOpen: (item: Product) => void;
  onOffer: (item: Product) => void;
}) {
  const multiple = listings.length > 1;
  const reducedMotion = useReducedMotion();
  const card = (item: Product) => {
    const canOffer = !item.own && item.status === "active";
    const details = [item.condition, item.dimensions]
      .filter((value) => value && value !== "Not specified")
      .join(" · ");
    return (
      <article className="agent-product-card">
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
            <ImageIcon size={32} aria-hidden="true" />
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
          <strong className="agent-product-price">
            {item.price === 0 ? "Free" : money(item.price)}
          </strong>
          <p>{item.location}</p>
          {details && <p>{details}</p>}
          {item.available && <p>{item.available.split(";")[0]}</p>}
          <Button
            className="agent-product-offer"
            variant="outline"
            onClick={() => (canOffer ? onOffer(item) : onOpen(item))}
          >
            {!canOffer
              ? "View listing"
              : item.price === 0
                ? "Arrange pickup"
                : "Prepare an offer"}
          </Button>
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
                {card(item)}
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
          {listings.map((item) => (
            <div key={item.id}>{card(item)}</div>
          ))}
        </>
      )}
    </section>
  );
}
