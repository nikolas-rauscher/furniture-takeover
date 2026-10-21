export function explicitPrice(text: string): number | null {
  const amount = String.raw`\d+(?:[.,]\d+)?`;
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
  const price =
    candidate === undefined ? null : Number(candidate.replace(",", "."));
  return price !== null && Number.isFinite(price) && price <= 1_000_000
    ? price
    : null;
}
