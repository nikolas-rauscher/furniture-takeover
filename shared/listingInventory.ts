import type { Product } from "./marketplace.ts";
import type { AgentRunInventoryItem } from "./runs.ts";

/** Searchable active records, shared by browser listings and the server database. */
export function listingInventory(
  inventory: Product[],
): AgentRunInventoryItem[] {
  return inventory
    .filter((item) => item.own && item.status === "active")
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
        item.available ? `Pickup arrangement: ${item.available}.` : "",
        "Distance from the search location is unverified; check pickup distance before claiming this listing matches the radius.",
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
