/** How far outside a control a finger still counts, in pixels: fingers are wider than buttons. */
const SLACK = 10;

/** Who took the key moment's turn: the visitor, where they let go, or the scene. */
export type Turn = { by: "visitor"; x: number; y: number } | { by: "scene" };

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
 * scene stays inert, so the pointer is read from the page by position. After
 * `waitMs` without a touch the scene takes the turn; a drag under way stops
 * that clock.
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
    let dragging = false;
    const timer = window.setTimeout(() => finish({ by: "scene" }), waitMs);
    const hit = (event: PointerEvent) =>
      within(control.getBoundingClientRect(), event, slack);

    function move(event: PointerEvent) {
      root.toggleAttribute("data-over", dragging || hit(event));
      if (dragging) onDrag?.(event.clientX);
    }
    function down(event: PointerEvent) {
      if (!hit(event)) return;
      window.clearTimeout(timer);
      dragging = Boolean(onDrag);
      onDrag?.(event.clientX);
    }
    function up(event: PointerEvent) {
      if (dragging || hit(event))
        finish({ by: "visitor", x: event.clientX, y: event.clientY });
    }
    function stop() {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
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
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    signal.addEventListener("abort", abort);
  });
}
