import type { AgentListingPatchEvent } from "../shared/actions.ts";
import type { AgentRunSource } from "../shared/runs.ts";

function chfAmounts(text: string) {
  const amount = String.raw`(\d{1,3}(?:[’',. ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
  // In "MacBook 2020 CHF 400", CHF belongs to the following amount.
  const currency = new RegExp(
    String.raw`\b(?:CHF|Fr\.?)\s*${amount}|${amount}\s*CHF\b(?!\s*\d)`,
    "gi",
  );
  return [...text.matchAll(currency)].map((match) => ({
    price: Number(
      (match[1] ?? match[2])
        .replace(/[’' ]|[.,](?=\d{3}(?:\D|$))/g, "")
        .replace(",", "."),
    ),
    index: match.index,
    length: match[0].length,
  }));
}

export function chfPrices(text: string): number[] {
  return chfAmounts(text)
    .map(({ price }) => price)
    .filter((price) => Number.isFinite(price) && price >= 0 && price <= 10_000);
}

const NOT_AN_ASKING_PRICE =
  /\b(?:sold|retail|original price|originally|new price|previous price|starting (?:bid|price)|start(?:ing)? at|auction start|startpreis|startgebot|neupreis|verkauft|vendu|prix neuf|mise à prix)\b/i;
/** A cost beside the item's price: "Shipping: CHF 9", or Ricardo's "Retrait par l'acheteur à 1012 Lausanne, CHF 0.00". */
const INCIDENTAL_COST =
  /(?:\b(?:shipping|postage|deposit|delivery|versand(?:kosten)?|port|livraison)\s*[:=]?\s*|\b(?:retrait par l['’]acheteur|abholung durch (?:den )?käufer|pickup by (?:the )?buyer)\b[^·|]*,\s*)$/i;

type AskingPrice = { price: number; quote: string } | { rejection: string };

/** A source's one fixed CHF asking price with its surrounding quote, or why it can't anchor a price. */
export function askingPriceOf(source: AgentRunSource): AskingPrice {
  if (NOT_AN_ASKING_PRICE.test(source.title + " " + source.snippet))
    return {
      rejection:
        "Use fixed asking prices, excluding auction starts, retail and sold prices.",
    };
  const amounts = [source.title, source.snippet].flatMap((part) =>
    chfAmounts(part).map((amount) => ({ ...amount, part })),
  );
  const itemAmounts = amounts.filter(
    ({ part, index }) => !INCIDENTAL_COST.test(part.slice(0, index)),
  );
  if (amounts.length && !itemAmounts.length)
    return { rejection: "Use the asking price of the item itself." };
  const first = itemAmounts[0];
  if (
    !first ||
    first.price <= 0 ||
    first.price > 10_000 ||
    itemAmounts.some(({ price }) => price !== first.price)
  )
    return {
      rejection:
        "Choose an offer with one unambiguous positive CHF asking price.",
    };
  const quote = first.part
    .slice(Math.max(0, first.index - 100), first.index + first.length + 100)
    .trim();
  return { price: first.price, quote };
}

const NEW_OFFER =
  /\b(?:brand new|factory sealed|new (?:item|stock)|condition[: ]+new|(?:article|produit|[ée]tat)\s*:?\s*neu[fv]e?|(?:zustand\s*:?\s*neu|fabrikneu|neuware|originalverpackt))\b/i;
const USED_OFFER =
  /\b(?:used|second[ -]?hand|pre[ -]?owned|d['’]occasion|gebraucht(?:e[rmns]?)?|seconda mano|usat[oa])\b/i;

type ComparableOffer = {
  source: AgentRunSource;
  price: number;
  quote: string;
  used: boolean;
  url: string;
  words: Set<string>;
};

function comparableOffer(source: AgentRunSource): ComparableOffer | undefined {
  const text = `${source.title} ${source.snippet}`;
  if (NEW_OFFER.test(text)) return;
  const asking = askingPriceOf(source);
  if ("rejection" in asking) return;
  const url = new URL(source.url);
  return {
    source,
    ...asking,
    used: USED_OFFER.test(text),
    url: url.hostname + url.pathname.replace(/\/$/, ""),
    words: new Set(
      text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .match(/[\p{L}\p{N}]+/gu),
    ),
  };
}

function sameOffer(a: ComparableOffer, b: ComparableOffer) {
  if (a.url === b.url) return true;
  if (a.price !== b.price || Math.min(a.words.size, b.words.size) < 6)
    return false;
  const shared = [...a.words].filter((word) => b.words.has(word)).length;
  return shared / (a.words.size + b.words.size - shared) >= 0.8;
}

/** A gap above 3× separates price groups. Only a majority can anchor a price. */
function typicalOffers(offers: ComparableOffer[]) {
  const groups: ComparableOffer[][] = [];
  for (const offer of [...offers].sort((a, b) => a.price - b.price)) {
    const group = groups.at(-1);
    if (group && offer.price <= group.at(-1)!.price * 3) group.push(offer);
    else groups.push([offer]);
  }
  const typical = groups.find((group) => group.length > offers.length / 2);
  return offers.filter((offer) => typical?.includes(offer)).slice(0, 4);
}

/** The median asking price of distinct comparable second-hand offers, in whole francs. */
export function researchedProposal(
  sources: AgentRunSource[],
  offerSourceIds: Set<string>,
  id: string,
): AgentListingPatchEvent | undefined {
  const candidates = sources
    .filter((source) => offerSourceIds.has(source.id))
    .map(comparableOffer)
    .filter((offer) => offer !== undefined);
  const used = candidates.filter((offer) => offer.used);
  const unique: ComparableOffer[] = [];
  for (const offer of used.length ? used : candidates) {
    if (!unique.some((previous) => sameOffer(offer, previous)))
      unique.push(offer);
  }
  const comparable = typicalOffers(unique);
  if (comparable.length < (used.length ? 1 : 2)) return;

  const prices = comparable.map(({ price }) => price).sort((a, b) => a - b);
  const price = Math.round(
    (prices[Math.floor((prices.length - 1) / 2)] +
      prices[Math.floor(prices.length / 2)]) /
      2,
  );
  const citations = comparable.map(({ source }) => `[${source.id}]`).join(" ");
  const basis =
    prices.length === 1
      ? "one used offer. Treat it as a starting point."
      : `the median of ${prices.length} ${used.length ? "used " : ""}offers asking CHF ${prices[0]}–${prices.at(-1)}.`;
  return {
    type: "listing_patch",
    id,
    patch: { price },
    requiresAcceptance: true,
    evidence: comparable.map(({ source, quote }) => ({
      kind: "source",
      sourceId: source.id,
      quote,
    })),
    reason: `Suggested CHF ${price} based on ${basis} ${citations}`,
  };
}
