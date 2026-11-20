import type { StudyOption } from "./tourScript.ts";

/** A random number in [0, 1), as Math.random returns it; tests pass a fixed sequence. */
export type RandomSource = () => number;

/** Fisher–Yates on a copy. */
function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/** Shuffles the options; those marked "always last" keep their place below, in order. */
export function shuffleOptions(
  options: readonly StudyOption[],
  random: RandomSource = Math.random,
): StudyOption[] {
  const movable = options.filter((option) => !option.last);
  const fixed = options.filter((option) => option.last);
  return [...shuffled(movable, random), ...fixed];
}

/** Puts options back into a stored order of ids. */
export function orderOptions(
  options: readonly StudyOption[],
  ids: readonly string[],
): StudyOption[] {
  return ids.map((id) => {
    const match = options.find((option) => option.id === id);
    if (!match) throw new Error(`No option ${id} to show.`);
    return match;
  });
}

/** Picking an exclusive option clears the others; picking another clears the exclusive ones. */
export function toggleOption(
  options: readonly StudyOption[],
  chosen: readonly string[],
  id: string,
): string[] {
  if (chosen.includes(id)) return chosen.filter((current) => current !== id);
  const exclusive = new Set(
    options.filter((option) => option.exclusive).map((option) => option.id),
  );
  if (exclusive.has(id)) return [id];
  return [...chosen.filter((current) => !exclusive.has(current)), id];
}
