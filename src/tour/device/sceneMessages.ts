import type { PakoMood } from "@/components/onboarding/storyTypes";

/** The app scenes the tour plays inside its phone. */
const TOUR_SCENES = ["find", "sell", "deal"] as const;
export type TourScene = (typeof TOUR_SCENES)[number];

/** Messages a scene sends to the page around it. */
export type SceneReport =
  /** The scene listens for commands now; the page tells it whether to play. */
  | { source: typeof SOURCE; kind: "ready" }
  | { source: typeof SOURCE; kind: "mood"; mood: PakoMood }
  /** The scene keeps its own clock, such as one that jumps ahead to a pickup. */
  | { source: typeof SOURCE; kind: "clock"; time: string }
  /** The phone's camera covers the screen, status bar included. */
  | { source: typeof SOURCE; kind: "camera"; open: boolean }
  /** A key moment passed: the visitor tapped it, or the scene went on by itself. */
  | {
      source: typeof SOURCE;
      kind: "moment";
      moment: number;
      by: "visitor" | "scene";
    }
  /** The scene's last key moment has passed. */
  | { source: typeof SOURCE; kind: "done" }
  /** A key moment waits for the visitor, with Pako's hint; the page offers a keyboard turn. */
  | { source: typeof SOURCE; kind: "cue"; text: string }
  | { source: typeof SOURCE; kind: "cue-ended" };

/** Messages the page sends to its scene: start again, or play or wait while another phone plays. */
export type SceneCommand = {
  source: typeof SOURCE;
  /**
   * The key moment's keyboard turn: take it, or hold its countdown while the page's
   * button has focus and release it again.
   */
  kind: "replay" | "play" | "pause" | "take-turn" | "hold-cue" | "release-cue";
};

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

/** Whether the scene page plays the short version, as the survey's core shows it. */
export function briefInAddress(search: string) {
  return new URLSearchParams(search).get("pace") === "brief";
}

/** Whether the scene page waits for the page's "play" before it starts. */
export function heldInAddress(search: string) {
  return new URLSearchParams(search).get("start") === "held";
}

export function sceneAddress(
  scene: TourScene,
  brief: boolean,
  held: boolean,
  pickupDay?: string,
) {
  const params = new URLSearchParams({ scene });
  if (brief) params.set("pace", "brief");
  if (held) params.set("start", "held");
  if (pickupDay) params.set("day", pickupDay);
  return `/tour?${params}`;
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
