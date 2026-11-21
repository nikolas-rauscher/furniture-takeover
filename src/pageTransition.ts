import { addTransitionType, startTransition } from "react";
import {
  isPageTransitionEffect,
  type PageTransitionEffect,
} from "./components/animate-ui/components/page-transition";

export type PageDirection = "nav-forward" | "nav-back";

/**
 * Pages glide a short way and fade on the intro's spring, on phones and wide
 * screens alike. In development, `?transition=<effect>` swaps the effect to
 * compare variants.
 */
function defaultEffect(): PageTransitionEffect {
  const requested = new URLSearchParams(window.location.search).get(
    "transition",
  );
  if (!import.meta.env.DEV || requested === null) return "slide";
  if (!isPageTransitionEffect(requested))
    throw new Error(`Unknown page transition "${requested}".`);
  return requested;
}

/**
 * Runs a navigation inside a React transition: only then does the page
 * transition play, in the given direction and with the given effect.
 */
export function transitionPage(
  direction: PageDirection,
  navigate: () => void,
  effect: PageTransitionEffect = defaultEffect(),
) {
  startTransition(() => {
    addTransitionType(direction);
    addTransitionType(effect);
    navigate();
  });
}
