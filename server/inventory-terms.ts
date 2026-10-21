/** Small marketplace vocabulary, shared by candidate queries and listing titles. */
const aliases: Record<string, string> = {
  buch: "book",
  bucher: "book",
  tagebuch: "book",
  livre: "book",
  kinderbuch: "book",
  children: "kid",
  child: "kid",
  enfant: "kid",
  kinder: "kid",
  kaffee: "espresso",
  coffee: "espresso",
  cafe: "espresso",
  caffee: "espresso",
  kaffe: "espresso",
  kaffeemaschine: "espresso",
  coffeemaker: "espresso",
  spiegel: "mirror",
  speigle: "mirror",
  speigel: "mirror",
  miroir: "mirror",
  stuhl: "chair",
  stuhle: "chair",
  chaise: "chair",
  schreibtisch: "desk",
  bureau: "desk",
  fahrrad: "bicycle",
  velo: "bicycle",
  bike: "bicycle",
};
export function inventoryWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
    .map((word) => aliases[word] ?? word);
}
