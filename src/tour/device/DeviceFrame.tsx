import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import {
  command,
  readReport,
  sceneAddress,
  type TourScene,
} from "./sceneMessages";
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

type Fit = { scale: number; height: number };

/** How far the device shrinks to fill its slot, which the page's styles size. */
function useFit(bare: boolean) {
  const slot = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  useLayoutEffect(() => {
    const element = slot.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      setFit(
        bare
          ? {
              scale: width / SCREEN.width,
              height: height / (width / SCREEN.width),
            }
          : {
              scale: height / DEVICE.height,
              height: SCREEN.height - STATUS_BAR - HOME_STRIP,
            },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [bare]);
  return { slot, fit };
}

/** Passes the scene's mood, clock, camera and end to the page, and the page's replays to the scene. */
function useSceneLink(
  frame: RefObject<HTMLIFrameElement | null>,
  replay: number,
  onMood: ((mood: PakoMood) => void) | undefined,
  onDone: (() => void) | undefined,
) {
  const [sceneTime, setSceneTime] = useState<Date>();
  const [cameraOpen, setCameraOpen] = useState(false);
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const message = readReport(event, frame.current?.contentWindow ?? null);
      if (message?.kind === "mood") onMood?.(message.mood);
      if (message?.kind === "clock") setSceneTime(new Date(message.time));
      if (message?.kind === "camera") setCameraOpen(message.open);
      if (message?.kind === "done") onDone?.();
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [frame, onMood, onDone]);
  const played = useRef(replay);
  useEffect(() => {
    if (played.current === replay) return;
    played.current = replay;
    const scene = frame.current?.contentWindow;
    if (!scene) throw new Error("The scene to replay is not loaded.");
    command(scene, { kind: "replay" });
  }, [frame, replay]);
  return { sceneTime, cameraOpen };
}

export type DeviceFrameProps = {
  scene: TourScene;
  /** Says what the scene shows, for anyone who cannot see it. */
  label: string;
  /** The screen alone, without the device around it. */
  bare?: boolean;
  /** Counts the visitor's replays; each change starts the scene again. */
  replay?: number;
  onMood?: (mood: PakoMood) => void;
  onDone?: () => void;
};

/** A phone playing one of the app's scenes, scaled as a whole to fit its slot. */
export default function DeviceFrame({
  scene,
  label,
  bare = false,
  replay = 0,
  onMood,
  onDone,
}: DeviceFrameProps) {
  const { slot, fit } = useFit(bare);
  const frame = useRef<HTMLIFrameElement>(null);
  const { sceneTime, cameraOpen } = useSceneLink(frame, replay, onMood, onDone);
  const screen = (
    <iframe
      ref={frame}
      className="tour-device-app"
      src={sceneAddress(scene)}
      title={label}
      tabIndex={-1}
      aria-hidden="true"
      style={{ width: SCREEN.width, height: fit?.height ?? 0 }}
    />
  );
  return (
    <div
      ref={slot}
      className="tour-device-slot"
      data-bare={bare || undefined}
      data-ready={fit ? true : undefined}
      role="img"
      aria-label={label}
    >
      {bare ? (
        <div className="tour-device-bare" style={{ scale: fit?.scale ?? 0 }}>
          {screen}
        </div>
      ) : (
        <div className="tour-device" style={{ scale: fit?.scale ?? 0 }}>
          <span className="tour-device-key" data-key="action" />
          <span className="tour-device-key" data-key="volume-up" />
          <span className="tour-device-key" data-key="volume-down" />
          <span className="tour-device-key" data-key="power" />
          <span className="tour-device-key" data-key="camera" />
          <div className="tour-device-edge">
            <div className="tour-device-bezel">
              <div
                className="tour-device-screen"
                data-camera={cameraOpen || undefined}
              >
                <StatusBar sceneTime={sceneTime} />
                <span className="tour-device-camera" />
                {screen}
                <span className="tour-device-home" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
