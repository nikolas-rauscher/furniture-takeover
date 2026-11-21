import { useState, type ReactNode } from "react";
import type { Product } from "../../shared/marketplace";

type ProductGridProps<Item extends Product> = {
  items: Item[];
  /** Renders a card; `arriving` marks a listing that joined after the grid first showed. */
  renderProduct: (item: Item, arriving: boolean) => ReactNode;
};

/**
 * Listing cards in a grid. The cards it opens with are simply there, after a
 * reload or a return to the page too; only a listing that joins later, such as
 * one just published, arrives.
 */
export default function ProductGrid<Item extends Product>({
  items,
  renderProduct,
}: ProductGridProps<Item>) {
  const [firstShown] = useState(() => new Set(items.map((item) => item.id)));
  return (
    <div className="product-grid">
      {items.map((item) => renderProduct(item, !firstShown.has(item.id)))}
    </div>
  );
}
