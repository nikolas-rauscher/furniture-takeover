import type { Product } from "./marketplace.ts";

// Language and listing boilerplate, never a product taxonomy. Matching uses the
// supplied title, free-form tags and description, not categories or seed IDs.
const stopWords = new Set(
  "a an and are as at be been by can for from has have in is it its of on or our that the their these this to used was with you your der die das ein eine einer und oder mit fur des les une un et pour dans avec demo sample listing fictional testing price pickup seller reply details condition good excellent collection available chf cm not specified item model photo original source example examples cannot marketplace location dimensions asking referenced actual offer".split(
    " ",
  ),
);

function terms(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[\p{L}]{3,}/gu) ?? []
  )
    .filter((word) => !stopWords.has(word))
    .map((word) =>
      word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word,
    );
}

function features(item: Product) {
  const weights = new Map<string, number>();
  const primary = new Set(
    terms(`${item.title} ${(item.tags ?? []).join(" ")}`),
  );
  // Presentation notices and provenance must not create artificial similarity.
  const description = item.description
    .split(
      /\n\n(?:Sample listing for testing|SYNTHETIC DEMO)|Photo referenced from an actual marketplace listing/i,
    )[0]
    .replace(/https?:\/\/\S+/g, "");
  for (const [text, weight] of [
    [item.title, 3],
    [(item.tags ?? []).join(" "), 3],
    [description, 1],
  ] as const) {
    for (const term of new Set(terms(text)))
      weights.set(term, (weights.get(term) ?? 0) + weight);
  }
  return { weights, primary };
}

/** Conservative catalog text relevance; price only ranks already relevant items. */
export function relatedListings(
  selected: Product,
  catalog: readonly Product[],
  limit = 3,
): Product[] {
  if (!Number.isFinite(limit) || limit < 1) return [];
  const unique = new Map<string, Product>();
  for (const item of catalog) {
    if (
      item.id !== selected.id &&
      item.status === "active" &&
      !unique.has(item.id)
    )
      unique.set(item.id, item);
  }
  const candidates = [...unique.values()];
  const documents = [features(selected), ...candidates.map(features)];
  const frequency = new Map<string, number>();
  for (const document of documents) {
    for (const term of document.weights.keys())
      frequency.set(term, (frequency.get(term) ?? 0) + 1);
  }
  const vectors = documents.map(({ weights }) => {
    const vector = new Map(
      [...weights].map(([term, weight]) => [
        term,
        weight *
          (1 +
            Math.log(
              (documents.length + 1) / ((frequency.get(term) ?? 0) + 1),
            )),
      ]),
    );
    return { vector, magnitude: Math.hypot(...vector.values()) };
  });
  const reference = vectors[0];
  if (!reference.magnitude) return [];
  return candidates
    .map((item, index) => {
      const document = documents[index + 1];
      const candidate = vectors[index + 1];
      const shared = [...reference.vector.keys()].filter((term) =>
        candidate.vector.has(term),
      );
      const primaryMatch = shared.some(
        (term) => documents[0].primary.has(term) || document.primary.has(term),
      );
      const similarity = candidate.magnitude
        ? shared.reduce(
            (total, term) =>
              total + reference.vector.get(term)! * candidate.vector.get(term)!,
            0,
          ) /
          (reference.magnitude * candidate.magnitude)
        : 0;
      // No padding with same-price but unrelated items, nor boilerplate-only matches.
      if (similarity < 0.12 || (!primaryMatch && shared.length < 2))
        return { item, score: 0 };
      const pricesValid =
        Number.isFinite(selected.price) &&
        Number.isFinite(item.price) &&
        selected.price >= 0 &&
        item.price >= 0;
      const priceAffinity = pricesValid
        ? 1 -
          Math.abs(selected.price - item.price) /
            Math.max(selected.price, item.price, 1)
        : 0;
      return { item, score: similarity * (1 + 0.15 * priceAffinity) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, Math.floor(limit))
    .map(({ item }) => item);
}
