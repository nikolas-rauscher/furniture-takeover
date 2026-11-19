/** An amount as sellers write it: 1250, 1,250, 1'250, 12.50 or 12,50. */
export const AMOUNT = String.raw`(?:\d{1,3}(?:[’',]\d{3})+(?!\d)(?:\.\d{1,2})?|\d+(?:[.,]\d+)?)`;
const GROUPED = /^\d{1,3}(?:[’',]\d{3})+(?:\.\d+)?$/;

/** The number an amount stands for: a comma before three digits groups thousands. */
export function amountValue(amount: string): number {
  return Number(
    GROUPED.test(amount)
      ? amount.replace(/[’',]/g, "")
      : amount.replace(",", "."),
  );
}

/** A reply that is only an amount, such as 40 or 1,250. */
export function bareAmount(text: string): number | null {
  const amount = text.trim();
  return new RegExp(String.raw`^${AMOUNT}$`).test(amount)
    ? amountValue(amount)
    : null;
}

/** CHF amounts the way the app shows prices: CHF 1,250 rather than CHF 1250. */
export function appPrices(text: string): string {
  const grouped = (digits: string) => Number(digits).toLocaleString("en-GB");
  return text
    .replace(
      /\bCHF\s?(\d{4,})(?![\d’']|[.,]\d)/gi,
      (_, digits: string) => `CHF ${grouped(digits)}`,
    )
    .replace(
      /(?<![\d.,’'])(\d{4,})\s?CHF\b/gi,
      (_, digits: string) => `${grouped(digits)} CHF`,
    );
}

export function explicitPrice(text: string): number | null {
  const amount = AMOUNT;
  const currency = String.raw`(?:chf|eur|€|francs|franken|euros?)`;
  const asking = text.match(
    new RegExp(
      String.raw`\b(?:asking(?: price)?|selling(?: it)? for|sell(?: it)? for|price|preis)\s*:?\s*(?:${currency}\s*)?(${amount})(?:\s*${currency})?`,
      "i",
    ),
  );
  const monetary = [
    ...text.matchAll(
      new RegExp(
        String.raw`${currency}\s*(${amount})|(${amount})\s*${currency}`,
        "gi",
      ),
    ),
  ];
  // Prefer an explicitly stated per-item amount when the seller also gives a bundle total.
  // Do not calculate a unit price from a total or choose between unlabelled amounts.
  const perItem = text.match(new RegExp(String.raw`(${amount})\s*(?:CHF|francs|franken)\s*(?:per\s+(?:book|item|piece|unit)|each|je\s+(?:Buch|Stück))\b`, "i"));
  const candidate =
    asking?.[1] ?? perItem?.[1] ??
    (monetary.length === 1 &&
    !/\b(?:bought|paid|original(?:ly)?|cost|purchase|retail|gekauft|neupreis)\b/i.test(
      text.slice(0, monetary[0].index),
    )
      ? (monetary[0][1] ?? monetary[0][2])
      : undefined);
  if (
    !candidate &&
    /\b(?:for free|free to collect|giving away|price\s*:\s*free)\b/i.test(text)
  )
    return 0;
  const price = candidate === undefined ? null : amountValue(candidate);
  return price !== null && Number.isFinite(price) && price <= 1_000_000
    ? price
    : null;
}
