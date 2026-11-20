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

/** The device's scale, and its offset that centres it in a slot wider than it needs. */
type Fit = { scale: number; left: number };

/** How far the device shrinks to fit whole into its slot, which the page's styles size. */
function useFit() {
  const slot = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  useLayoutEffect(() => {
    const element = slot.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
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

/** Passes the scene's mood, clock, camera and end to the page, and the page's replays to the scene. */
type SceneListeners = Pick<DeviceFrameProps, "onMood" | "onDone" | "onMoment">;

function useSceneLink(
  frame: RefObject<HTMLIFrameElement | null>,
  replay: number,
  { onMood, onDone, onMoment }: SceneListeners,
) {
  const [sceneTime, setSceneTime] = useState<Date>();
  const [cameraOpen, setCameraOpen] = useState(false);
  useEffect(() => {
    const listen = (event: MessageEvent) => {
      const message = readReport(event, frame.current?.contentWindow ?? null);
      if (message?.kind === "mood") onMood?.(message.mood);
      if (message?.kind === "clock") setSceneTime(new Date(message.time));
      if (message?.kind === "camera") setCameraOpen(message.open);
      if (message?.kind === "moment") onMoment?.(message.moment, message.by);
      if (message?.kind === "done") onDone?.();
    };
    window.addEventListener("message", listen);
    return () => window.removeEventListener("message", listen);
  }, [frame, onMood, onDone, onMoment]);
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
  label,
  replay = 0,
  onMood,
  onDone,
  onMoment,
}: DeviceFrameProps) {
  const { slot, fit } = useFit();
  const frame = useRef<HTMLIFrameElement>(null);
  const { sceneTime, cameraOpen } = useSceneLink(frame, replay, {
    onMood,
    onDone,
    onMoment,
  });
  return (
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
        <div className="tour-device-edge">
          <div className="tour-device-bezel">
            <div
              className="tour-device-screen"
              data-camera={cameraOpen || undefined}
            >
              <StatusBar sceneTime={sceneTime} />
              <span className="tour-device-camera" />
              <iframe
                ref={frame}
                className="tour-device-app"
                src={sceneAddress(scene)}
                title={label}
                tabIndex={-1}
                aria-hidden="true"
                style={{
                  width: SCREEN.width,
                  height: SCREEN.height - STATUS_BAR - HOME_STRIP,
                }}
              />
              <span className="tour-device-home" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
