import { flushSync } from "react-dom";

export function motionBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

let activeTransition: ViewTransition | undefined;
/** Animate discrete workspace changes, never individual streamed tokens. */
export function animateUiChange(update: () => void) {
  if (!document.startViewTransition || motionBehavior() === "auto") {
    update();
    return Promise.resolve();
  }
  activeTransition?.skipTransition();
  const transition = document.startViewTransition(() => flushSync(update));
  activeTransition = transition;
  void transition.finished
    .catch(() => {})
    .finally(() => {
      if (activeTransition === transition) activeTransition = undefined;
    });
  return transition.updateCallbackDone;
}

export function scrollToPageStart() {
  requestAnimationFrame(() => {
    const locked = document.querySelector(
      ".chat-layout, .messages-layout, .selling-chat-layout, .selling-photo-layout",
    );
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: locked ? "instant" : motionBehavior(),
    });
  });
}
