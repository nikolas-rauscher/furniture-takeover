import type { Product } from "../../shared/marketplace";
import { useSessionIds } from "./useSessionIds";
import type { Toasts } from "./useToast";

export type Comparison = ReturnType<typeof useComparison>;

/** Up to three listings picked to compare side by side, kept for this session. */
export function useComparison({
  listings,
  toast,
  openComparison,
}: {
  /** Listings that can still be compared. */
  listings: Product[];
  toast: Toasts;
  openComparison: () => void;
}) {
  const [ids, setIds] = useSessionIds("takeover-compare");
  return {
    ids,
    /** In the order they were picked, so Pako's best match leads when he compares the top two. */
    items: ids.flatMap((id) => listings.filter((item) => item.id === id)),
    toggle(id: string) {
      setIds((current) => {
        if (current.includes(id)) return current.filter((item) => item !== id);
        if (current.length >= 3) {
          toast.say("Compare up to three listings.");
          return current;
        }
        return [...current, id];
      });
    },
    remove(id: string) {
      setIds((current) => current.filter((item) => item !== id));
    },
    clear: () => setIds([]),
    /** Shows exactly these listings side by side, replacing an earlier selection. */
    show(listingIds: string[]) {
      setIds(listingIds);
      openComparison();
    },
  };
}
