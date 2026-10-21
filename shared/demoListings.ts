import { campusPickupPoint } from "./campusPickupPoints.ts";
import { listingPhotoSources } from "./listingPhotoSources.ts";
import type { Product } from "./marketplace.ts";

// Explicitly fictional local records for exercising the UI, never external offers.
const examples: [string, number, string, string, string, number][] = [
  ["White work desk", 65, "desk", "120 × 60 × 75 cm", "Good", 1.2],
  ["Compact study desk", 40, "desk2", "100 × 50 × 74 cm", "Used", 2.8],
  ["Reading armchair", 95, "armchair", "78 × 82 × 90 cm", "Very good", 3.4],
  ["Two-seat sofa", 180, "sofa", "165 × 85 × 78 cm", "Good", 4.1],
  ["Dining chair", 25, "chair", "45 × 48 × 82 cm", "Good", 0.8],
  ["Desk lamp", 15, "lamp", "Height 42 cm", "Very good", 1.6],
  ["Open bookshelf", 55, "shelf", "80 × 30 × 180 cm", "Used", 2.2],
  ["Free spare chair", 0, "chair", "45 × 48 × 82 cm", "Used", 5.2],
  ["Home office desk", 110, "desk2", "140 × 70 × 75 cm", "Very good", 6.5],
  ["Living room sofa", 220, "sofa", "185 × 90 × 80 cm", "Good", 8.3],
  ["Small reading lamp", 10, "lamp", "Height 38 cm", "Used", 3.7],
  ["Storage shelf", 35, "shelf", "70 × 30 × 150 cm", "Good", 9.1],
];

const originalListings: Product[] = examples.map(
  ([title, price, photo, dimensions, condition, distance], index) => ({
    id: `demo-v1-${index + 1}`,
    title,
    price,
    image: listingPhotoSources[photo].image,
    photoSourceUrl: listingPhotoSources[photo].url,
    category: "All",
    location: campusPickupPoint(index).area,
    pickupPoint: campusPickupPoint(index),
    distance,
    condition,
    dimensions,
    source: "takeover",
    seller: "Demo seller",
    initials: "D",
    description: `Fictional demo listing for testing. ${title}, ${condition.toLowerCase()} condition. Dimensions: ${dimensions}. Asking price: CHF ${price}. Photo referenced from an actual marketplace listing; the price, location and other details here are fictional examples, not the original offer.`,
    available: index % 3 === 0 ? "Weekend pickup" : "Flexible pickup",
    pickupBy: "",
    status: index === 9 ? "reserved" : index === 10 ? "sold" : "active",
    own: true,
    demo: true,
  }),
);

const variedExamples: [string, number, string, string, string, number][] = [
  ["City bicycle", 145, "bike", "Frame 54 cm · 28-inch wheels", "Good", 1.4],
  ["Vinyl turntable", 85, "turntable", "42 × 35 × 12 cm", "Very good", 2.1],
  ["Espresso machine", 70, "coffee", "24 × 31 × 28 cm", "Good", 0.7],
  ["Standing floor lamp", 30, "floorlamp", "Height 155 cm", "Good", 3.2],
  ["Full-length mirror", 35, "mirror", "50 × 160 cm", "Very good", 1.8],
  ["Wooden sideboard", 120, "sideboard", "120 × 40 × 75 cm", "Used", 4.5],
  [
    "Potted houseplant",
    12,
    "plant",
    "Height around 60 cm, including pot",
    "Good",
    0.9,
  ],
  [
    "Over-ear headphones",
    45,
    "headphones",
    "Adjustable headband",
    "Very good",
    2.6,
  ],
];

const variedListings: Product[] = variedExamples.map(
  ([title, price, photo, dimensions, condition, distance], index) => ({
    id: `demo-v2-${index + 1}`,
    title,
    price,
    image: listingPhotoSources[photo].image,
    photoSourceUrl: listingPhotoSources[photo].url,
    category: "All",
    location: campusPickupPoint(index + 1).area,
    pickupPoint: campusPickupPoint(index + 1),
    distance,
    condition,
    dimensions,
    source: "takeover",
    seller: "Demo seller",
    initials: "D",
    description: `Fictional demo listing for testing. ${title}, ${condition.toLowerCase()} condition. Dimensions: ${dimensions}. Asking price: CHF ${price}. Photo referenced from an actual marketplace listing; the price, location and other details here are fictional examples, not the original offer.`,
    available: index % 2 === 0 ? "Weekend pickup" : "Flexible pickup",
    pickupBy: "",
    status: "active",
    own: true,
    demo: true,
  }),
);

export const demoListings: Product[] = [...variedListings, ...originalListings];

export function addDemoListings(current: Product[]): Product[] {
  const ids = new Set(current.map((item) => item.id));
  return [...current, ...demoListings.filter((item) => !ids.has(item.id))];
}
