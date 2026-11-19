import {
  marketplaceToday,
  matchesPickupWindow,
  withinSearchRadius,
  type Product,
} from "./marketplace.ts";
import type { AgentRunInventoryItem } from "./runs.ts";

/** Searchable active records, shared by browser listings and the server database. */
export function listingInventory(
  inventory: Product[],
  preferences?: { radius?: number; pickupBy?: string },
  today = marketplaceToday(),
): AgentRunInventoryItem[] {
  return inventory
    .filter(
      (item) =>
        item.source === "takeover" &&
        item.status === "active" &&
        withinSearchRadius(item.distance, preferences?.radius) &&
        matchesPickupWindow(item, preferences?.pickupBy, today),
    )
    .map((item) => ({
      id: item.id.slice(0, 120),
      title: item.title.slice(0, 180),
      price: item.price,
      description: [
        item.description,
        item.condition ? `Condition: ${item.condition}.` : "",
        item.dimensions && item.dimensions !== "Not specified"
          ? `Measurements: ${item.dimensions}.`
          : "",
        item.pickupBy ? `Last day to collect: ${item.pickupBy}.` : "",
        item.available ? `Pickup arrangement: ${item.available}.` : "",
        item.distance > 0
          ? `Listed distance: ${item.distance} km (unverified).`
          : "Pickup distance unknown.",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1500),
      location: item.location.slice(0, 120),
      ...(item.available
        ? { pickupArrangement: item.available.slice(0, 240) }
        : {}),
      ...(item.pickupPoint
        ? {
            pickupPoint:
              `${item.pickupPoint.name}, ${item.pickupPoint.address}`.slice(
                0,
                500,
              ),
          }
        : {}),
      ...(item.demo ? { demo: true } : {}),
    }));
}
