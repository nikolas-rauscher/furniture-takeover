import { MotionConfig } from "motion/react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { setStorageScope } from "../../cloud/session";
import { readCommand, type TourScene } from "../device/sceneMessages";
import DealScene from "./DealScene";
import FindScene from "./FindScene";
import SellScene from "./SellScene";
import { keepScrollsInScene } from "./sceneScroll";
import type { SceneProps } from "./sceneScript";
import "./scene.css";

const SCENES: Record<TourScene, ComponentType<SceneProps>> = {
  find: FindScene,
  sell: SellScene,
  deal: DealScene,
};

/** The end of a scene stays on screen this long before it fades out and starts again. */
const END_HOLD_MS = 4200;
const FADE_MS = 500;

/** The scene renders straight into the root, as the app does, so the app's styles apply. */
function pageRoot() {
  const root = document.getElementById("root");
  if (!root) throw new Error("The scene page has no root.");
  return root;
}

/** The whole screen fades in at the start of a round, and out before the next. */
function fade(direction: "in" | "out") {
  return pageRoot().animate(
    { opacity: direction === "in" ? [0, 1] : [1, 0] },
    { duration: FADE_MS, easing: "ease-out", fill: "forwards" },
  ).finished;
}

keepScrollsInScene();
// The scenes' saved state, such as celebrations already shown, stays apart from the app's.
setStorageScope("tour-scene");
// Nothing in a scene can be focused, sheets and menus outside its root included; key moments read the pointer by position.
document.body.inert = true;

/**
 * Whether the page is on the visitor's screen now, and whether it was shown
 * since the last round ended. A page transition hides the page from the
 * observer for a moment, so a round that started plays on to its end.
 */
function useShown() {
  const onScreen = useRef(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
      if (entry.isIntersecting) setShown(true);
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);
  return { onScreen, shown, setShown };
}

/** The page's replay starts the scene again at once. */
function useReplays(restart: () => void) {
  const latest = useRef(restart);
  useEffect(() => {
    latest.current = restart;
  }, [restart]);
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (readCommand(event)?.kind === "replay") latest.current();
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, []);
}

/**
 * One app scene inside the tour's phone: it starts once on screen, holds its
 * end, fades out and starts over, or waits off screen until it is seen again.
 * Only its key moments answer the visitor's taps; nothing in it can be focused.
 */
export default function ScenePage({ scene }: { scene: TourScene }) {
  const { onScreen, shown, setShown } = useShown();
  const [round, setRound] = useState(0);
  const ending = useRef<number>(undefined);
  const Scene = SCENES[scene];

  /** Starts the scene again unless a replay already started a newer round. */
  function startAfter(finished: number) {
    window.clearTimeout(ending.current);
    window.scrollTo({ top: 0 });
    setRound((current) => (current === finished ? current + 1 : current));
  }
  useReplays(() => startAfter(round));
  useEffect(() => () => window.clearTimeout(ending.current), []);
  useEffect(() => {
    void fade("in");
  }, [round]);

  function end() {
    const finished = round;
    ending.current = window.setTimeout(
      () =>
        void fade("out").then(() => {
          if (!onScreen.current) setShown(false);
          startAfter(finished);
        }),
      END_HOLD_MS,
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {shown && <Scene key={round} onEnd={end} />}
    </MotionConfig>
  );
}
