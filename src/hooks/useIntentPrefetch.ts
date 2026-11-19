import { useEffect, useEffectEvent } from "react";
import type { PrefetchTarget } from "../screens";
import { whenIdle } from "../whenIdle";

type Prefetchers = Record<PrefetchTarget, () => Promise<unknown>>;

const INTENT_EVENTS = ["pointerover", "focusin", "touchstart"] as const;

function isPrefetchTarget(
  name: string | undefined,
  prefetchers: Prefetchers,
): name is PrefetchTarget {
  return name !== undefined && name in prefetchers;
}

/** A data saver asks for no downloads the student did not ask for. */
function savesData() {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  return connection?.saveData === true;
}

/**
 * Starts loading a screen when a student points at, focuses or touches an element
 * marked `data-prefetch`, and loads the likely next screens once the page is idle.
 * A failed prefetch is reported; the screen itself retries when it opens.
 */
export function useIntentPrefetch(
  prefetchers: Prefetchers,
  likelyNext: PrefetchTarget[],
) {
  const prefetch = useEffectEvent((name: string | undefined) => {
    if (isPrefetchTarget(name, prefetchers))
      prefetchers[name]().catch((error: unknown) =>
        console.warn(`Could not prefetch the ${name} screen.`, error),
      );
  });
  useEffect(() => {
    function onIntent(event: Event) {
      if (!(event.target instanceof Element)) return;
      const entry = event.target.closest<HTMLElement>("[data-prefetch]");
      prefetch(entry?.dataset.prefetch);
    }
    for (const type of INTENT_EVENTS)
      document.addEventListener(type, onIntent, {
        capture: true,
        passive: true,
      });
    return () => {
      for (const type of INTENT_EVENTS)
        document.removeEventListener(type, onIntent, { capture: true });
    };
  }, []);
  const nextKey = likelyNext.join(" ");
  useEffect(() => {
    if (!nextKey || savesData()) return;
    return whenIdle(() => {
      for (const name of nextKey.split(" ")) prefetch(name);
    });
  }, [nextKey]);
}
