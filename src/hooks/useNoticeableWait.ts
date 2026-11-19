import { useEffect, useState } from "react";

/** Under a second, a wait still feels like part of loading the page. */
const NOTICEABLE_AFTER_MS = 1000;

/**
 * Whether a wait has gone on long enough to mention. A quick load or save
 * finishes before any notice appears, so nothing flashes up and away.
 */
export function useNoticeableWait(waiting: boolean) {
  const [noticeable, setNoticeable] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setNoticeable(true), NOTICEABLE_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setNoticeable(false);
    };
  }, [waiting]);
  return waiting && noticeable;
}
