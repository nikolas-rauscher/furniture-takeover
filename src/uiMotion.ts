export function motionBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

/**
 * A new value or state settles in place of the last one, which leaves at once, so a
 * change never shows an empty gap. Shared by the deal card, the offer editor and Pako's tray.
 */
export const SETTLE_IN_PLACE = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 34 },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.1 } },
} as const;
