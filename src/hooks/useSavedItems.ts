import type { Product } from "../../shared/marketplace";
import { savedListing } from "../api/favorites";
import { useFavorites } from "./useFavorites";
import type { Toasts } from "./useToast";

export type SavedItems = ReturnType<typeof useSavedItems>;

/** Listings the student saved, with the price each had when saved. */
export function useSavedItems({
  signedIn,
  listings,
  toast,
  openSignIn,
  openSaved,
}: {
  signedIn: boolean;
  /** Listings that can be saved and shown. */
  listings: Product[];
  toast: Toasts;
  openSignIn: () => void;
  openSaved: () => void;
}) {
  const { favorites, setFavorites, prices, error } = useFavorites();
  return {
    ids: favorites,
    error,
    listings: listings
      .filter((item) => favorites.includes(item.id))
      .map((item) => savedListing(item, prices)),
    async toggle(id: string, item: Product | undefined) {
      if (!signedIn) {
        openSignIn();
        return;
      }
      const adding = !favorites.includes(id);
      const stored = await setFavorites(
        (current) =>
          current.includes(id)
            ? current.filter((entry) => entry !== id)
            : [...current, id],
        item,
      );
      if (!stored) return;
      if (adding)
        toast.show({
          message: "Added to your saved items.",
          mood: "love",
          savedFavorite: id,
          action: {
            label: "View",
            description: "View your saved items",
            onClick: openSaved,
          },
        });
      else
        toast.show((notice) => (notice?.savedFavorite === id ? null : notice));
    },
    clear: () => setFavorites([]),
  };
}
