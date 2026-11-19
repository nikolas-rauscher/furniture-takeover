import { campusPickupPoints } from "./campusPickupPoints.ts";
import type { DemoSellerName } from "./demoSellers.ts";
import type { Product } from "./marketplace.ts";

const [
  atrium,
  triaudes,
  vortex,
  ochettes,
  bourdonnette,
  learningCenter,
  swisstech,
  leCroset,
] = campusPickupPoints;

type Place = Pick<Product, "location" | "pickupPoint">;

const at = (point: NonNullable<Product["pickupPoint"]>): Place => ({
  location: point.area,
  pickupPoint: point,
});
const unil: Place = { location: "UNIL · Dorigny" };
const lausanneCentre: Place = { location: "Lausanne · Centre" };

type DemoListingSpec = Pick<
  Product,
  | "id"
  | "title"
  | "price"
  | "distance"
  | "condition"
  | "dimensions"
  | "available"
  | "description"
> & {
  /** The illustration's file name in public/samples, without its extension. */
  illustration: string;
  seller: DemoSellerName;
  place: Place;
  pickupBy?: string;
  status?: Product["status"];
};

function demoListing(spec: DemoListingSpec): Product {
  const {
    illustration,
    seller,
    place,
    pickupBy = "",
    status = "active",
    ...details
  } = spec;
  return {
    ...details,
    ...place,
    category: "All",
    image: `/samples/${illustration}.svg`,
    source: "takeover",
    seller,
    initials: seller[0],
    pickupBy,
    status,
    own: true,
    demo: true,
  };
}

const weekdayEvenings = "Weekday evenings after 18:00";

/** The first eight keep the catalogue's original order; the rest mix categories so the grid stays varied. */
const specs: DemoListingSpec[] = [
  {
    id: "demo-v2-1",
    illustration: "city-bicycle",
    title: "City bicycle",
    price: 145,
    seller: "Arjun",
    place: at(triaudes),
    distance: 1.4,
    condition: "Good",
    dimensions: "Frame 54 cm · 28-inch wheels",
    available: weekdayEvenings,
    description:
      "Hey! Selling my trusty city bike, it got me to EPFL and back all year. 7 gears, front basket, both lights and a solid rear rack. I oiled the chain in October and the tyres are fairly new. A few scratches on the frame, nothing scary. Lock not included. Happy to let you test-ride it around the block!",
  },
  {
    id: "demo-v2-2",
    illustration: "vinyl-turntable",
    title: "Vinyl turntable",
    price: 85,
    seller: "Noé",
    place: at(vortex),
    distance: 2.1,
    condition: "Very good",
    dimensions: "42 × 35 × 12 cm",
    available: "Weekend pickup",
    description:
      "Belt-drive turntable, 33 and 45 rpm. Works. New cartridge last spring. Dust cover included. No built-in speakers: needs an amp or active speakers. Cash or Twint.",
  },
  {
    id: "demo-v2-3",
    illustration: "espresso-machine",
    title: "Espresso machine",
    price: 70,
    seller: "Mia",
    place: at(ochettes),
    distance: 0.7,
    condition: "Good",
    dimensions: "24 × 31 × 28 cm",
    available: "Flexible pickup",
    description:
      "Pump espresso machine, 15 bar, 1.2 l water tank, steam wand for milk. Bought in 2023, descaled on 3 November. Comes with the portafilter, two filter baskets (single and double) and the tamper. The drip tray has a small crack at the back left corner; it still holds water. Weight 4.6 kg.",
  },
  {
    id: "demo-v2-4",
    illustration: "standing-floor-lamp",
    title: "Standing floor lamp",
    price: 30,
    seller: "Sofia",
    place: at(bourdonnette),
    distance: 3.2,
    condition: "Good",
    dimensions: "Height 155 cm",
    available: "Pickup by 30 Nov",
    pickupBy: "2026-11-30",
    description:
      "Tall floor lamp with a cream shade, perfect for a reading corner. The light is really warm. E27 bulb included. I'm moving out at the end of the month, so it needs to go by 30 November. Merci!",
  },
  {
    id: "demo-v2-5",
    illustration: "full-length-mirror",
    title: "Full-length mirror",
    price: 35,
    seller: "Jonas",
    place: at(learningCenter),
    distance: 1.8,
    condition: "Very good",
    dimensions: "50 × 160 cm",
    available: "Flexible pickup",
    description:
      "Full-length mirror with a wooden frame. Leans on the wall, no drilling needed. Glass is fine, no cracks. Fits in a Golf. I'm at the Learning Center most days.",
  },
  {
    id: "demo-v2-6",
    illustration: "wooden-sideboard",
    title: "Wooden sideboard",
    price: 120,
    seller: "Léa",
    place: at(swisstech),
    distance: 4.5,
    condition: "Used",
    dimensions: "120 × 40 × 75 cm",
    available: "Weekend pickup",
    description:
      "Solid wood sideboard with three doors. Used but sturdy. Scratches on the top. Two people to carry it. Weekend only.",
  },
  {
    id: "demo-v2-7",
    illustration: "potted-houseplant",
    title: "Potted houseplant",
    price: 12,
    seller: "Sofia",
    place: at(leCroset),
    distance: 0.9,
    condition: "Good",
    dimensions: "Height around 60 cm, including pot",
    available: "Flexible pickup",
    description:
      "My monstera needs a new home! About 60 cm with its terracotta pot, and a new leaf every few weeks. Water it once a week and give it a bright spot. Dispo presque tous les soirs.",
  },
  {
    id: "demo-v2-8",
    illustration: "over-ear-headphones",
    title: "Over-ear headphones",
    price: 45,
    seller: "Noé",
    place: at(atrium),
    distance: 2.6,
    condition: "Very good",
    dimensions: "Adjustable headband",
    available: weekdayEvenings,
    description:
      "Over-ear Bluetooth headphones. About 30 h battery. Noise cancelling works. Ear pads replaced in September. USB-C cable and case included. Twint or cash.",
  },
  {
    id: "demo-v1-1",
    illustration: "white-work-desk",
    title: "White work desk",
    price: 65,
    seller: "Mia",
    place: at(atrium),
    distance: 1.2,
    condition: "Good",
    dimensions: "120 × 60 × 75 cm",
    available: "Weekend pickup",
    description:
      "White work desk, 120 × 60 × 75 cm, with two drawers on the right (each 38 × 40 cm). Melamine top, load capacity 40 kg. Two small marks on the left edge, otherwise no damage. The legs unscrew with the Allen key I'll hand over, so it fits flat in an estate car. Smoke-free flat.",
  },
  {
    id: "demo-v3-5",
    illustration: "rice-cooker",
    title: "Rice cooker",
    price: 20,
    seller: "Arjun",
    place: at(ochettes),
    distance: 2.4,
    condition: "Very good",
    dimensions: "Capacity 1.8 l · 24 × 24 × 24 cm",
    available: "Weekend pickup",
    description:
      "A rice cooker is the best thing a student can own, I promise. Makes enough for 4-5 people, keeps it warm for hours, and comes with the measuring cup and the spoon. The inner pot is spotless. Selling because I'm moving back home.",
  },
  {
    id: "demo-v1-4",
    illustration: "two-seat-sofa",
    title: "Two-seat sofa",
    price: 180,
    seller: "Arjun",
    place: at(ochettes),
    distance: 4.1,
    condition: "Good",
    dimensions: "165 × 85 × 78 cm",
    available: "Pickup by 6 Dec",
    pickupBy: "2026-12-06",
    description:
      "Blue two-seater and honestly the comfiest spot in our flat. Removable covers (washed in October), wooden legs, one tiny stain on the back cushion you'll never notice. It's heavy, so bring a friend. The lift at Ochettes works. It needs to go by 6 December because my flatmate's sofa arrives then.",
  },
  {
    id: "demo-v3-8",
    illustration: "monitor",
    title: "24-inch monitor",
    price: 90,
    seller: "Mia",
    place: at(learningCenter),
    distance: 1.7,
    condition: "Very good",
    dimensions: "24 in · 1920 × 1080 · 54 × 32 cm",
    available: "Pickup by 6 Dec",
    pickupBy: "2026-12-06",
    status: "reserved",
    description:
      "24-inch IPS monitor, 1920 × 1080, 60 Hz, with HDMI and DisplayPort (both cables included). Panel 54 × 32 cm, 54 × 43 cm with the stand. No dead pixels, no scratches. The original box is gone, but I'll wrap it properly.",
  },
  {
    id: "demo-v3-18",
    illustration: "tower-fan",
    title: "Tower fan",
    price: 0,
    seller: "Léa",
    place: at(triaudes),
    distance: 1.5,
    condition: "Good",
    dimensions: "Height 95 cm",
    available: "Weekend pickup",
    description:
      "Free. Tower fan, 95 cm tall, 3 speeds, oscillates, remote included. A bit loud on speed 3. Ground floor.",
  },
  {
    id: "demo-v1-3",
    illustration: "reading-armchair",
    title: "Reading armchair",
    price: 95,
    seller: "Sofia",
    place: at(vortex),
    distance: 3.4,
    condition: "Very good",
    dimensions: "78 × 82 × 90 cm",
    available: "Saturday 10:00-16:00",
    description:
      "Fauteuil vert, très confortable! Velvet-feel fabric, no stains and no smell (I checked, promise). I read in it every evening, so the seat is soft and the back has kept its shape. It's too big for my new room. Saturday between 10:00 and 16:00 works best.",
  },
  {
    id: "demo-v3-9",
    illustration: "bookshelf-speakers",
    title: "Bookshelf speakers",
    price: 60,
    seller: "Arjun",
    place: unil,
    distance: 5.8,
    condition: "Good",
    dimensions: "17 × 24 × 30 cm each",
    available: "Weekend pickup",
    description:
      "A pair of passive bookshelf speakers with seriously nice sound for the money! Wood-look cabinets, 2-way, 8 ohm. I used them with a small amp for two years. One has a little dent on a top corner, which you can only see if you look for it. I'm around the Unicentre during the week.",
  },
  {
    id: "demo-v1-2",
    illustration: "compact-study-desk",
    title: "Compact study desk",
    price: 40,
    seller: "Léa",
    place: at(triaudes),
    distance: 2.8,
    condition: "Used",
    dimensions: "100 × 50 × 74 cm",
    available: "Weekday evenings after 17:00",
    description:
      "Small desk. Fits a laptop and a lamp. One drawer. Light wood, some marks on the top. Ground-floor pickup.",
  },
  {
    id: "demo-v3-4",
    illustration: "frying-pan-set",
    title: "Frying pan set",
    price: 12,
    seller: "Sofia",
    place: at(bourdonnette),
    distance: 3.6,
    condition: "Good",
    dimensions: "Ø 24 cm and 28 cm",
    available: "Flexible pickup",
    description:
      "Deux poêles, 24 and 28 cm, fine for induction. The coating is still good, I cook with them every day. I'm leaving, so I'm selling both together. A wooden spatula comes with them!",
  },
  {
    id: "demo-v3-1",
    illustration: "single-bed-frame",
    title: "Single bed with mattress",
    price: 90,
    seller: "Jonas",
    place: lausanneCentre,
    distance: 5.5,
    condition: "Good",
    dimensions: "90 × 200 cm",
    available: "Saturday 10:00-14:00",
    description:
      "Pine bed frame with slats and a 14 cm foam mattress. Mattress is clean and the cover is washable. Third floor, no lift. The frame comes apart; I'll help carry. Saturday morning.",
  },
  {
    id: "demo-v3-11",
    illustration: "linear-algebra-textbook",
    title: "Linear algebra textbook (EPFL)",
    price: 22,
    seller: "Léa",
    place: at(learningCenter),
    distance: 1.3,
    condition: "Good",
    dimensions: "Hardcover · 24 × 17 cm",
    available: "Lunchtime, Mon-Fri",
    description:
      "The textbook for Algèbre linéaire in BA1. Hardcover, no missing pages. Pencil notes in chapters 1-4, easy to erase. At EPFL most days.",
  },
  {
    id: "demo-v3-14",
    illustration: "skis-and-poles",
    title: "Skis and poles",
    price: 90,
    seller: "Arjun",
    place: at(bourdonnette),
    distance: 3,
    condition: "Used, with marks",
    dimensions: "Skis 165 cm · poles 120 cm",
    available: "Pickup by 30 Nov",
    pickupBy: "2026-11-30",
    status: "reserved",
    description:
      "Skis (165 cm) with bindings, plus poles. Great all-mountain fun! I took them to Les Diablerets and Verbier for three seasons. The bases have a few scratches, but I waxed them in February and the edges are still sharp. The bindings need adjusting to your boots at a ski shop.",
  },
  {
    id: "demo-v1-6",
    illustration: "desk-lamp",
    title: "Desk lamp",
    price: 15,
    seller: "Léa",
    place: at(learningCenter),
    distance: 1.6,
    condition: "Very good",
    dimensions: "Height 42 cm",
    available: "Lunchtime, Mon-Fri",
    description:
      "Black desk lamp with a yellow shade and an adjustable arm. Warm LED bulb included. Works. I'm at EPFL most days, lunch break is fine.",
  },
  {
    id: "demo-v1-7",
    illustration: "open-bookshelf",
    title: "Open bookshelf",
    price: 55,
    seller: "Mia",
    place: at(swisstech),
    distance: 2.2,
    condition: "Used",
    dimensions: "80 × 30 × 180 cm",
    available: "Weekend pickup",
    description:
      "Open wooden bookshelf, 80 × 30 × 180 cm, four shelves with 36 cm clearance each, so A4 folders fit. Each shelf holds about 15 kg. Visible scratches on the left side, and one shelf has a ring from a mug. Already unscrewed and flat for the car; the longest part is 180 cm.",
  },
  {
    id: "demo-v3-6",
    illustration: "electric-kettle",
    title: "Electric kettle",
    price: 8,
    seller: "Léa",
    place: at(atrium),
    distance: 1.1,
    condition: "Like new",
    dimensions: "1.7 l · 2200 W",
    available: weekdayEvenings,
    description:
      "Kettle, 1.7 l. Used for one semester, like new. Auto shut-off works.",
  },
  {
    id: "demo-v1-5",
    illustration: "dining-chair",
    title: "Dining chair",
    price: 25,
    seller: "Jonas",
    place: at(bourdonnette),
    distance: 0.8,
    condition: "Good",
    dimensions: "45 × 48 × 82 cm",
    available: "Flexible pickup",
    description:
      "One wooden dining chair. Stable. The red seat pad comes off. Three more available if you want a set.",
  },
  {
    id: "demo-v3-7",
    illustration: "plates-and-mugs",
    title: "Plates and mugs",
    price: 0,
    seller: "Sofia",
    place: at(vortex),
    distance: 1.9,
    condition: "Good",
    dimensions: "8 plates · 4 mugs",
    available: "Flexible pickup",
    description:
      "À donner! Eight plates and four mugs, all slightly different, none chipped. Take them all or just a few. Merci!",
  },
  {
    id: "demo-v3-10",
    illustration: "bike-helmet",
    title: "Bike helmet",
    price: 15,
    seller: "Noé",
    place: at(swisstech),
    distance: 2,
    condition: "Like new",
    dimensions: "Size M · head 54-58 cm",
    available: weekdayEvenings,
    description:
      "Helmet, size M (54-58 cm). Worn twice, never crashed. I bought the wrong size, sadly. Adjustable dial at the back.",
  },
  {
    id: "demo-v1-9",
    illustration: "home-office-desk",
    title: "Home office desk",
    price: 110,
    seller: "Arjun",
    place: at(atrium),
    distance: 6.5,
    condition: "Very good",
    dimensions: "140 × 70 × 75 cm",
    available: "Weekend pickup",
    description:
      "Big desk where I wrote my whole Bachelor thesis! Walnut-look top, 140 × 70 cm, black metal legs, plus a white drawer unit with three drawers. Super stable, no wobble even when I typed furiously. It comes apart in about ten minutes, tools included. Wanted: someone who'll write their thesis on it too.",
  },
  {
    id: "demo-v3-16",
    illustration: "area-rug",
    title: "Area rug",
    price: 40,
    seller: "Mia",
    place: at(atrium),
    distance: 0.9,
    condition: "Very good",
    dimensions: "160 × 230 cm",
    available: "Weekend pickup",
    description:
      "Low-pile rug, 160 × 230 cm, blue and red, pile height 8 mm. Vacuumed every week, never wet. It is rolled up (about 20 cm across, 170 cm long), so it fits into any car.",
  },
  {
    id: "demo-v3-12",
    illustration: "law-course-notes",
    title: "Droit des obligations notes (UNIL)",
    price: 0,
    seller: "Noé",
    place: unil,
    distance: 5.9,
    condition: "Used, with marks",
    dimensions: "Printed · about 140 pages",
    available: "Flexible pickup",
    description:
      "À donner. Printed and highlighted notes for Droit des obligations, 2nd year. Summary sheets inside. Take them.",
  },
  {
    id: "demo-v3-19",
    illustration: "fan-heater",
    title: "Oil-filled radiator",
    price: 30,
    seller: "Arjun",
    place: at(leCroset),
    distance: 3.3,
    condition: "Good",
    dimensions: "Height 62 cm · 2000 W",
    available: "Pickup by 6 Dec",
    pickupBy: "2026-12-06",
    description:
      "Winter is coming and this thing saved me from freezing last year! Oil-filled radiator, 2000 W, three heat settings plus a thermostat, on wheels so you can roll it from the desk to the bed. Warms a 15 m² room in about 20 minutes. No smell. Just don't leave it on while you're out, obviously.",
  },
  {
    id: "demo-v3-2",
    illustration: "wardrobe",
    title: "Two-door wardrobe",
    price: 70,
    seller: "Mia",
    place: unil,
    distance: 6,
    condition: "Used, with marks",
    dimensions: "100 × 50 × 200 cm",
    available: "Pickup by 30 Nov",
    pickupBy: "2026-11-30",
    status: "reserved",
    description:
      "Two-door wardrobe, 100 × 50 × 200 cm. Inside: one hanging rail and three shelves, each 46 cm deep. The right door has a scratch about 20 cm long at handle height, and the bottom corners show wear. The doors close properly. It comes apart into six panels, and the instructions are included.",
  },
  {
    id: "demo-v3-15",
    illustration: "tennis-racket",
    title: "Tennis racket",
    price: 25,
    seller: "Jonas",
    place: unil,
    distance: 6.1,
    condition: "Good",
    dimensions: "Head 645 cm² · 27 in",
    available: weekdayEvenings,
    description:
      "Tennis racket, grip size 3. New grip tape last month. Strings fine. Cover included. Pickup at the UNIL sports centre.",
  },
  {
    id: "demo-v1-12",
    illustration: "storage-shelf",
    title: "Storage shelf",
    price: 35,
    seller: "Jonas",
    place: at(ochettes),
    distance: 9.1,
    condition: "Good",
    dimensions: "70 × 30 × 150 cm",
    available: weekdayEvenings,
    description:
      "White cube shelf, 2 × 4. A bit scuffed at the bottom. Heavier than it looks. A few boxes included if you want them.",
  },
  {
    id: "demo-v3-17",
    illustration: "framed-prints",
    title: "Framed prints, set of 3",
    price: 18,
    seller: "Sofia",
    place: lausanneCentre,
    distance: 5,
    condition: "Like new",
    dimensions: "30 × 40 cm each",
    available: "Flexible pickup",
    description:
      "Trois affiches avec cadres, 30 × 40 cm. I bought them for my room and then moved. Warm colours, perfect above a desk. The glass is clean and the hooks are included.",
  },
  {
    id: "demo-v1-8",
    illustration: "free-spare-chair",
    title: "Free spare chair",
    price: 0,
    seller: "Noé",
    place: at(leCroset),
    distance: 5.2,
    condition: "Used",
    dimensions: "45 × 48 × 82 cm",
    available: "Flexible pickup",
    description:
      "À donner. Blue chair, used, a bit wobbly on one leg. Take it whenever, just message me.",
  },
  {
    id: "demo-v3-13",
    illustration: "inkjet-printer",
    title: "Inkjet printer",
    price: 25,
    seller: "Jonas",
    place: at(vortex),
    distance: 2.5,
    condition: "Used, with marks",
    dimensions: "42 × 35 × 18 cm",
    available: "Flexible pickup",
    description:
      "All-in-one inkjet printer: prints, scans, copies. Wi-Fi works on a good day. Scuffed on top. Cartridges nearly empty, so buy new ones. USB cable included.",
  },
  {
    id: "demo-v3-20",
    illustration: "vacuum-cleaner",
    title: "Vacuum cleaner",
    price: 40,
    seller: "Mia",
    place: at(bourdonnette),
    distance: 2.2,
    condition: "Good",
    dimensions: "Canister · 38 × 26 × 26 cm",
    available: "Flexible pickup",
    description:
      "Canister vacuum cleaner, 700 W, bagless with a 1.5 l dust container. Hose 1.8 m, telescopic tube, floor and crevice nozzles included. The filter was cleaned on 10 November and the cable is 5 m long. Runs normally; the right wheel squeaks slightly.",
  },
  {
    id: "demo-v1-10",
    illustration: "living-room-sofa",
    title: "Living room sofa",
    price: 220,
    seller: "Sofia",
    place: at(triaudes),
    distance: 8.3,
    condition: "Good",
    dimensions: "185 × 90 × 80 cm",
    available: "Weekend pickup",
    status: "reserved",
    description:
      "Grand canapé jaune moutarde, trois places. The cushions are firm and nothing is broken. Two people needed to carry it, no stairs.",
  },
  {
    id: "demo-v3-3",
    illustration: "yoga-mat",
    title: "Yoga mat",
    price: 10,
    seller: "Sofia",
    place: lausanneCentre,
    distance: 4.9,
    condition: "Good",
    dimensions: "183 × 61 cm · 6 mm",
    available: "Flexible pickup",
    status: "sold",
    description:
      "Tapis de yoga bleu, 6 mm thick so it's easy on the knees. Used for a year and cleaned every week. Strap included.",
  },
  {
    id: "demo-v1-11",
    illustration: "small-reading-lamp",
    title: "Small reading lamp",
    price: 10,
    seller: "Léa",
    place: at(vortex),
    distance: 3.7,
    condition: "Used",
    dimensions: "Height 38 cm",
    available: "Flexible pickup",
    status: "sold",
    description:
      "Small table lamp with a ceramic base and a cream shade. Works.",
  },
];

export const demoListings: Product[] = specs.map(demoListing);

export function addDemoListings(current: Product[]): Product[] {
  const ids = new Set(current.map((item) => item.id));
  return [...current, ...demoListings.filter((item) => !ids.has(item.id))];
}
