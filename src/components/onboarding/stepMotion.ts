import type { Variants } from "motion/react";

/** Steps slide in the direction of travel; the very first one rises in. */
export const stepMotion: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 48,
    y: direction === 0 ? 16 : 0,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -32,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
  }),
};
/** With reduced motion a step swaps in place: the old one goes at once, the new one fades in. */
export const stepFade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0 } },
};
