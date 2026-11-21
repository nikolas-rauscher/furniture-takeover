import { createContext, useContext } from "react";
import type { Negotiation } from "../../shared/negotiation.ts";

/** The price the student named to Pako in the search chat for a listing, if any. */
export type NamedOfferPrice = (listingId: string) => number | null;

export const NamedOfferPriceContext = createContext<NamedOfferPrice | null>(
  null,
);

export function useNamedOfferPrice(): NamedOfferPrice {
  const named = useContext(NamedOfferPriceContext);
  if (!named)
    throw new Error(
      "The offer card needs the prices named in the search chat.",
    );
  return named;
}

/** The newest open draft for the listing, when its price came from the student's own words. */
export function priceNamedInSearch(
  negotiations: readonly Negotiation[],
  listingId: string,
): number | null {
  const latest = [...negotiations]
    .reverse()
    .find((item) => item.listingId === listingId && item.status === "draft");
  const amount = latest?.terms.amount ?? null;
  return latest?.evidence.amount?.origin === "buyer" &&
    amount !== null &&
    amount > 0
    ? amount
    : null;
}
