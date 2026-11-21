import type { ReactNode } from "react";
import type { Product } from "../../shared/marketplace";
import type { CardAvailability } from "../availability/useAvailability";
import ProductCard from "../components/ProductCard";

/** What every listing card shows and does, wherever it appears. */
export type ListingCards = {
  /** A listing as students see it, with the status its deal gives it. */
  shown: (item: Product) => Product;
  reservedForMe: ReadonlySet<string>;
  saved: string[];
  compared: string[];
  open: (item: Product) => void;
  toggleSaved: (id: string) => void;
  toggleCompared: (id: string) => void;
  availability: ((item: Product) => CardAvailability) | undefined;
};

export default function ListingCard({
  item,
  arriving = false,
  footer,
  cards,
}: {
  item: Product;
  arriving?: boolean;
  footer?: ReactNode;
  cards: ListingCards;
}) {
  return (
    <ProductCard
      product={cards.shown(item)}
      reservedForYou={cards.reservedForMe.has(item.id)}
      arriving={arriving}
      favorite={cards.saved.includes(item.id)}
      compared={cards.compared.includes(item.id)}
      onOpen={() => cards.open(item)}
      onToggleFavorite={() => cards.toggleSaved(item.id)}
      onToggleCompare={() => cards.toggleCompared(item.id)}
      availability={cards.availability?.(item)}
      footer={footer}
    />
  );
}
