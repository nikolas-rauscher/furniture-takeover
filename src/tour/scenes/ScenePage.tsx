import { MotionConfig } from "motion/react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { setStorageScope } from "../../cloud/session";
import { readCommand, type TourScene } from "../device/sceneMessages";
import DealScene from "./DealScene";
import FindScene from "./FindScene";
import SellScene from "./SellScene";
import { preloadImages, SCENE_IMAGES } from "./sceneImages";
import { keepScrollsInScene } from "./sceneScroll";
import type { SceneProps } from "./sceneScript";
import { shieldSceneFromVisitor } from "./visitorPointer";
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
shieldSceneFromVisitor();

/** How long the page may be off screen before its round stops; a page transition hides it for less. */
const AWAY_MS = 2000;

/**
 * Whether the page is on the visitor's screen now, and whether it was shown
 * since the last round ended. Off screen for longer than a page transition,
 * the round stops, so a scene only plays while it can be seen.
 */
function useShown(onAway: () => void) {
  const onScreen = useRef(false);
  const [shown, setShown] = useState(false);
  const away = useRef(onAway);
  useEffect(() => {
    away.current = onAway;
  }, [onAway]);
  useEffect(() => {
    let timer: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
      window.clearTimeout(timer);
      if (entry.isIntersecting) setShown(true);
      else
        timer = window.setTimeout(() => {
          setShown(false);
          away.current();
        }, AWAY_MS);
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
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

/** Whether the scene's images are loaded; a failed load is thrown where it shows. */
function useImagesLoaded(scene: TourScene) {
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState<Error>();
  useEffect(() => {
    preloadImages(SCENE_IMAGES[scene]).then(() => setLoaded(true), setFailure);
  }, [scene]);
  if (failure) throw failure;
  return loaded;
}

/**
 * One app scene inside the tour's phone: it starts once on screen, holds its
 * end, fades out and starts over, or waits off screen until it is seen again.
 * Leaving the screen stops a round; the scene starts over on its return.
 * Its images load first, so none appears late.
 * Only its key moments answer the visitor's taps; nothing in it can be focused.
 * A round that fails is reported in the console and the scene starts over.
 */
export default function ScenePage({
  scene,
  brief,
}: {
  scene: TourScene;
  /** Plays the short version: faster, and every key moment taps itself. */
  brief: boolean;
}) {
  const [round, setRound] = useState(0);
  const ending = useRef<number>(undefined);
  const Scene = SCENES[scene];

  /** Starts the scene again unless a replay already started a newer round. */
  function startAfter(finished: number) {
    window.clearTimeout(ending.current);
    window.scrollTo({ top: 0 });
    setRound((current) => (current === finished ? current + 1 : current));
  }
  const { onScreen, shown, setShown } = useShown(() => startAfter(round));
  const imagesLoaded = useImagesLoaded(scene);
  useReplays(() => startAfter(round));
  useEffect(() => () => window.clearTimeout(ending.current), []);
  useEffect(() => {
    void fade("in");
  }, [round]);

  /** Fades the round out and starts the next one, after `holdMs` on its last screen. */
  function next(holdMs: number) {
    const finished = round;
    ending.current = window.setTimeout(
      () =>
        void fade("out").then(() => {
          if (!onScreen.current) setShown(false);
          startAfter(finished);
        }),
      holdMs,
    );
  }

  function fail(error: unknown) {
    console.error(`The "${scene}" scene failed; it starts over.`, error);
    next(0);
  }

  return (
    <MotionConfig reducedMotion="user">
      {shown && imagesLoaded && (
        <Scene
          key={round}
          brief={brief}
          onEnd={() => next(END_HOLD_MS)}
          onFail={fail}
        />
      )}
    </MotionConfig>
  );
}
