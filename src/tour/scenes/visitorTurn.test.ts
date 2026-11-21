import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { shieldSceneFromVisitor } from "./visitorPointer.ts";
import { visitorTurn, type Turn } from "./visitorTurn.ts";

const WAIT_MS = 4000;
/** The cue's control on screen: 100 to 200 across, 100 to 140 down. */
const ON = { x: 150, y: 120 };
const OFF = { x: 400, y: 400 };

/** A real touch as the scene page receives it: trusted, with its pointer and position. */
class FakePointerEvent {
  readonly isTrusted = true;
  readonly type: string;
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  constructor(type: string, pointerId: number, at: { x: number; y: number }) {
    this.type = type;
    this.pointerId = pointerId;
    this.clientX = at.x;
    this.clientY = at.y;
  }
  stopPropagation() {}
}

const listeners = new Map<string, (event: unknown) => void>();
Object.assign(globalThis, {
  PointerEvent: FakePointerEvent,
  document: {
    documentElement: { toggleAttribute() {}, removeAttribute() {} },
  },
  window: {
    setTimeout: (run: () => void, ms: number) => setTimeout(run, ms),
    clearTimeout: (timer: number) => clearTimeout(timer),
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      listeners.set(type, listener),
  },
});
shieldSceneFromVisitor();

function touch(
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  at: { x: number; y: number },
  pointerId = 1,
) {
  const listener = listeners.get(type);
  if (!listener) throw new Error(`The scene does not listen for ${type}.`);
  listener(new FakePointerEvent(type, pointerId, at));
}

const control = {
  getBoundingClientRect: () => ({
    left: 100,
    right: 200,
    top: 100,
    bottom: 140,
  }),
} as HTMLElement;

/** A key moment under way, with its turn once someone took it. */
function keyMoment(t: TestContext, onDrag?: (x: number) => void) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const round = new AbortController();
  t.after(() => round.abort(new Error("The test is over.")));
  const moment = { turn: undefined as Turn | undefined };
  visitorTurn({ control, waitMs: WAIT_MS, signal: round.signal, onDrag }).then(
    (turn) => {
      moment.turn = turn;
    },
    () => {},
  );
  return moment;
}

const settled = () => new Promise((resolve) => setImmediate(resolve));

test("a tap on the cue is the visitor's turn", async (t) => {
  const moment = keyMoment(t);
  touch("pointerdown", ON);
  touch("pointerup", ON);
  await settled();
  assert.deepEqual(moment.turn, { by: "visitor", ...ON });
});

test("a press released off the cue leaves the clock running, so the scene takes the turn", async (t) => {
  const moment = keyMoment(t);
  touch("pointerdown", ON);
  touch("pointermove", OFF);
  touch("pointerup", OFF);
  await settled();
  assert.equal(moment.turn, undefined);
  t.mock.timers.tick(WAIT_MS);
  await settled();
  assert.deepEqual(moment.turn, { by: "scene" });
});

test("a cancelled touch on a cue still hands the turn to the scene", async (t) => {
  const moment = keyMoment(t);
  touch("pointerdown", ON);
  touch("pointercancel", ON);
  t.mock.timers.tick(WAIT_MS);
  await settled();
  assert.deepEqual(moment.turn, { by: "scene" });
});

test("a drag stops the clock and ends where its finger lets go, on the slider or not", async (t) => {
  const dragged: number[] = [];
  const moment = keyMoment(t, (x) => dragged.push(x));
  touch("pointerdown", ON);
  touch("pointermove", OFF);
  t.mock.timers.tick(WAIT_MS * 2);
  await settled();
  assert.equal(moment.turn, undefined, "the clock waits while dragging");
  touch("pointerup", OFF);
  await settled();
  assert.deepEqual(moment.turn, { by: "visitor", ...OFF });
  assert.deepEqual(dragged, [ON.x, OFF.x]);
});

test("a cancelled drag starts the clock again", async (t) => {
  const moment = keyMoment(t, () => {});
  touch("pointerdown", ON);
  touch("pointercancel", OFF);
  t.mock.timers.tick(WAIT_MS - 1);
  await settled();
  assert.equal(moment.turn, undefined);
  t.mock.timers.tick(1);
  await settled();
  assert.deepEqual(moment.turn, { by: "scene" });
});

test("another finger neither moves nor ends a drag", async (t) => {
  const dragged: number[] = [];
  const moment = keyMoment(t, (x) => dragged.push(x));
  touch("pointerdown", ON, 1);
  touch("pointermove", OFF, 2);
  touch("pointerup", OFF, 2);
  touch("pointercancel", OFF, 2);
  await settled();
  assert.equal(moment.turn, undefined);
  assert.deepEqual(dragged, [ON.x]);
  touch("pointerup", ON, 1);
  await settled();
  assert.deepEqual(moment.turn, { by: "visitor", ...ON });
});
