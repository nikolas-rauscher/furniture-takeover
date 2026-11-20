import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { report } from "../device/sceneMessages";
import { settle, type Beat } from "./sceneScript";

/** Where the finger touches the screen, in viewport pixels. */
export type Touch = { x: number; y: number; key: number };

/** How long a finger rests on a control before the screen answers. */
const PRESS_MS = 260;
/** How long a dragged slider rests on each value it passes. */
const SLIDE_STEP_MS = 160;

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(signal.reason);
    });
  });

function sceneElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`The scene has no element "${selector}".`);
  return element;
}

/** Sets a slider as a finger does, so the app's own change handler answers. */
function setSlider(slider: HTMLElement, value: number) {
  if (!(slider instanceof HTMLInputElement))
    throw new Error("Only a slider can be dragged.");
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setValue) throw new Error("This browser cannot set a slider.");
  setValue.call(slider, String(value));
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

function centreOf(selector: string) {
  const box = sceneElement(selector).getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Plays a scene's beats once, from its first state: holds, scrolls, taps and the
 * changes in between. A tap clicks the control, so the app's own handler answers.
 * With reduced motion every beat lands at once, after its hold, without the finger.
 */
export function useSceneScript<State>(
  initial: () => State,
  beats: readonly Beat<State>[],
  onEnd: () => void,
) {
  const reduced = useReducedMotion() === true;
  const [state, setState] = useState(initial);
  const [touch, setTouch] = useState<Touch | null>(null);
  const ended = useRef(onEnd);
  useEffect(() => {
    ended.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const run = new AbortController();
    const { signal } = run;
    async function play() {
      for (const [index, beat] of beats.entries()) {
        await pause(beat.hold, signal);
        if (beat.mood) report({ kind: "mood", mood: beat.mood });
        if (beat.reveal)
          sceneElement(beat.reveal).scrollIntoView({
            block: "center",
            behavior: reduced ? "auto" : "smooth",
          });
        if (beat.tap) {
          if (!reduced) {
            setTouch({ ...centreOf(beat.tap), key: index });
            await pause(PRESS_MS, signal);
          }
          // The app's own handler answers the tap, as it would a finger's.
          sceneElement(beat.tap).click();
        }
        if (beat.slide) {
          const { selector, values } = beat.slide;
          const slider = sceneElement(selector);
          if (!reduced) setTouch({ ...centreOf(selector), key: index });
          for (const value of reduced ? values.slice(-1) : values) {
            setSlider(slider, value);
            if (!reduced) await pause(SLIDE_STEP_MS, signal);
          }
        }
        if (reduced) setState((current) => settle(current, beat));
        else
          for (const change of beat.changes ?? []) {
            if (change.delay) await pause(change.delay, signal);
            setState(change.apply);
          }
      }
      ended.current();
    }
    play().catch((error: unknown) => {
      if (!signal.aborted) throw error;
    });
    return () => run.abort();
  }, [beats, reduced]);

  return { state, setState, touch };
}
