/** The visitor's pointer, which only a key moment reads. */
export type VisitorPointer = {
  move: (event: PointerEvent) => void;
  down: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
  /** The browser took the touch over, such as for a scroll, so it never ends with `up`. */
  cancel: (event: PointerEvent) => void;
};

/**
 * Everything a real touch or click sends. The scene is inert, so each of them
 * lands on the page root, where the app would take it for a tap outside an
 * open sheet or menu and close it.
 */
const TOUCH_EVENTS = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
  "touchstart",
  "touchend",
] as const;

const readers = new Set<VisitorPointer>();

function hand(event: Event) {
  if (!(event instanceof PointerEvent)) return;
  for (const reader of readers) {
    if (event.type === "pointermove") reader.move(event);
    if (event.type === "pointerdown") reader.down(event);
    if (event.type === "pointerup") reader.up(event);
    if (event.type === "pointercancel") reader.cancel(event);
  }
}

/**
 * Keeps the visitor's own touches away from the app inside the scene, so only
 * the script's taps move it; key moments still read them through
 * `readVisitorPointer`. The script's own taps are not trusted events and pass.
 */
export function shieldSceneFromVisitor() {
  for (const type of TOUCH_EVENTS)
    window.addEventListener(
      type,
      (event) => {
        if (!event.isTrusted) return;
        event.stopPropagation();
        hand(event);
      },
      { capture: true },
    );
}

/** Reads the visitor's pointer until the returned function is called. */
export function readVisitorPointer(reader: VisitorPointer) {
  readers.add(reader);
  return () => void readers.delete(reader);
}
