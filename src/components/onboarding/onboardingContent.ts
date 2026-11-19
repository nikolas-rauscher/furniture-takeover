/** Story, questions and personalization of the first-run intro. Pure data, no UI. */

export const GUIDE_NAME = "Pako";

export type Intent = "sell" | "find" | "both";
export type PlaceId =
  | "epfl"
  | "unil"
  | "vortex"
  | "atrium"
  | "triaudes"
  | "ochettes"
  | "bourdonnette"
  | "lausanne";
export type ItemId =
  "desk" | "chair" | "bed" | "shelf" | "lamp" | "sofa" | "kitchen" | "bike";
/** The three story scenes that explain how takeover works. */
export type Act = "snap" | "ask" | "chat";

export type Answers = { intent?: Intent; place?: PlaceId; items: ItemId[] };
export type CompleteAnswers = {
  intent: Intent;
  place: PlaceId;
  items: [ItemId, ...ItemId[]];
};

export type IntentOption = {
  id: Intent;
  title: string;
  detail: string;
  /** What Pako says once this answer is picked. */
  reaction: string;
};

export const intentOptions: IntentOption[] = [
  {
    id: "sell",
    title: "I'm moving out",
    detail: "Pass on furniture before I leave",
    reaction: "Moving day! Let's find your things a new home.",
  },
  {
    id: "find",
    title: "I'm moving in",
    detail: "Find what my room still needs",
    reaction: "Welcome! Let's get your room set up.",
  },
  {
    id: "both",
    title: "A bit of both",
    detail: "Swapping rooms or upgrading",
    reaction: "The full takeover. I like it.",
  },
];

export type Place = {
  id: PlaceId;
  name: string;
  area: string;
  kind: "campus" | "residence" | "city";
  /** Search area handed to the agent, as shown in the search box. */
  searchArea: string;
  /** Short label of the suggested meeting point, e.g. on a pickup card. */
  meetingPoint: string;
  /** The meeting point inside a sentence: "… at {meetingPhrase}". */
  meetingPhrase: string;
};

export const places: Place[] = [
  {
    id: "epfl",
    name: "EPFL",
    area: "Ecublens",
    kind: "campus",
    searchArea: "EPFL, Ecublens",
    meetingPoint: "Rolex Learning Center",
    meetingPhrase: "the Rolex Learning Center",
  },
  {
    id: "unil",
    name: "UNIL",
    area: "Dorigny",
    kind: "campus",
    searchArea: "UNIL, Dorigny",
    meetingPoint: "UNIL-Mouline metro",
    meetingPhrase: "the UNIL-Mouline metro stop",
  },
  {
    id: "vortex",
    name: "Vortex",
    area: "FMEL · Chavannes",
    kind: "residence",
    searchArea: "FMEL Vortex, Chavannes-près-Renens",
    meetingPoint: "Vortex reception",
    meetingPhrase: "the Vortex reception",
  },
  {
    id: "atrium",
    name: "Atrium",
    area: "FMEL · Ecublens",
    kind: "residence",
    searchArea: "FMEL Atrium, Ecublens",
    meetingPoint: "Atrium entrance",
    meetingPhrase: "the Atrium entrance",
  },
  {
    id: "triaudes",
    name: "Triaudes",
    area: "FMEL · Ecublens",
    kind: "residence",
    searchArea: "FMEL Triaudes, Ecublens",
    meetingPoint: "Triaudes entrance",
    meetingPhrase: "the Triaudes entrance",
  },
  {
    id: "ochettes",
    name: "Ochettes",
    area: "FMEL · Chavannes",
    kind: "residence",
    searchArea: "FMEL Ochettes, Chavannes-près-Renens",
    meetingPoint: "Ochettes entrance",
    meetingPhrase: "the Ochettes entrance",
  },
  {
    id: "bourdonnette",
    name: "Bourdonnette",
    area: "FMEL · Lausanne",
    kind: "residence",
    searchArea: "FMEL Bourdonnette, Lausanne",
    meetingPoint: "Bourdonnette entrance",
    meetingPhrase: "the Bourdonnette entrance",
  },
  {
    id: "lausanne",
    name: "Lausanne",
    area: "Elsewhere in town",
    kind: "city",
    searchArea: "Lausanne",
    meetingPoint: "Lausanne-Flon",
    meetingPhrase: "Lausanne-Flon",
  },
];

export type Condition = "Good" | "Very good" | "Used";

export type Item = {
  id: ItemId;
  label: string;
  /** The item inside a request: "a desk". */
  phrase: string;
  /** A typical student budget in CHF, used for the example search. */
  budget: number;
  /** The illustrative listing the story revolves around. */
  listing: {
    title: string;
    price: number;
    condition: Condition;
    size: string;
    description: string;
  };
  /** Titles of two further offers the agent finds elsewhere. */
  alternatives: [string, string];
  /** Opening offer and agreed price in the story's negotiation. */
  offer: number;
  deal: number;
};

export const items: Item[] = [
  {
    id: "desk",
    label: "Desk",
    phrase: "a desk",
    budget: 50,
    listing: {
      title: "White study desk",
      price: 40,
      condition: "Good",
      size: "120 × 60 cm",
      description:
        "Sturdy white desk with a drawer. A few light marks on the top, fits any student room.",
    },
    alternatives: ["Desk with drawers", "Large work desk"],
    offer: 30,
    deal: 35,
  },
  {
    id: "chair",
    label: "Chair",
    phrase: "a comfy chair",
    budget: 35,
    listing: {
      title: "Reading armchair",
      price: 30,
      condition: "Very good",
      size: "70 × 75 × 85 cm",
      description:
        "Soft grey armchair without stains. Makes any corner a reading corner.",
    },
    alternatives: ["Office chair", "Wooden chair"],
    offer: 20,
    deal: 25,
  },
  {
    id: "bed",
    label: "Bed",
    phrase: "a single bed",
    budget: 80,
    listing: {
      title: "Single bed frame",
      price: 60,
      condition: "Good",
      size: "90 × 200 cm",
      description:
        "Pine bed frame with slats, easy to take apart. Mattress not included.",
    },
    alternatives: ["Bed with storage", "Loft bed"],
    offer: 45,
    deal: 50,
  },
  {
    id: "shelf",
    label: "Shelf",
    phrase: "a bookshelf",
    budget: 35,
    listing: {
      title: "Tall bookshelf",
      price: 25,
      condition: "Good",
      size: "80 × 30 × 180 cm",
      description:
        "Five solid shelves. Already taken apart, so it fits in a small car.",
    },
    alternatives: ["Small shelf", "Cube shelf"],
    offer: 15,
    deal: 20,
  },
  {
    id: "lamp",
    label: "Lamp",
    phrase: "a desk lamp",
    budget: 15,
    listing: {
      title: "Desk lamp",
      price: 12,
      condition: "Very good",
      size: "Height 42 cm",
      description:
        "Adjustable desk lamp with a warm LED bulb. Works perfectly.",
    },
    alternatives: ["Clip-on lamp", "Floor lamp"],
    offer: 8,
    deal: 10,
  },
  {
    id: "sofa",
    label: "Sofa",
    phrase: "a small sofa",
    budget: 100,
    listing: {
      title: "Two-seat sofa",
      price: 90,
      condition: "Good",
      size: "165 × 85 cm",
      description: "Comfy dark blue two-seater with washable covers.",
    },
    alternatives: ["Sofa bed", "Corner sofa"],
    offer: 70,
    deal: 80,
  },
  {
    id: "kitchen",
    label: "Kitchen",
    phrase: "kitchen basics",
    budget: 25,
    listing: {
      title: "Kitchen starter kit",
      price: 20,
      condition: "Good",
      size: "3 pans, 2 pots, utensils",
      description:
        "Everything for your first pasta night: pans, pots and utensils.",
    },
    alternatives: ["Kettle and toaster", "Cutlery set"],
    offer: 12,
    deal: 15,
  },
  {
    id: "bike",
    label: "Bike",
    phrase: "a city bike",
    budget: 150,
    listing: {
      title: "City bike",
      price: 120,
      condition: "Good",
      size: "Frame 54 cm",
      description:
        "Reliable city bike with lights and a lock. Serviced last spring.",
    },
    alternatives: ["Road bike", "Folding bike"],
    offer: 90,
    deal: 100,
  },
];

function byId<T extends { id: string }>(list: T[], id: T["id"]): T {
  const found = list.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown intro option "${id}".`);
  return found;
}

export const placeById = (id: PlaceId) => byId(places, id);
/** How Pako names a search area: an intro place by its own name, any other area by its first part. */
export const placeName = (searchArea: string) =>
  places.find((place) => place.searchArea === searchArea)?.name ??
  searchArea.split(",")[0].trim();
export const itemById = (id: ItemId) => byId(items, id);
export const intentById = (id: Intent) => byId(intentOptions, id);

export function isComplete(answers: Answers): answers is CompleteAnswers {
  return Boolean(answers.intent && answers.place && answers.items.length > 0);
}

/** The scene for the visitor's own goal comes first; the other side follows. */
export function storyActs(intent: Intent): Act[] {
  return intent === "sell" ? ["snap", "chat", "ask"] : ["ask", "chat", "snap"];
}

export type ActCopy = { title: string; text: string };

export function actCopy(act: Act, intent: Intent): ActCopy {
  const selling = intent === "sell";
  if (act === "snap")
    return selling
      ? {
          title: "Just take photos",
          text: "Snap what's left in your room. I write the title, description and price. You only tap Publish.",
        }
      : {
          title: "And when you move out…",
          text: "…just take a photo. I write the listing and suggest a price. You only tap Publish.",
        };
  if (act === "ask")
    return selling
      ? {
          title: "And when you need something…",
          text: "…just tell me in your own words. I search student listings and other second-hand sites, then show you the best offers.",
        }
      : {
          title: "Just say what you need",
          text: "Write it like a message to a friend. I search student listings and other second-hand sites and compare them for you.",
        };
  return selling
    ? {
        title: "I answer the buyers",
        text: "When someone wants your things, I agree on a price and set a pickup time and place. You just confirm.",
      }
    : {
        title: "I handle the messages",
        text: "Price, pickup time, meeting point: I sort it out with the seller. You just confirm.",
      };
}

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

/** A first request in the visitor's own words: up to two picked items within a student budget. */
export function exampleSearch(selected: ItemId[]): string {
  if (selected.length === 0)
    throw new Error("An example search needs at least one item.");
  const chosen = selected.slice(0, 2).map(itemById);
  const budget =
    Math.ceil(chosen.reduce((sum, item) => sum + item.budget, 0) / 10) * 10;
  const wanted = chosen.map((item) => item.phrase).join(" and ");
  return `${capitalize(wanted)} under CHF ${budget}`;
}

export function searchSteps(placeId: PlaceId): string[] {
  return [
    `Searching student listings near ${placeById(placeId).name}`,
    "Checking other second-hand sites",
    "Comparing price, condition and distance",
  ];
}

export type Offer = {
  title: string;
  price: number;
  distanceKm: number;
  condition: Condition;
  source: "takeover" | "Ricardo" | "Anibis";
  best: boolean;
};

const roundPrice = (price: number) =>
  price < 20 ? Math.round(price) : Math.round(price / 5) * 5;

/** The story's best match is the student listing; two pricier offers come from other sites. */
export function offersFor(itemId: ItemId): Offer[] {
  const { listing, alternatives } = itemById(itemId);
  return [
    {
      title: listing.title,
      price: listing.price,
      distanceKm: 0.4,
      condition: listing.condition,
      source: "takeover",
      best: true,
    },
    {
      title: alternatives[0],
      price: roundPrice(listing.price * 1.4),
      distanceKm: 2.1,
      condition: "Very good",
      source: "Anibis",
      best: false,
    },
    {
      title: alternatives[1],
      price: roundPrice(listing.price * 2),
      distanceKm: 4.6,
      condition: "Used",
      source: "Ricardo",
      best: false,
    },
  ];
}

export type ChatLine = { from: "pako" | "partner"; text: string };
export type ChatScene = {
  /** Selling: a buyer writes to you. Otherwise: Pako writes to a seller. */
  role: "buyer" | "seller";
  partner: { name: string; initial: string; detail: string };
  lines: ChatLine[];
  deal: {
    title: string;
    price: number;
    time: string;
    meetingPoint: string;
  };
};

export const PICKUP_TIME = "Thu, 18:00";

export function chatScene(
  intent: Intent,
  itemId: ItemId,
  placeId: PlaceId,
): ChatScene {
  const { listing, offer, deal } = itemById(itemId);
  const place = placeById(placeId);
  const thing = listing.title.toLowerCase();
  const pickup = `Thursday at 18:00 at ${place.meetingPhrase}`;
  const terms = {
    title: listing.title,
    price: deal,
    time: PICKUP_TIME,
    meetingPoint: place.meetingPoint,
  };
  if (intent === "sell")
    return {
      role: "seller",
      partner: { name: "Sam", initial: "S", detail: `Wants your ${thing}` },
      lines: [
        {
          from: "partner",
          text: `Hi! Is your ${thing} still available? Could I get it for CHF ${offer}?`,
        },
        { from: "pako", text: `Hi Sam! It is. CHF ${deal} and it's yours.` },
        { from: "partner", text: "Deal! When can I pick it up?" },
        { from: "pako", text: `How about ${pickup}?` },
        { from: "partner", text: "Perfect, see you then!" },
      ],
      deal: terms,
    };
  return {
    role: "buyer",
    partner: {
      name: "Léa",
      initial: "L",
      detail: `${listing.title} · CHF ${listing.price}`,
    },
    lines: [
      {
        from: "pako",
        text: `Hi Léa! Is the ${thing} still available? Would CHF ${offer} work?`,
      },
      { from: "partner", text: `Hi! Yes, it is. I could do CHF ${deal}.` },
      {
        from: "pako",
        text: `Deal, CHF ${deal}. Could you do ${pickup}?`,
      },
      { from: "partner", text: "Perfect, see you Thursday!" },
    ],
    deal: terms,
  };
}

export type DoneCopy = { title: string; text: string };

export function doneCopy(answers: CompleteAnswers): DoneCopy {
  const place = placeById(answers.place);
  return answers.intent === "sell"
    ? {
        title: "You're all set!",
        text: `Let's list your first thing at ${place.name}. All it takes is a photo.`,
      }
    : {
        title: "You're all set!",
        text: `Your first search is ready. I'll start looking around ${place.name}.`,
      };
}
