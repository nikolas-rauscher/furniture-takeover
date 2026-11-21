import type { PakoMood } from "@/components/onboarding/storyTypes";

/** What every scene receives: called once its last beat has played, or once a beat failed. */
export type SceneProps = {
  /** The short version: holds and changes run faster, and key moments tap themselves. */
  brief: boolean;
  onEnd: () => void;
  onFail: (error: unknown) => void;
};

/** One change to the scene, `delay` ms after the one before it. */
export type Change<State> = {
  delay: number;
  apply: (state: State) => State;
};

/** One moment of a scene: a pause to read, maybe a tap, then the changes it brings. */
export type Beat<State> = {
  /** How long the screen holds before this beat, so the last change can be read. */
  hold: number;
  /** Scrolls this element into view before the beat. */
  reveal?: string;
  /** The control a finger taps, as a CSS selector inside the scene; the tap clicks it. */
  tap?: string;
  /**
   * A finger taps this control, but the scene plays what follows itself:
   * the phone's camera, which the app leaves to the phone.
   */
  press?: string;
  /** A finger drags a slider through these values, as a CSS selector and the values. */
  slide?: { selector: string; values: number[] };
  /**
   * A key moment: Pako's hint, such as "Tap Confirm sale". The scene waits for
   * the visitor to tap or drag the beat's control, and does it itself if they don't.
   */
  cue?: string;
  /** The element this beat's change brings: it scrolls into view and lights up briefly. */
  show?: string;
  /** Pako's mood beside the phone from this beat on. */
  mood?: PakoMood;
  changes?: Change<State>[];
};

/** A single change right after the beat's tap or pause. */
export function now<State>(apply: (state: State) => State): Change<State>[] {
  return [{ delay: 0, apply }];
}

/** Typical gap between two typed letters; longer after a space or a comma. */
const LETTER_MS = 62;

/** Letters typed one by one at a natural, slightly uneven pace. */
export function typing<State>(
  text: string,
  write: (state: State, typed: string) => State,
): Change<State>[] {
  return [...text].map((letter, index) => ({
    delay:
      LETTER_MS + (letter === " " || letter === "," ? 70 : (index * 37) % 45),
    apply: (state) => write(state, text.slice(0, index + 1)),
  }));
}

/** Items that arrive one after another, such as the events of Pako's turn. */
export function stream<State, Item>(
  items: readonly Item[],
  gap: (item: Item) => number,
  apply: (state: State, item: Item) => State,
): Change<State>[] {
  return items.map((item) => ({
    delay: gap(item),
    apply: (state) => apply(state, item),
  }));
}

/** Every change of a beat at once: what reduced motion shows. */
export function settle<State>(state: State, beat: Beat<State>) {
  return (beat.changes ?? []).reduce(
    (current, change) => change.apply(current),
    state,
  );
}
