import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { motionBehavior } from "../../uiMotion";

/** Reduced motion keeps every story beat but plays it faster and without typing. */
const REDUCED_PACE = 0.35;

/**
 * Plays timed beats one after another and returns the index of the current beat.
 * The timeline advances while `running` is true; beat `durations.length` is the end.
 */
export function useTimeline(durations: readonly number[], running = true) {
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!running || beat >= durations.length) return;
    const timer = setTimeout(
      () => setBeat((current) => current + 1),
      durations[beat] * (reduced ? REDUCED_PACE : 1),
    );
    return () => clearTimeout(timer);
  }, [beat, durations, reduced, running]);
  return beat;
}

/** Scrolls an element that appears mid-scene into view, so short screens show it too. */
export function useRevealOnMount<T extends HTMLElement>() {
  const element = useRef<T>(null);
  useEffect(() => {
    element.current?.scrollIntoView({
      block: "nearest",
      behavior: motionBehavior(),
    });
  }, []);
  return element;
}

/** Types `text` character by character once `active` is true. */
export function useTypewriter(text: string, active: boolean, charMs = 32) {
  const reduced = useReducedMotion();
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (!active) {
      setLength(0);
      return;
    }
    if (reduced) {
      setLength(text.length);
      return;
    }
    let count = 0;
    setLength(count);
    const timer = setInterval(() => {
      count += 1;
      setLength(count);
      if (count >= text.length) clearInterval(timer);
    }, charMs);
    return () => clearInterval(timer);
  }, [active, charMs, reduced, text]);
  return { typed: text.slice(0, length), done: length >= text.length };
}
