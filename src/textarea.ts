/** Fit text and placeholders before showing a scrollbar for genuinely long drafts. */
export function fitTextarea(element: HTMLTextAreaElement, limit = Infinity) {
  const style = getComputedStyle(element);
  const maximum = Math.min(limit, parseFloat(style.maxHeight) || Infinity);
  const minimum = parseFloat(style.minHeight) || 0;
  const border =
    parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  element.style.height = "auto";
  const needed = element.scrollHeight + border;
  element.style.height = `${Math.max(minimum, Math.min(needed, maximum))}px`;
  element.style.overflowY = needed > maximum + 1 ? "auto" : "hidden";
}
