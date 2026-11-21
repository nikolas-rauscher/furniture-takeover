import { Search, TrendingDown } from "@/components/icons";
import type { SavedListing } from "../../shared/marketplace";
import { priceDropWords } from "../priceText";
import { Button } from "./ui/button";

/**
 * Under a saved card: a price that dropped since the save, or, once the item
 * is sold or reserved for someone else, Pako's way on to something similar.
 */
export default function SavedNote({
  item,
  reservedForYou,
  onFindSimilar,
}: {
  item: SavedListing;
  reservedForYou: boolean;
  onFindSimilar: () => void;
}) {
  const gone =
    item.status === "sold" || (item.status === "reserved" && !reservedForYou);
  if (gone)
    return (
      <div className="saved-note" data-kind="gone">
        <p>
          {item.status === "sold"
            ? "Sold. I can look for something similar."
            : "Reserved for someone else. It may come back on sale."}
        </p>
        <Button
          animateIcon
          type="button"
          className="button secondary small"
          aria-label={`Find items similar to the ${item.title}`}
          onClick={onFindSimilar}
        >
          <Search size={16} aria-hidden="true" />
          Find similar
        </Button>
      </div>
    );
  const drop = priceDropWords(item);
  if (!drop) return null;
  return (
    <p className="saved-note" data-kind="drop">
      <TrendingDown size={14} aria-hidden="true" />
      <span>{drop}</span>
    </p>
  );
}
