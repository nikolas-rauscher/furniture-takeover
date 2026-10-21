// Optional free-form labels on legacy listings; users never choose from a taxonomy.
export type Category = string;
export type Source = "takeover" | "Ricardo" | "Anibis";
export type Product = {
  id: string;
  title: string;
  tags?: string[];
  price: number;
  category: Category;
  image: string;
  images?: string[];
  /** Provenance of an externally hosted seller photograph. */
  photoSourceUrl?: string;
  pickupPoint?: {
    name: string;
    address: string;
    area: string;
    sourceUrl: string;
  };
  location: string;
  /** Legacy/demo value; no search origin or verified coordinates are available. */
  distance: number;
  condition: string;
  dimensions: string;
  source: Source;
  seller: string;
  initials: string;
  description: string;
  available: string;
  pickupBy: string;
  status: "active" | "reserved" | "sold" | "withdrawn";
  own?: boolean;
  demo?: boolean;
};
export type Criteria = {
  category: Category;
  maxPrice: number;
  radius: number;
  pickup: string;
  query: string;
  condition: string;
  source: string;
};
export type SearchJob = {
  id: string;
  title: string;
  criteria: Criteria;
  paused: boolean;
  seen: boolean;
};
export const defaults: Criteria = {
  category: "All",
  maxPrice: 500,
  radius: 20,
  pickup: "",
  query: "",
  condition: "All",
  source: "All",
};
export const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Zurich",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const amountPattern = String.raw`\d+(?:[.,]\d+)?`;
const currencyPattern = String.raw`(?:chf|eur|€|francs|franken|euros?)`;
const budgetPrefix = String.raw`(?:under|below|up to|no more than|at most|max(?:imum)?|budget(?: of)?|unter|bis)`;
const distancePattern = String.raw`(?:(?:within(?: a radius of)?|up to|under|radius(?: of)?|bis|maximal|max(?:imum)?)\s*)?${amountPattern}\s*km\b(?:\s*(?:away|entfernt))?`;
const weekdayPattern =
  "monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag";
const datePattern = String.raw`(?:\d{4}-\d{2}-\d{2}|(?:(?:next|this|nachsten|nächsten|diesen)\s+)?(?:${weekdayPattern})|today|tomorrow|heute|morgen|this weekend|the weekend|weekend|this week|diese woche|wochenende)`;
const pickupPattern = String.raw`(?:(?:ready to\s+)?(?:pickup|pick up|collection|collect|abholung)\s*)?(?:(?:by|on|before|bis|am)\s+)?(?:${datePattern})\b`;
const flexiblePickupPattern = String.raw`(?:pickup(?: date)?|collection|date|abholung)\s*(?:is\s*)?flexible|flexible(?:\s+(?:pickup|collection|date))?|any\s+(?:pickup\s+)?date|no\s+(?:pickup\s+)?deadline`;
const anyBudgetPattern = String.raw`any budget|any price|no\s+(?:budget|price)\s+limit|budget doesn't matter`;

export function parsePickupDate(
  text: string,
  today = TODAY,
): string | undefined {
  const q = normalize(text);
  if (new RegExp(String.raw`\b(?:${flexiblePickupPattern})\b`, "i").test(q))
    return "";
  const explicit = q.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (explicit)
    return !Number.isNaN(Date.parse(explicit)) &&
      new Date(explicit).toISOString().slice(0, 10) === explicit
      ? explicit
      : undefined;
  const anchor = new Date(`${today}T12:00:00Z`);
  if (Number.isNaN(anchor.getTime())) return undefined;
  const dateAfter = (offset: number) => {
    const value = new Date(anchor);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  if (/\b(?:today|heute)\b/.test(q)) return today;
  if (/\b(?:tomorrow|morgen)\b/.test(q)) return dateAfter(1);
  const days = [
    ["monday", "montag"],
    ["tuesday", "dienstag"],
    ["wednesday", "mittwoch"],
    ["thursday", "donnerstag"],
    ["friday", "freitag"],
    ["saturday", "samstag"],
    ["sunday", "sonntag"],
  ];
  const dayMatch = q.match(
    new RegExp(
      String.raw`\b(?:(next|this|nachsten|diesen)\s+)?(${weekdayPattern})\b`,
    ),
  );
  const weekday = (anchor.getUTCDay() + 6) % 7;
  if (dayMatch) {
    const target = days.findIndex((names) => names.includes(dayMatch[2]));
    const offset = /^(?:next|nachsten)$/.test(dayMatch[1] ?? "")
      ? 7 - weekday + target
      : (target - weekday + 7) % 7;
    return dateAfter(offset);
  }
  if (
    /\b(?:this week|this weekend|the weekend|weekend|diese woche|wochenende)\b/.test(
      q,
    )
  )
    return dateAfter(6 - weekday);
  return undefined;
}

export function extractSearchConstraints(
  text: string,
  today = TODAY,
): { maxPrice?: number; radius?: number; pickup?: string } {
  const q = normalize(text);
  const withoutDistance = q.replace(new RegExp(distancePattern, "gi"), "");
  const match =
    withoutDistance.match(
      new RegExp(String.raw`${currencyPattern}\s*(${amountPattern})`, "i"),
    ) ??
    withoutDistance.match(
      new RegExp(String.raw`(${amountPattern})\s*${currencyPattern}`, "i"),
    ) ??
    withoutDistance.match(
      new RegExp(String.raw`${budgetPrefix}\s*:?\s*(${amountPattern})`, "i"),
    );
  const radiusMatch = q.match(
    new RegExp(String.raw`(${amountPattern})\s*km\b`, "i"),
  );
  const validAmount = (value: string | undefined, max: number) => {
    const parsed =
      value === undefined ? undefined : Number(value.replace(",", "."));
    return parsed !== undefined &&
      Number.isFinite(parsed) &&
      parsed >= 0 &&
      parsed <= max
      ? parsed
      : undefined;
  };
  const maxPrice = new RegExp(
    String.raw`\b(?:${anyBudgetPattern})\b`,
    "i",
  ).test(q)
    ? 1_000_000
    : validAmount(match?.[1], 1_000_000);
  const radius = validAmount(radiusMatch?.[1], 500);
  const pickup = parsePickupDate(text, today);
  return {
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(pickup !== undefined ? { pickup } : {}),
  };
}

export function parseSearch(
  text: string,
  base: Criteria = defaults,
  today = TODAY,
): Criteria {
  const constraints = extractSearchConstraints(text, today);
  const conditionMatch = text.match(
    /\b(?:in\s+)?(very good|good|used)\s+condition\b|\bcondition\s*:\s*(very good|good|used)\b/i,
  );
  const conditionText = conditionMatch?.[1] ?? conditionMatch?.[2];
  const condition = conditionText
    ? conditionText[0].toUpperCase() + conditionText.slice(1).toLowerCase()
    : base.condition;
  const sourceMatch = text.match(
    /\b(?:on|from|source\s*:)\s*(takeover|ricardo|anibis|tutti|petitesannonces|kleinanzeigen|ebay)\b/i,
  );
  const sourceNames: Record<string, string> = {
    takeover: "takeover",
    ricardo: "Ricardo",
    anibis: "Anibis",
    tutti: "Tutti",
    petitesannonces: "Petitesannonces",
    kleinanzeigen: "Kleinanzeigen",
    ebay: "eBay",
  };
  const source = sourceMatch
    ? sourceNames[sourceMatch[1].toLowerCase()]
    : base.source;
  const itemQuery = text
    .replace(
      /\b(?:i am looking for|i need|i want|looking for|search for|find me|find|show me|ich suche|ich brauche|suche nach|suche|finde mir|einen|eine|ein|a|an)\b/gi,
      "",
    )
    .replace(new RegExp(distancePattern, "gi"), "")
    .replace(
      new RegExp(
        String.raw`(?:(?:${budgetPrefix}|for|at|fur|für)\s*:?\s*)?(?:${currencyPattern}\s*${amountPattern}|${amountPattern}\s*${currencyPattern})`,
        "gi",
      ),
      "",
    )
    .replace(
      new RegExp(String.raw`${budgetPrefix}\s*:?\s*${amountPattern}`, "gi"),
      "",
    )
    .replace(new RegExp(pickupPattern, "gi"), "")
    .replace(
      new RegExp(
        String.raw`\b(?:${flexiblePickupPattern}|${anyBudgetPattern})\b`,
        "gi",
      ),
      "",
    )
    .replace(
      /\b(?:in\s+)?(?:very good|good|used)\s+condition\b|\bcondition\s*:\s*(?:very good|good|used)\b/gi,
      "",
    )
    .replace(
      /\b(?:on|from|source\s*:)\s*(?:takeover|ricardo|anibis|tutti|petitesannonces|kleinanzeigen|ebay)\b/gi,
      "",
    )
    .replace(/\b(?:for my room|nearby|near me|please|bitte)\b/gi, "")
    .replace(/[,;.!]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:and|or|with)\s+|\s+(?:and|or|with)$/gi, "")
    .trim();
  const clearItem =
    /^(?:all furniture|all|everything|anything|furniture|moving|alle mobel|mobel|einzug|umzug|alles)$/.test(
      normalize(itemQuery),
    );
  const query = clearItem
    ? ""
    : itemQuery || base.query || (base.category === "All" ? "" : base.category);
  return {
    ...base,
    category: "All",
    maxPrice: constraints.maxPrice ?? base.maxPrice,
    radius: constraints.radius ?? base.radius,
    pickup: constraints.pickup ?? base.pickup,
    query,
    condition,
    source,
  };
}
function queryMatches(product: Product, query: string): boolean {
  const aliases: Record<string, string> = {
    schreibtisch: "desk",
    schreibtische: "desk",
    lernplatz: "desk",
    arbeitsplatz: "desk",
    stuhl: "chair",
    stuhle: "chair",
    sessel: "armchair",
    hocker: "stool",
    couch: "sofa",
    regal: "shelf",
    regale: "shelf",
    shelves: "shelf",
    bookshelf: "shelf",
    bookcase: "shelf",
    lampe: "lamp",
    lampen: "lamp",
    licht: "lamp",
    lighting: "lamp",
  };
  const words = (value: string) =>
    normalize(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map(
        (word) =>
          aliases[word] || (word.length > 3 ? word.replace(/s$/, "") : word),
      );
  // The listing's identity comes from its title and optional legacy label.
  // Descriptions can mention accessories or other items that are not for sale.
  const haystack = words(`${product.title} ${product.category}`);
  const queryWords = words(query);
  return (
    queryWords.length > 0 && queryWords.every((word) => haystack.includes(word))
  );
}
export function listingTitle(notes: string): string {
  const first = notes
    .split(/[,;\n.!]/)[0]
    .replace(
      /^(?:i am selling|i'm selling|selling|for sale|verkaufe)\s+(?:my\s+|a\s+|an\s+)?/i,
      "",
    )
    .replace(/\b(?:under|below|up to|for|at)\s+(?:(?:chf|eur)\s*)?\d.*$/i, "")
    .replace(/(?:\b(?:chf|eur|pickup|collection)\b|€)\s*.*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trim();
  return first
    ? (first[0].toUpperCase() + first.slice(1)).slice(0, 90)
    : "Furniture for sale";
}
export function filterProducts(items: Product[], c: Criteria): Product[] {
  return items.filter(
    (p) =>
      p.status !== "withdrawn" &&
      (c.category === "All" ||
        p.category === c.category ||
        queryMatches(p, c.category)) &&
      p.price <= c.maxPrice &&
      // Legacy distances have no origin and cannot prove a radius match.
      // Local results are displayed with an explicit unverified-distance label.
      (c.source === "All" || p.source === c.source) &&
      (c.condition === "All" || p.condition === c.condition) &&
      (!c.pickup || p.pickupBy <= c.pickup) &&
      (!c.query || queryMatches(p, c.query)),
  );
}
export function criteriaTitle(c: Criteria) {
  return `${c.category === "All" ? c.query || "Furniture" : c.category} under CHF ${c.maxPrice}`;
}
export function shortDate(value: string) {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "Flexible";
}
export const money = (value: number) => `CHF ${value.toLocaleString("en-GB")}`;

// Keep existing saved searches usable after the interface language change.
export function migrateSaved<T>(value: T): T {
  const labels: Record<string, string> = {
    Alle: "All",
    Schreibtische: "Desks",
    Stühle: "Chairs",
    Regale: "Shelves",
    Lampen: "Lamps",
    "Sehr gut": "Very good",
    Gut: "Good",
    Gebraucht: "Used",
    "Ein Schreibtisch fürs neue Zimmer": "Desk for my room",
    "Noch nicht angegeben": "Not specified",
  };
  function visit(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item).map(([key, v]) => [
          key,
          typeof v === "string" &&
          ["category", "source", "condition", "title", "dimensions"].includes(
            key,
          )
            ? (labels[v] ?? v)
            : visit(v),
        ]),
      );
    return item;
  }
  return visit(value) as T;
}
