import type { KeyboardEvent } from "react";

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

/** The controls Tab visits inside a container, in document order. */
function tabbableIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      !element.closest("[inert]") &&
      element.checkVisibility(),
  );
}

/**
 * Tab and Shift+Tab wrap around a dialog's controls right away. The dialog's own focus
 * guards only bring focus back on the next frame, which a quick second Tab slips past.
 */
export function wrapTabInDialog(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const tabbable = tabbableIn(event.currentTarget);
  if (!tabbable.length) return;
  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];
  const focused = document.activeElement;
  const leaving = event.shiftKey
    ? focused === first || focused === event.currentTarget
    : focused === last;
  if (!leaving) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}
