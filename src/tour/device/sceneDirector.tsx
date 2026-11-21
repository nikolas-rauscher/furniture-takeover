import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

/** A scene's iframe is made once its frame is within this distance of the screen... */
const NEAR_MARGIN = "100% 0px";
/** ...and removed once it is farther than this, so a short scroll back keeps it. */
const FAR_MARGIN = "200% 0px";
const VISIBLE_STEPS = [0, 0.1, 0.25, 0.5, 0.75, 1];
/**
 * How long the frames must stay put before the director acts. Making, removing or
 * switching a scene costs the page's main thread, so none of it happens mid-scroll.
 */
const SETTLE_MS = 250;

type Sighting = { ratio: number; near: boolean };
type Decision = { active: string | null; near: ReadonlySet<string> };

type Director = {
  decision: Decision;
  sight: (id: string, change: Partial<Sighting>) => void;
  leave: (id: string) => void;
};

const DirectorContext = createContext<Director | null>(null);

/** The frame most on screen plays; every other frame on the page waits. */
function decide(sightings: Map<string, Sighting>): Decision {
  let active: string | null = null;
  let best = 0;
  const near = new Set<string>();
  for (const [id, { ratio, near: isNear }] of sightings) {
    if (isNear) near.add(id);
    if (ratio > best) {
      best = ratio;
      active = id;
    }
  }
  return { active, near };
}

/**
 * Coordinates the app scenes on a page with several phones: one plays at a
 * time, and each one's iframe exists only while its frame is near the screen.
 */
export function SceneDirector({ children }: { children: ReactNode }) {
  const sightings = useRef(new Map<string, Sighting>());
  const timer = useRef(0);
  const [decision, setDecision] = useState<Decision>({
    active: null,
    near: new Set(),
  });
  const settle = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setDecision(decide(sightings.current)),
      SETTLE_MS,
    );
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const sight = useCallback(
    (id: string, change: Partial<Sighting>) => {
      const before = sightings.current.get(id) ?? { ratio: 0, near: false };
      sightings.current.set(id, { ...before, ...change });
      settle();
    },
    [settle],
  );
  const leave = useCallback(
    (id: string) => {
      sightings.current.delete(id);
      settle();
    },
    [settle],
  );
  const value = useMemo(
    () => ({ decision, sight, leave }),
    [decision, sight, leave],
  );
  return <DirectorContext value={value}>{children}</DirectorContext>;
}

/** True once the page has painted, so a scene never delays the first screen. */
function usePainted() {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPainted(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return painted;
}

function observe(
  element: Element,
  options: IntersectionObserverInit,
  onEntry: (entry: IntersectionObserverEntry) => void,
) {
  const observer = new IntersectionObserver(
    ([entry]) => onEntry(entry),
    options,
  );
  observer.observe(element);
  return observer;
}

/**
 * Whether a phone's scene should exist and whether it may play. Outside a
 * director, as in the survey's single phone, it exists once the page has
 * painted and always plays.
 */
export function useSceneTurn(slot: RefObject<HTMLElement | null>): {
  near: boolean;
  active: boolean;
  /** A director coordinates this phone, as on the pitch. */
  directed: boolean;
} {
  const director = useContext(DirectorContext);
  const id = useId();
  const painted = usePainted();
  const sight = director?.sight;
  const leave = director?.leave;
  useEffect(() => {
    const element = slot.current;
    if (!element || !sight || !leave) return;
    const observers = [
      observe(element, { threshold: VISIBLE_STEPS }, (entry) =>
        sight(id, {
          ratio: entry.isIntersecting ? entry.intersectionRatio : 0,
        }),
      ),
      observe(element, { rootMargin: NEAR_MARGIN }, (entry) => {
        if (entry.isIntersecting) sight(id, { near: true });
      }),
      observe(element, { rootMargin: FAR_MARGIN }, (entry) => {
        if (!entry.isIntersecting) sight(id, { near: false });
      }),
    ];
    return () => {
      observers.forEach((observer) => observer.disconnect());
      leave(id);
    };
  }, [slot, id, sight, leave]);
  if (!director) return { near: painted, active: true, directed: false };
  return {
    near: painted && director.decision.near.has(id),
    active: director.decision.active === id,
    directed: true,
  };
}
