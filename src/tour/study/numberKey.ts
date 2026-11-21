/** What a number shortcut needs from a key press. */
type KeyPress = {
  key: string;
  repeat: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
};

/** Whether the key goes to a field the participant types into. */
function typesIntoField(target: EventTarget | null) {
  if (target === null || !("closest" in target)) return false;
  return (
    (target as Element).closest(
      "input, textarea, select, [contenteditable]",
    ) !== null
  );
}

/**
 * The option a number key picks, counting from 1, or null. A held key's repeats,
 * a key with Ctrl, Alt or Meta, a key typed into a field and a number past the
 * last option pick nothing, so one press answers one question at most.
 */
export function numberPick(press: KeyPress, options: number): number | null {
  if (press.repeat || press.altKey || press.ctrlKey || press.metaKey)
    return null;
  if (typesIntoField(press.target)) return null;
  const number = Number(press.key);
  return Number.isInteger(number) && number >= 1 && number <= options
    ? number
    : null;
}
