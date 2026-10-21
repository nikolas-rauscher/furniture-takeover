import { useLayoutEffect, useRef, useState } from "react";
import { motionBehavior } from "../uiMotion";

/** Pace presentation only; the authoritative response and tool events stay immediate. */
export function useStreamingText(text: string, turn: string, enabled: boolean) {
  const [visible, setVisible] = useState(text);
  const shown = useRef(text);
  const target = useRef(text);
  const identity = useRef(turn);
  const frame = useRef<number | null>(null);
  const lastPaint = useRef(0);

  useLayoutEffect(() => {
    target.current = text;
    const reset = identity.current !== turn || !text.startsWith(shown.current);
    identity.current = turn;
    if (reset || !enabled || motionBehavior() === "auto") {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      shown.current = text;
      setVisible(text);
      return;
    }
    if (frame.current !== null || shown.current === text) return;
    lastPaint.current = performance.now();
    const paint = (now: number) => {
      const elapsed = now - lastPaint.current;
      if (elapsed < 32) {
        frame.current = requestAnimationFrame(paint);
        return;
      }
      lastPaint.current = now;
      const remaining = target.current.length - shown.current.length;
      // Catch up large network chunks quickly, while small chunks appear evenly.
      let end = Math.min(
        target.current.length,
        shown.current.length +
          Math.max(
            1,
            Math.ceil(
              (Math.max(120, remaining * 7) * Math.min(elapsed, 64)) / 1000,
            ),
          ),
      );
      // Never render half of a UTF-16 surrogate pair.
      const last = target.current.charCodeAt(end - 1);
      if (last >= 0xd800 && last <= 0xdbff) end++;
      shown.current =
        motionBehavior() === "auto"
          ? target.current
          : target.current.slice(0, end);
      setVisible(shown.current);
      frame.current =
        shown.current === target.current ? null : requestAnimationFrame(paint);
    };
    frame.current = requestAnimationFrame(paint);
  }, [text, turn, enabled]);

  useLayoutEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    },
    [],
  );
  return visible;
}
