import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text once it has stopped changing for `idleMs`, so each pause while typing does
 * not count as a new value. `flush` settles the current text at once, e.g. on blur.
 */
export function useSettledText(
  text: string,
  idleMs: number,
): [settled: string, flush: () => void] {
  const [settled, setSettled] = useState(text);
  const latest = useRef(text);
  latest.current = text;
  useEffect(() => {
    if (text === settled) return;
    const timer = setTimeout(() => setSettled(text), idleMs);
    return () => clearTimeout(timer);
  }, [text, settled, idleMs]);
  const flush = useCallback(() => setSettled(latest.current), []);
  return [settled, flush];
}
