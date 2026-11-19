import { useEffect, useState } from "react";

/** Something that happens once, such as a reaction or a celebration, and lasts `ms`. */
export type Moment = { id: string; ms: number };

/**
 * Whether the moment has passed. It stays passed when the same moment comes
 * back; a moment with another id starts again. One timeout per moment, so
 * nothing re-renders while it plays.
 */
export function useMomentPassed(moment: Moment | null): boolean {
  const [passed, setPassed] = useState<string | null>(null);
  const id = moment?.id;
  const ms = moment?.ms;
  useEffect(() => {
    if (id === undefined || ms === undefined || id === passed) return;
    const timer = setTimeout(() => setPassed(id), ms);
    return () => clearTimeout(timer);
  }, [id, ms, passed]);
  return id !== undefined && id === passed;
}
