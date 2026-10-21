import { TODAY, type Product } from "../shared/marketplace.ts";

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

function preservedSoldPickup(pickup: string, original?: Product) {
  return (
    original?.status === "sold" &&
    pickup === original.pickupBy &&
    validDate(pickup)
  );
}

export function listingPickupMinimum(
  pickup: string,
  original?: Product,
  today = TODAY,
) {
  return preservedSoldPickup(pickup, original) && pickup < today
    ? pickup
    : today;
}

export function validListingPickup(
  pickup: string,
  original?: Product,
  today = TODAY,
) {
  return (
    !pickup ||
    (validDate(pickup) &&
      (pickup >= today || preservedSoldPickup(pickup, original)))
  );
}
