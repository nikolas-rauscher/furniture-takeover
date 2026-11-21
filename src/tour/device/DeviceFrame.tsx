import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useReducedMotion } from "motion/react";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import {
  command,
  readReport,
  sceneAddress,
  type TourScene,
} from "./sceneMessages";
import { useSceneTurn } from "./sceneDirector";
import StatusBar from "./StatusBar";
import "./device.css";

/** The phone's screen in CSS pixels; the app inside is laid out at this width. */
const SCREEN = { width: 402, height: 874 };
/** The screen's top band, which the status bar and the camera take. */
const STATUS_BAR = 62;
/** The band at the bottom of the screen that holds the home indicator. */
const HOME_STRIP = 21;
/** Screen, bezel and edge, plus the buttons standing out on both sides. */
const DEVICE = { width: SCREEN.width + 34, height: SCREEN.height + 28 };

/** The device's scale, and its offset that centres it in a slot wider than it needs. */
type Fit = { scale: number; left: number };
/**
 * A slot that only grows taller by less than this, such as when the browser's bars
 * collapse, keeps the device's scale; a narrower or shorter slot always rescales it.
 */
const HEIGHT_JITTER_PX = 100;

type Box = { width: number; height: number };

/** Whether the slot changed enough to rescale the device it holds. */
function needsRescale(previous: Box | null, next: Box) {
  if (!previous || previous.width !== next.width) return true;
  const grown = next.height - previous.height;
  return grown < 0 || grown >= HEIGHT_JITTER_PX;
}

/** How far the device shrinks to fit whole into its slot, which the page's styles size. */
function useFit() {
  const slot = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const measured = useRef<Box | null>(null);
  useLayoutEffect(() => {
    const element = slot.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      if (!needsRescale(measured.current, { width, height })) return;
      measured.current = { width, height };
      const scale = Math.min(width / DEVICE.width, height / DEVICE.height);
      setFit({ scale, left: (width - DEVICE.width * scale) / 2 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { slot, fit };
}

/**
 * Passes the scene's mood, clock, camera and end to the page, and the page's
 * replays and its turn to play to the scene.
 */
type SceneListeners = Pick<DeviceFrameProps, "onMood" | "onDone" | "onMoment">;

function useSceneLink(
  frame: RefObject<HTMLIFrameElement | null>,
  replay: number,
  active: boolean,
  { onMood, onDone, onMoment }: SceneListeners,
) {
  const [sceneTime, setSceneTime] = useState<Date>();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cue, setCue] = useState<string | null>(null);
  const turn = useRef(active);
  const tellTurn = useCallback(() => {
    const scene = frame.current?.contentWindow;
    if (scene) command(scene, { kind: turn.current ? "play" : "pause" });
  }, [frame]);
  useEffect(() => {
    turn.current = active;
    tellTurn();
  }, [active, tellTurn]);
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const message = readReport(event, frame.current?.contentWindow ?? null);
      // A scene starts held and plays once the page says it is its turn.
      if (message?.kind === "ready") tellTurn();
      if (message?.kind === "mood") onMood?.(message.mood);
      if (message?.kind === "clock") setSceneTime(new Date(message.time));
      if (message?.kind === "camera") setCameraOpen(message.open);
      if (message?.kind === "moment") onMoment?.(message.moment, message.by);
      if (message?.kind === "done") onDone?.();
      if (message?.kind === "cue") setCue(message.text);
      if (message?.kind === "cue-ended") setCue(null);
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [frame, onMood, onDone, onMoment, tellTurn]);
  const played = useRef(replay);
  useEffect(() => {
    if (played.current === replay) return;
    played.current = replay;
    const scene = frame.current?.contentWindow;
    // A scene whose iframe is not made yet starts from the beginning when it is.
    if (scene) command(scene, { kind: "replay" });
  }, [frame, replay]);
  return { sceneTime, cameraOpen, cue };
}

/**
 * The key moment's keyboard turn: a button named after Pako's hint (English, like
 * the scenes), hidden until it has focus. While it has focus the moment waits; pressing it takes the turn.
 * A moment that ends while it has focus leaves it in place, inactive, until focus
 * moves on, so the keyboard user keeps their place.
 */
function CueKey({
  cue,
  send,
}: {
  cue: string | null;
  send: (kind: "take-turn" | "hold-cue" | "release-cue") => void;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const label = cue ?? focused;
  if (label === null) return null;
  return (
    <button
      type="button"
      className="tour-cue-key"
      lang="en"
      aria-disabled={cue === null || undefined}
      onFocus={() => {
        setFocused(label);
        send("hold-cue");
      }}
      onBlur={() => {
        setFocused(null);
        send("release-cue");
      }}
      onClick={() => {
        if (cue !== null) send("take-turn");
      }}
    >
      {label}
    </button>
  );
}

export type DeviceFrameProps = {
  scene: TourScene;
  /** Plays the scene's short version. */
  brief?: boolean;
  /** Says what the scene shows, for anyone who cannot see it. */
  label: string;
  /** Counts the visitor's replays; each change starts the scene again. */
  replay?: number;
  onMood?: (mood: PakoMood) => void;
  onDone?: () => void;
  /** Each key moment, with whether the visitor tapped it. */
  onMoment?: (moment: number, by: "visitor" | "scene") => void;
};

/** A phone playing one of the app's scenes, scaled as a whole to fit its slot. */
export default function DeviceFrame({
  scene,
  brief = false,
  label,
  replay = 0,
  onMood,
  onDone,
  onMoment,
}: DeviceFrameProps) {
  const { slot, fit } = useFit();
  const frame = useRef<HTMLIFrameElement>(null);
  const { near, active, directed } = useSceneTurn(slot);
  // With reduced motion a phone on the pitch plays only once the visitor asks for it.
  const reduced = useReducedMotion() === true;
  const plays = active && (!(reduced && directed) || replay > 0);
  const { sceneTime, cameraOpen, cue } = useSceneLink(frame, replay, plays, {
    onMood,
    onDone,
    onMoment,
  });
  const send = (kind: "take-turn" | "hold-cue" | "release-cue") => {
    const scene = frame.current?.contentWindow;
    if (scene) command(scene, { kind });
  };
  return (
    <>
      <div
        ref={slot}
        className="tour-device-slot"
        data-ready={fit ? true : undefined}
        role="img"
        aria-label={label}
      >
        <div
          className="tour-device"
          style={{ scale: fit?.scale ?? 0, left: fit?.left ?? 0 }}
        >
          <span className="tour-device-key" data-key="action" />
          <span className="tour-device-key" data-key="volume-up" />
          <span className="tour-device-key" data-key="volume-down" />
          <span className="tour-device-key" data-key="power" />
          <span className="tour-device-key" data-key="camera" />
          <span className="tour-device-shadow" />
          <div className="tour-device-edge">
            <div className="tour-device-bezel">
              <div
                className="tour-device-screen"
                data-camera={cameraOpen || undefined}
              >
                <StatusBar sceneTime={sceneTime} />
                <span className="tour-device-camera" />
                {near && (
                  <iframe
                    ref={frame}
                    className="tour-device-app"
                    src={sceneAddress(scene, brief, true)}
                    title={label}
                    tabIndex={-1}
                    aria-hidden="true"
                    style={{
                      width: SCREEN.width,
                      height: SCREEN.height - STATUS_BAR - HOME_STRIP,
                    }}
                  />
                )}
                <span className="tour-device-home" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <CueKey cue={cue} send={send} />
    </>
  );
}
