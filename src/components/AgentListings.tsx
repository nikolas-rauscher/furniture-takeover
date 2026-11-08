import { Fragment } from "react";
import { money, type Product } from "../../shared/marketplace";
import { GitCompareArrows, Image as ImageIcon } from "./icons";
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
  compared,
  onOpen,
  onOffer,
  onCompare,
}: {
  listings: readonly Product[];
  compared: readonly string[];
  onOpen: (item: Product) => void;
  onOffer: (item: Product) => void;
  onCompare: (id: string) => void;
}) {
  return (
    <section className="agent-listings" aria-label="Takeover listings">
      <div className="agent-listings-heading">
        <h3>On Takeover</h3>
        <Badge variant="secondary">{listings.length}</Badge>
      </div>
      <p className="agent-listings-note">
        Check pickup distance before collecting.
      </p>
      <ItemGroup>
        {listings.map((item, index) => {
          const details = [item.condition, item.dimensions]
            .filter((value) => value && value !== "Not specified")
            .join(" · ");
          const canOffer = !item.own && item.status === "active";
          const isCompared = compared.includes(item.id);
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
                      {item.title}
                    </Button>
                  </ItemTitle>
                  <ItemDescription>
                    <strong>
                      {item.price === 0 ? "Free" : money(item.price)}
                    </strong>
                    {" · "}
                    {item.location}
                  </ItemDescription>
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
                  <Button
                    className="agent-listing-compare"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${isCompared ? "Remove from comparison" : "Compare"}: ${item.title}`}
                    aria-pressed={isCompared}
                    onClick={() => onCompare(item.id)}
                  >
                    <GitCompareArrows size={16} aria-hidden="true" />
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
