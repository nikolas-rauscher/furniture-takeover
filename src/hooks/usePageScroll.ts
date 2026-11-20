import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";

type ScrollPosition = { top: number; left: number };

const currentPosition = (): ScrollPosition => ({
  top: window.scrollY,
  left: window.scrollX,
});

/**
 * Each page keeps its own scroll position: a page opened again returns where
 * it was left, and focus moves to the new page for keyboard and screen reader users.
 */
export function usePageScroll(pageKey: string, onArrive: () => void) {
  const previousPage = useRef(pageKey);
  const positions = useRef(new Map<string, ScrollPosition>());
  const arrive = useEffectEvent(onArrive);
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  useLayoutEffect(() => {
    const changed = previousPage.current !== pageKey;
    previousPage.current = pageKey;
    const position = positions.current.get(pageKey) ?? { top: 0, left: 0 };
    if (changed) {
      window.scrollTo({ ...position, behavior: "instant" });
      arrive();
    }
    const remember = () => positions.current.set(pageKey, currentPosition());
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [pageKey]);
  return {
    /** Keeps where the page on screen is scrolled, before another page replaces it. */
    remember() {
      positions.current.set(pageKey, currentPosition());
    },
    /** The page opens at the top next time. */
    forget(key: string) {
      positions.current.delete(key);
    },
  };
}
