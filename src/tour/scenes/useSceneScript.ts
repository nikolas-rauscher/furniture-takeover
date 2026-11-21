import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { report } from "../device/sceneMessages";
import { settle, type Beat, type SceneProps } from "./sceneScript";
import { bringIntoView } from "./sceneScroll";
import { pause, waitFor } from "./sceneWait";
import { visitorTurn } from "./visitorTurn";

/** Where the finger touches the screen, in viewport pixels. */
export type Touch = { x: number; y: number; key: number };
/** An element the last beat brought, lit up for a moment, in viewport pixels. */
export type Glow = {
  box: DOMRect;
  radius: string;
  key: number;
};
/**
 * A key moment's hint: the control's box, and the box the hint keeps clear of,
 * which is the control's group where one is marked `data-cue-area`.
 */
export type Cue = { box: DOMRect; area: DOMRect; text: string; key: number };

/** How long a finger rests on a control before the screen answers. */
const PRESS_MS = 260;
/** How long a dragged slider rests on each value it passes. */
const SLIDE_STEP_MS = 160;
/** How long a key moment waits for the visitor before the scene taps itself. */
const CUE_WAIT_MS = 4000;
/** How long a new element stays lit. */
const GLOW_MS = 1600;
/** A beat's last change is on screen before its element is measured. */
const RENDER_MS = 60;
/** A smooth scroll to a new element ends before it lights up. */
const SCROLL_MS = 360;

/** The short version's share of every hold and every gap between changes. */
const BRIEF_PACE = 0.35;

/** How long a beat waits for its element, such as a sheet still opening, before the round fails. */
const ELEMENT_WAIT_MS = 4000;

/** The scene's element, once it is on screen; a round whose element never comes fails. */
function sceneElement(selector: string, signal: AbortSignal) {
  return waitFor(() => document.querySelector<HTMLElement>(selector), {
    what: `The element "${selector}"`,
    timeoutMs: ELEMENT_WAIT_MS,
    signal,
  });
}

function asSlider(element: HTMLElement) {
  if (!(element instanceof HTMLInputElement))
    throw new Error("Only a slider can be dragged.");
  return element;
}

/** Sets a slider as a finger does, so the app's own change handler answers. */
function setSlider(slider: HTMLInputElement, value: number) {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setValue) throw new Error("This browser cannot set a slider.");
  setValue.call(slider, String(value));
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The slider's value under a finger at `x`; the slider rounds it to its step. */
function sliderValueAt(slider: HTMLInputElement, x: number) {
  const box = slider.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (x - box.left) / box.width));
  const min = Number(slider.min);
  return min + ratio * (Number(slider.max) - min);
}

function centreOf(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** The control a beat touches: its tap, its slider or its press. */
function controlOf<State>(beat: Beat<State>) {
  return beat.tap ?? beat.slide?.selector ?? beat.press;
}

/** Names a beat in an error: its number and what it does. */
function describeBeat<State>(beat: Beat<State>, index: number) {
  const action =
    beat.cue ?? controlOf(beat) ?? beat.show ?? beat.reveal ?? "a pause";
  return `beat ${index + 1} (${action})`;
}

/** The last key moment: once it has passed, the scene has shown what matters. */
function lastCue<State>(beats: readonly Beat<State>[]) {
  const cues = beats.flatMap((beat, index) =>
    beat.cue === undefined ? [] : [index],
  );
  const last = cues.at(-1);
  if (last === undefined)
    throw new Error("A scene needs at least one key moment.");
  return last;
}

/**
 * Plays a scene's beats once, from its first state: holds, scrolls, taps and the
 * changes in between. A tap clicks the control, so the app's own handler answers.
 * At a key moment the scene waits for the visitor's own tap or drag, and takes
 * it after a few seconds without one. With reduced motion every beat lands at
 * once, after its hold, without the finger. A beat that fails, such as one
 * whose element never appears, stops the round and is passed to `onFail`.
 */
export function useSceneScript<State>(
  initial: () => State,
  beats: readonly Beat<State>[],
  { brief, still, onEnd, onFail }: SceneProps,
) {
  const reduced = useReducedMotion() === true;
  const [state, setState] = useState(initial);
  const [touch, setTouch] = useState<Touch | null>(null);
  const [glow, setGlow] = useState<Glow | null>(null);
  const [cue, setCue] = useState<Cue | null>(null);
  const ended = useRef(onEnd);
  const failed = useRef(onFail);
  useEffect(() => {
    ended.current = onEnd;
    failed.current = onFail;
  }, [onEnd, onFail]);

  useEffect(() => {
    if (still) return;
    const run = new AbortController();
    const { signal } = run;
    const scroll = reduced ? "auto" : "smooth";
    const doneAt = lastCue(beats);
    const paced = (ms: number) => (brief ? Math.round(ms * BRIEF_PACE) : ms);

    /** The scene's own finger: it rests on the control, then taps or drags it. */
    async function touchItself(beat: Beat<State>, key: number) {
      const selector = controlOf(beat);
      if (!selector) return;
      const control = await sceneElement(selector, signal);
      if (!reduced) {
        setTouch({ ...centreOf(control), key });
        await pause(PRESS_MS, signal);
      }
      if (beat.tap) control.click();
      if (beat.slide) {
        const slider = asSlider(control);
        const { values } = beat.slide;
        for (const value of reduced ? values.slice(-1) : values) {
          setSlider(slider, value);
          if (!reduced) await pause(SLIDE_STEP_MS, signal);
        }
      }
    }

    /** Pako's hint on the control until the visitor taps or drags it, or the wait runs out. */
    async function keyMoment(beat: Beat<State>, text: string, key: number) {
      const selector = controlOf(beat);
      if (!selector) throw new Error(`"${text}" names no control.`);
      const control = await sceneElement(selector, signal);
      bringIntoView(control, "nearest", scroll);
      if (!reduced) await pause(SCROLL_MS, signal);
      const area = control.closest("[data-cue-area]") ?? control;
      report({ kind: "cue", text });
      setCue({
        box: control.getBoundingClientRect(),
        area: area.getBoundingClientRect(),
        text,
        key,
      });
      const slider = beat.slide ? asSlider(control) : null;
      const turn = await visitorTurn({
        control,
        waitMs: CUE_WAIT_MS,
        signal,
        onDrag: slider
          ? (x) => setSlider(slider, sliderValueAt(slider, x))
          : undefined,
      }).finally(() => {
        setCue(null);
        report({ kind: "cue-ended" });
      });
      report({ kind: "moment", moment: key, by: turn.by });
      if (turn.by === "scene") return touchItself(beat, key);
      setTouch({ x: turn.x, y: turn.y, key });
      if (beat.tap) control.click();
    }

    /** Brings the beat's new element into view and lights it up. */
    async function showChange(selector: string, key: number) {
      await pause(RENDER_MS, signal);
      const element = await sceneElement(selector, signal);
      bringIntoView(element, "nearest", scroll);
      if (!reduced) await pause(SCROLL_MS, signal);
      setGlow({
        box: element.getBoundingClientRect(),
        radius: getComputedStyle(element).borderRadius,
        key,
      });
      window.setTimeout(
        () => setGlow((current) => (current?.key === key ? null : current)),
        GLOW_MS,
      );
    }

    async function playBeat(beat: Beat<State>, index: number) {
      await pause(paced(beat.hold), signal);
      if (beat.mood) report({ kind: "mood", mood: beat.mood });
      if (beat.reveal)
        bringIntoView(
          await sceneElement(beat.reveal, signal),
          "center",
          scroll,
        );
      // The short version has no time to wait for the visitor, so it taps itself.
      if (beat.cue && !brief) await keyMoment(beat, beat.cue, index);
      else await touchItself(beat, index);
      if (index === doneAt) report({ kind: "done" });
      if (reduced) setState((current) => settle(current, beat));
      else
        for (const change of beat.changes ?? []) {
          if (change.delay) await pause(paced(change.delay), signal);
          setState(change.apply);
        }
      if (beat.show) await showChange(beat.show, index);
    }

    async function play() {
      for (const [index, beat] of beats.entries())
        await playBeat(beat, index).catch((error: unknown) => {
          if (signal.aborted) throw error;
          throw new Error(
            `The scene stopped at ${describeBeat(beat, index)} of ${beats.length}.`,
            { cause: error },
          );
        });
      ended.current();
    }
    play().catch((error: unknown) => {
      if (!signal.aborted) failed.current(error);
    });
    return () => run.abort();
  }, [beats, reduced, brief, still]);

  return { state, setState, marks: { touch, glow, cue } };
}
