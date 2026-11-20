import type { PakoMood } from "@/components/onboarding/storyTypes";

/** The app scenes the tour plays inside its phone. */
const TOUR_SCENES = ["find", "sell", "deal"] as const;
export type TourScene = (typeof TOUR_SCENES)[number];

/** Messages a scene sends to the page around it. */
export type SceneReport =
  | { source: typeof SOURCE; kind: "mood"; mood: PakoMood }
  /** The scene keeps its own clock, such as one that jumps ahead to a pickup. */
  | { source: typeof SOURCE; kind: "clock"; time: string }
  /** The phone's camera covers the screen, status bar included. */
  | { source: typeof SOURCE; kind: "camera"; open: boolean }
  /** The scene has played through once. */
  | { source: typeof SOURCE; kind: "done" };

/** Messages the page sends to its scene. */
export type SceneCommand = { source: typeof SOURCE; kind: "replay" };

const SOURCE = "takeover-tour-scene";

/** A message as written, before the source tag is added. */
type Unsent<Message> = Message extends unknown
  ? Omit<Message, "source">
  : never;

function isTourScene(value: string | null): value is TourScene {
  return TOUR_SCENES.some((scene) => scene === value);
}

/** The scene named in the page address, if this page is a scene. */
export function sceneInAddress(search: string) {
  const scene = new URLSearchParams(search).get("scene");
  if (scene === null) return null;
  if (!isTourScene(scene)) throw new Error(`Unknown tour scene "${scene}".`);
  return scene;
}

export function sceneAddress(scene: TourScene) {
  return `/tour?scene=${scene}`;
}

function fromTour(data: unknown): data is { source: string; kind: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "source" in data &&
    data.source === SOURCE
  );
}

/** A message from this site's own scene frame, or null for anything else. */
export function readReport(event: MessageEvent, frame: Window | null) {
  if (event.origin !== window.location.origin || event.source !== frame)
    return null;
  return fromTour(event.data) ? (event.data as SceneReport) : null;
}

export function readCommand(event: MessageEvent) {
  if (event.origin !== window.location.origin || event.source !== window.parent)
    return null;
  return fromTour(event.data) ? (event.data as SceneCommand) : null;
}

export function report(message: Unsent<SceneReport>) {
  // A scene opened on its own has nobody to report to.
  if (window.parent === window) return;
  window.parent.postMessage(
    { ...message, source: SOURCE },
    window.location.origin,
  );
}

export function command(frame: Window, message: Unsent<SceneCommand>) {
  frame.postMessage({ ...message, source: SOURCE }, window.location.origin);
}
