import * as React from "react";
import type { TargetAndTransition } from "motion/react";
import { AnimateView } from "motion/react-animate-view";

import {
  blur,
  ease,
  toCssTiming,
  useShouldReduceMotion,
} from "@animate-ui/react/utils/motion";

type PageTransitionEffect =
  | "fade"
  | "slide"
  | "push"
  | "zoom"
  | "iris"
  | "wipe"
  | "bands"
  | "stack"
  | "flow"
  | "chop";

type Frame = {
  width: number;
  top: number;
  bottom: number;
  x: number;
  y: number;
};

type EffectAnimation = {
  enter: TargetAndTransition;
  exit: TargetAndTransition;
};

// Pages move like the intro's steps: a short glide in the direction of travel on
// the intro's spring, while the old page steps aside quickly. The new page waits
// until the old one has nearly faded, so the text of the two never overlaps.
const SLIDE = 48;
const SLIDE_AWAY = 32;
const STEP_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.8,
} as const;
const STEP_AWAY = { duration: 0.1, ease: ease.leave };
const STEP_IN = { ...STEP_SPRING, delay: 0.08 };
// Starts moving on the tap and settles softly, like a native push; Animate UI's default eases in first.
const PUSH_TRANSITION = { duration: 0.42, ease: ease.out };
const BANDS = 5;
const BAND_STAGGER = 0.12;
const BAND_FRAMES = 16;

const still = (duration: number): TargetAndTransition => ({
  transform: ["none", "none"],
  transition: { duration, ease: "linear" },
});

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function bandFrames(back: boolean, { top, bottom }: Frame) {
  const span = 1 - (BANDS - 1) * BAND_STAGGER;
  return Array.from({ length: BAND_FRAMES + 1 }, (_, frame) => {
    const t = frame / BAND_FRAMES;
    const points: string[] = [];
    for (let band = 0; band < BANDS; band++) {
      const progress = easeOutCubic(
        Math.min(1, Math.max(0, (t - band * BAND_STAGGER) / span)),
      );
      const edge = back ? 100 : 0;
      const reach = back ? 100 - progress * 100 : progress * 100;
      const from = top + ((bottom - top) * band) / BANDS;
      const to = top + ((bottom - top) * (band + 1)) / BANDS;
      points.push(
        `${edge}% ${from}px`,
        `${reach}% ${from}px`,
        `${reach}% ${to}px`,
        `${edge}% ${to}px`,
      );
    }
    return `polygon(${points.join(", ")})`;
  });
}

const ROOT_STYLE =
  ":root[data-page-transition]::view-transition-old(root){display:none}:root[data-page-transition]::view-transition-new(root){animation:none}";

// Same spring as the pages, so a shared element lands together with them.
const SHARE = STEP_SPRING;

// Only a page change hides the old page: other view transitions (a theme
// switch) keep theirs.
let marks = 0;

function markRoot() {
  const root = document.documentElement;
  const mark = ++marks;
  root.setAttribute("data-page-transition", "");
  const transition = (
    document as Document & { activeViewTransition?: ViewTransition | null }
  ).activeViewTransition;
  const done = transition
    ? transition.finished
    : new Promise((resolve) => requestAnimationFrame(resolve)).then(() =>
        Promise.all(
          root
            .getAnimations({ subtree: true })
            .filter((animation) =>
              (
                animation.effect as KeyframeEffect | null
              )?.pseudoElement?.startsWith("::view-transition"),
            )
            .map((animation) => animation.finished),
        ),
      );
  void done
    .catch(() => {})
    .finally(() => {
      if (mark === marks) root.removeAttribute("data-page-transition");
    });
}

const middle = ({ top, bottom }: Frame) => `50% ${(top + bottom) / 2}px`;

const EFFECTS: Record<
  PageTransitionEffect,
  (back: boolean, enter: Frame, exit: Frame) => EffectAnimation
> = {
  fade: () => ({
    enter: {
      opacity: [0, 1],
      filter: [blur.panel, "blur(0px)"],
      transition: { duration: 0.3, ease: ease.out },
    },
    exit: {
      opacity: [1, 0],
      filter: ["blur(0px)", blur.panel],
      transition: { duration: 0.15, ease: ease.leave },
    },
  }),
  slide: (back) => {
    const direction = back ? -1 : 1;
    return {
      enter: {
        opacity: [0, 1],
        transform: [`translateX(${direction * SLIDE}px)`, "none"],
        transition: STEP_IN,
      },
      exit: {
        opacity: [1, 0],
        transform: ["none", `translateX(${-direction * SLIDE_AWAY}px)`],
        transition: STEP_AWAY,
      },
    };
  },
  // A page can consist of several elements; all travel the page's width together.
  push: (back, { width }) => {
    const from = back ? -width : width;
    return {
      enter: {
        transform: [`translateX(${from}px)`, "none"],
        transition: PUSH_TRANSITION,
      },
      exit: {
        transform: ["none", `translateX(${-from}px)`],
        transition: PUSH_TRANSITION,
      },
    };
  },
  zoom: (_, enter, exit) => ({
    enter: {
      opacity: [0, 1],
      transform: ["scale(0.94)", "none"],
      transformOrigin: [middle(enter), middle(enter)],
      transition: { duration: 0.4, ease: ease.out },
    },
    exit: {
      opacity: [1, 0],
      transform: ["none", "scale(1.04)"],
      transformOrigin: [middle(exit), middle(exit)],
      transition: { duration: 0.2, ease: ease.leave },
    },
  }),
  iris: (_, { width, top, bottom, x, y }) => {
    const radius = Math.hypot(
      Math.max(x, width - x),
      Math.max(y - top, bottom - y),
    );
    return {
      enter: {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
        transition: { duration: 0.6, ease: ease.resize },
      },
      exit: still(0.6),
    };
  },
  wipe: (back) => ({
    enter: {
      clipPath: [back ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)", "inset(0)"],
      transition: { duration: 0.5, ease: ease.resize },
    },
    exit: {
      transform: ["none", `translateX(${back ? 8 : -8}%)`],
      transition: { duration: 0.5, ease: ease.resize },
    },
  }),
  bands: (back, enter) => ({
    enter: {
      clipPath: bandFrames(back, enter),
      transition: { duration: 0.7, ease: "linear" },
    },
    exit: still(0.7),
  }),
  stack: (back, enter, exit) => {
    const distance = enter.bottom - enter.top;
    return {
      enter: {
        transform: [`translateY(${back ? -distance : distance}px)`, "none"],
        transition: { duration: 0.5, ease: ease.resize },
      },
      exit: {
        transform: ["none", "scale(0.94)"],
        transformOrigin: [middle(exit), middle(exit)],
        opacity: [1, 0.6],
        transition: { duration: 0.5, ease: ease.resize },
      },
    };
  },
  flow: (back) => {
    const from = back ? -30 : 30;
    return {
      enter: {
        opacity: [0, 1],
        transform: [`translateX(${from}%)`, "none"],
        filter: ["blur(12px)", "blur(0px)"],
        transition: { duration: 0.35, ease: ease.out },
      },
      exit: {
        opacity: [1, 0],
        transform: ["none", `translateX(${-from}%)`],
        filter: ["blur(0px)", "blur(12px)"],
        transition: { duration: 0.25, ease: ease.leave },
      },
    };
  },
  chop: (back, { top, bottom }) => ({
    enter: {
      clipPath: back
        ? [
            `polygon(0% ${top}px, -20% ${top}px, 0% ${bottom}px, 0% ${bottom}px)`,
            `polygon(0% ${top}px, 120% ${top}px, 100% ${bottom}px, 0% ${bottom}px)`,
          ]
        : [
            `polygon(100% ${top}px, 100% ${top}px, 100% ${bottom}px, 120% ${bottom}px)`,
            `polygon(-20% ${top}px, 100% ${top}px, 100% ${bottom}px, 0% ${bottom}px)`,
          ],
      transition: { duration: 0.55, ease: ease.inOut },
    },
    exit: {
      transform: ["none", `translateX(${back ? 6 : -6}%)`],
      transition: { duration: 0.55, ease: ease.inOut },
    },
  }),
};

function frameOf(element: HTMLElement, point?: { x: number; y: number }) {
  const rect = element.getBoundingClientRect();
  const top = Math.min(Math.max(0, -rect.top), rect.height);
  const bottom = Math.max(top, Math.min(rect.height, innerHeight - rect.top));
  return {
    width: rect.width,
    top,
    bottom,
    x: point ? point.x - rect.left : rect.width / 2,
    y: point ? point.y - rect.top : (top + bottom) / 2,
  };
}

function isPageTransitionEffect(value: string): value is PageTransitionEffect {
  return value in EFFECTS;
}

type PageAnimations = {
  enter: (types: string[]) => TargetAndTransition;
  exit: (types: string[]) => TargetAndTransition;
};

/**
 * Web Animations timing for a page effect; springs become a `linear()` curve,
 * and during a delay the page holds its first frame.
 */
function pageTiming(transition: TargetAndTransition["transition"]) {
  if (!transition) throw new Error("A page effect needs a transition.");
  if (transition.type !== "spring" && typeof transition.duration !== "number")
    throw new Error("A page effect needs a duration or a spring.");
  return {
    ...toCssTiming(transition),
    delay: (transition.delay ?? 0) * 1000,
    fill: "both" as const,
  };
}

/**
 * Animates the old or the new picture of a page. A page can render several
 * elements, which React names `name`, `name_1`, `name_2`…; all of them get the
 * same animation in place of the browser's crossfade, so the page moves as one.
 */
function animatePageLayers(
  name: string,
  side: "old" | "new",
  { transition, ...keyframes }: TargetAndTransition,
) {
  const timing = pageTiming(transition);
  const layers = new Set<string>();
  for (const animation of document.getAnimations()) {
    const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement;
    const match = pseudo?.match(/^::view-transition-(old|new)\((.+)\)$/);
    if (!match || match[1] !== side) continue;
    if (match[2] !== name && !match[2].startsWith(`${name}_`)) continue;
    animation.cancel();
    layers.add(match[2]);
  }
  const animations = [...layers].map((layer) =>
    document.documentElement.animate(keyframes as PropertyIndexedKeyframes, {
      ...timing,
      pseudoElement: `::view-transition-${side}(${layer})`,
    }),
  );
  return () => animations.forEach((animation) => animation.cancel());
}

const PageAnimationsContext = React.createContext<PageAnimations | null>(null);

type PageTransitionProps = {
  /** Plays when a navigation names no effect among its transition types. */
  effect?: PageTransitionEffect;
  /** The element the pages live in; effects are measured against its visible part. */
  container: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
};

/**
 * Adapted from Animate UI's PageTransition. The original keys one wrapper by
 * the route, which remounts every page; here each page is a PageTransitionView,
 * so pages kept alive in the background keep their state and scroll position.
 */
function PageTransition({
  effect = "fade",
  container,
  children,
}: PageTransitionProps) {
  const reduce = useShouldReduceMotion();
  const pointRef = React.useRef<{ x: number; y: number } | undefined>(
    undefined,
  );
  const exitRef = React.useRef<Frame | undefined>(undefined);

  React.useEffect(() => {
    const onInput = (event: Event) => {
      if (!container.current) return;
      pointRef.current =
        event instanceof PointerEvent
          ? { x: event.clientX, y: event.clientY }
          : undefined;
      exitRef.current = frameOf(container.current, pointRef.current);
    };
    document.addEventListener("pointerdown", onInput, true);
    document.addEventListener("keydown", onInput, true);
    return () => {
      document.removeEventListener("pointerdown", onInput, true);
      document.removeEventListener("keydown", onInput, true);
    };
  }, [container]);

  const animations = React.useMemo<PageAnimations>(() => {
    const animation = (types: string[]) => {
      if (!container.current)
        throw new Error("PageTransition needs its container element.");
      markRoot();
      const named = types.find(isPageTransitionEffect);
      const enter = frameOf(container.current, pointRef.current);
      return EFFECTS[reduce ? "fade" : (named ?? effect)](
        types.includes("nav-back"),
        enter,
        exitRef.current ?? enter,
      );
    };
    return {
      enter: (types) => animation(types).enter,
      exit: (types) => animation(types).exit,
    };
  }, [container, effect, reduce]);

  return (
    <PageAnimationsContext value={animations}>
      <style href="page-transition" precedence="default">
        {ROOT_STYLE}
      </style>
      {children}
    </PageAnimationsContext>
  );
}

/**
 * One page inside PageTransition. It plays the exit when it is removed or
 * hidden (an Activity turning hidden) and the entrance when it appears.
 */
function PageTransitionView({ children }: { children: React.ReactNode }) {
  const animations = React.useContext(PageAnimationsContext);
  if (!animations)
    throw new Error("PageTransitionView must be used within PageTransition.");
  return (
    <React.ViewTransition
      onEnter={({ name }, types) =>
        animatePageLayers(name, "new", animations.enter(types))
      }
      onExit={({ name }, types) =>
        animatePageLayers(name, "old", animations.exit(types))
      }
    >
      {children}
    </React.ViewTransition>
  );
}

type PageTransitionSharedProps = {
  /** Matches the element on the old page with the one on the new page; style it as `::view-transition-group(<name>)`. */
  name: string;
  children: React.ReactNode;
};

/**
 * Adapted from Animate UI's PageTransitionShared: an element on both pages
 * morphs from one to the other. It names its child's element instead of
 * wrapping it, so the child's layout stays as it is.
 */
function PageTransitionShared({ name, children }: PageTransitionSharedProps) {
  return (
    <AnimateView name={name} transition={SHARE}>
      {children}
    </AnimateView>
  );
}

export {
  PageTransition,
  PageTransitionView,
  PageTransitionShared,
  type PageTransitionSharedProps,
  isPageTransitionEffect,
  type PageTransitionProps,
  type PageTransitionEffect,
};
