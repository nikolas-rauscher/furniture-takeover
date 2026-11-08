import { Fragment } from "react";
import { money, type Product } from "../../shared/marketplace";
import { Image as ImageIcon } from "./icons";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./ui/item";
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
  return (
    <section className="agent-listings" aria-label="Takeover listings">
      <div className="agent-listings-heading">
        <h3>On Takeover</h3>
        <Badge variant="secondary">{listings.length}</Badge>
      </div>
      <ItemGroup>
        {listings.map((item, index) => {
          const details = [item.condition, item.dimensions]
            .filter((value) => value && value !== "Not specified")
            .join(" · ");
          const canOffer = !item.own && item.status === "active";
          return (
            <Fragment key={item.id}>
              {index > 0 && <ItemSeparator />}
              <Item className="agent-listing" role="listitem" size="sm">
                <ItemMedia variant="image">
                  <Button
                    className="agent-listing-photo"
                    variant="plain"
                    aria-label={`View ${item.title}`}
                    onClick={() => onOpen(item)}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.title} loading="lazy" />
                    ) : (
                      <ImageIcon size={24} aria-hidden="true" />
                    )}
                  </Button>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    <Button
                      className="agent-listing-title"
                      variant="link"
                      onClick={() => onOpen(item)}
                    >
                      <span>{item.title}</span>
                      <span className="agent-listing-price">
                        <strong>
                          {item.price === 0 ? "Free" : money(item.price)}
                        </strong>
                        {" · "}
                        {item.location}
                      </span>
                    </Button>
                  </ItemTitle>
                  {details && <ItemDescription>{details}</ItemDescription>}
                  {item.available && (
                    <ItemDescription title={item.available}>
                      {item.available.split(";")[0]}
                    </ItemDescription>
                  )}
                </ItemContent>
                <ItemActions>
                  <Button
                    className="agent-listing-offer"
                    variant="outline"
                    size="sm"
                    onClick={() => (canOffer ? onOffer(item) : onOpen(item))}
                  >
                    {!canOffer
                      ? "View listing"
                      : item.price === 0
                        ? "Arrange pickup"
                        : "Prepare an offer"}
                  </Button>
                </ItemActions>
              </Item>
            </Fragment>
          );
        })}
      </ItemGroup>
    </section>
  );
}
