/** Thousands written with a separator, as in 1,250, 1'250 or 1 250. */
const GROUPED = /^\d{1,3}(?:[,'’ ]\d{3})+(?:\.\d{1,2})?$/;

/** A price as the app writes it everywhere, such as 1,250. */
export const priceText = (price: number) => price.toLocaleString("en-GB");

/** A typed price as a plain number: 1,250 and 1'250 become 1250, 12,50 becomes 12.50. */
export function plainPrice(text: string): string {
  const typed = text.trim();
  return GROUPED.test(typed)
    ? typed.replace(/[,'’ ]/g, "")
    : typed.replace(",", ".");
}
