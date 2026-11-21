import { readVisitorPointer } from "./visitorPointer.ts";

/** How far outside a control a finger still counts, in pixels: fingers are wider than buttons. */
const SLACK = 10;

/**
 * Who took the key moment's turn: the visitor's finger, where they let go; the
 * visitor's keyboard, from the page's button; or the scene.
 */
export type Turn =
  | { by: "visitor"; x: number; y: number }
  | { by: "keyboard" }
  | { by: "scene" };

type CueCommand = "take-turn" | "hold-cue" | "release-cue";

/** The key moment waiting now, which the page's keyboard turn reaches. */
let waiting: Record<CueCommand, () => void> | null = null;

/**
 * The page's keyboard turn for the key moment that waits now. A command that
 * arrives just after the moment ended has nothing left to act on.
 */
export function cueCommand(command: CueCommand) {
  waiting?.[command]();
}

function within(box: DOMRect, event: PointerEvent, slack: number) {
  return (
    event.clientX >= box.left - slack &&
    event.clientX <= box.right + slack &&
    event.clientY >= box.top - slack &&
    event.clientY <= box.bottom + slack
  );
}

/**
 * Waits for the visitor's own tap on a control, or their drag along it. The
 * scene stays inert, so the pointer is read by position. After `waitMs`
 * without a turn the scene takes it. A tap leaves that clock running, so a
 * press released off the control or cancelled still ends in the scene's turn.
 * A drag stops the clock; it ends when its finger lets go anywhere, and a
 * cancelled drag starts the clock again, so the cue never stays waiting.
 */
export function visitorTurn({
  control,
  waitMs,
  signal,
  onDrag,
}: {
  control: HTMLElement;
  waitMs: number;
  signal: AbortSignal;
  /** Set for a slider: follows the finger's x while it is down. */
  onDrag?: (x: number) => void;
}) {
  return new Promise<Turn>((resolve, reject) => {
    const root = document.documentElement;
    const slack = onDrag ? SLACK * 2 : SLACK;
    /** The pointer dragging the slider, while one does. */
    let dragging: number | null = null;
    let timer = 0;
    const startClock = () => {
      timer = window.setTimeout(() => finish({ by: "scene" }), waitMs);
    };
    const hit = (event: PointerEvent) =>
      within(control.getBoundingClientRect(), event, slack);
    const isDragging = (event: PointerEvent) => event.pointerId === dragging;

    function move(event: PointerEvent) {
      root.toggleAttribute("data-over", isDragging(event) || hit(event));
      if (isDragging(event)) onDrag?.(event.clientX);
    }
    function down(event: PointerEvent) {
      if (!onDrag || dragging !== null || !hit(event)) return;
      window.clearTimeout(timer);
      dragging = event.pointerId;
      onDrag(event.clientX);
    }
    function up(event: PointerEvent) {
      if (dragging === null ? hit(event) : isDragging(event))
        finish({ by: "visitor", x: event.clientX, y: event.clientY });
    }
    function cancel(event: PointerEvent) {
      if (!isDragging(event)) return;
      dragging = null;
      startClock();
    }
    startClock();
    const stopReading = readVisitorPointer({ move, down, up, cancel });
    // The keyboard turn is taken as the scene would take it, slider drags included;
    // holding stops the clock while the page's button has focus, so a keyboard user
    // has the time they need.
    waiting = {
      "take-turn": () => finish({ by: "keyboard" }),
      "hold-cue": () => window.clearTimeout(timer),
      "release-cue": () => {
        window.clearTimeout(timer);
        if (dragging === null) startClock();
      },
    };
    function stop() {
      window.clearTimeout(timer);
      waiting = null;
      stopReading();
      signal.removeEventListener("abort", abort);
      root.removeAttribute("data-over");
    }
    function finish(turn: Turn) {
      stop();
      resolve(turn);
    }
    function abort() {
      stop();
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort);
  });
}
