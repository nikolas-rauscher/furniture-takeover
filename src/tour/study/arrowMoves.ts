import { useRef, type KeyboardEvent } from "react";

const ARROWS = new Set(["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]);

/**
 * Tells a change made by the arrow keys from a pick. In a radio group the arrows
 * move the checked option along with the focus; that only moves the selection.
 * A tap, Space or Enter picks.
 */
export function arrowTracker() {
  let arrow = false;
  return {
    /** Seen first, in the capture phase, before the list changes the option. */
    keyDown(key: string) {
      arrow = ARROWS.has(key);
    },
    /** Whether the change being reported now came from an arrow key; it is read once. */
    takeMoved() {
      const moved = arrow;
      arrow = false;
      return moved;
    },
  };
}

/** The tracker for one choice list, with the capture handler for the list's wrapper. */
export function useArrowMoves() {
  const tracker = useRef(arrowTracker());
  return {
    onKeyDownCapture: (event: KeyboardEvent) =>
      tracker.current.keyDown(event.key),
    takeMoved: () => tracker.current.takeMoved(),
  };
}

/**
 * Whether a change on a single-choice step moves on by itself. Arrow keys only
 * move the selection. A first pick moves on, and so does a tap, Space or Enter
 * on the option the arrow keys moved to, which confirms it.
 */
export function movesOn(change: {
  added: boolean;
  moved: boolean;
  confirmsArrowSelection: boolean;
}) {
  return !change.moved && (change.added || change.confirmsArrowSelection);
}
