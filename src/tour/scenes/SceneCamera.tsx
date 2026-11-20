import { motion } from "motion/react";
import { PHOTO } from "./sellScript";
import "./camera.css";

/** Aiming at the desk, or the shot taken and waiting for Use photo. */
export type CameraStage = "aiming" | "taken";

/** The phone's camera opens over the app from below and closes the same way. */
const SHEET = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
  transition: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
} as const;

/** Léa's room around the desk: the wall and floor continue the drawing's own. */
function Room({ live }: { live: boolean }) {
  return (
    <div className="tour-camera-room" data-live={live || undefined}>
      <span className="tour-camera-window" />
      <span className="tour-camera-floor" />
      <img className="tour-camera-desk" src={PHOTO} alt="" />
    </div>
  );
}

function FlashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M13.5 2 5 13.5h6L10 22l9-12h-6.2L13.5 2Z" />
      <path className="tour-camera-off" d="M4 3.5 20.5 20" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M4.5 10a7.5 7.5 0 0 1 13.2-3.6M19.5 14a7.5 7.5 0 0 1-13.2 3.6" />
      <path d="M18.4 3.2v3.6h-3.6M5.6 20.8v-3.6h3.6" />
    </svg>
  );
}

function ShutterRow({
  stage,
  onShoot,
}: Pick<CameraProps, "stage" | "onShoot">) {
  return (
    <div className="tour-camera-row" data-row="shutter">
      <span className="tour-camera-last" />
      <button
        type="button"
        className="tour-camera-shutter"
        aria-label="Take photo"
        disabled={stage === "taken"}
        onClick={onShoot}
      >
        <span />
      </button>
      <span className="tour-camera-round">
        <FlipIcon />
      </span>
    </div>
  );
}

function ReviewRow({ onUse }: Pick<CameraProps, "onUse">) {
  return (
    <div className="tour-camera-row" data-row="review">
      <span className="tour-camera-retake">Retake</span>
      <button type="button" className="tour-camera-use" onClick={onUse}>
        Use photo
      </button>
    </div>
  );
}

type CameraProps = {
  stage: CameraStage;
  onShoot: () => void;
  onUse: () => void;
};

/**
 * The phone's own camera, as a student meets it after tapping Add photos: a
 * handheld view of the desk with a focus square, the shutter's flash, the shot
 * cropping to the photo, then Retake or Use photo.
 */
export default function SceneCamera({ stage, onShoot, onUse }: CameraProps) {
  const taken = stage === "taken";
  return (
    <motion.div className="tour-camera" data-stage={stage} {...SHEET}>
      <div className="tour-camera-top">
        <span className="tour-camera-round">
          <FlashIcon />
        </span>
        <span className="tour-camera-round" data-label>
          4:3
        </span>
      </div>
      <div className="tour-camera-view">
        <div className="tour-camera-live">
          <Room live />
          <span className="tour-camera-focus" />
        </div>
        {taken && (
          <div className="tour-camera-shot">
            <Room live={false} />
          </div>
        )}
        {taken && <span className="tour-camera-flash" />}
      </div>
      <div className="tour-camera-controls">
        <div className="tour-camera-zoom">
          <span>.5</span>
          <span data-chosen>1×</span>
          <span>2</span>
        </div>
        <span className="tour-camera-mode">Photo</span>
        <div className="tour-camera-rows">
          <ShutterRow stage={stage} onShoot={onShoot} />
          {taken && <ReviewRow onUse={onUse} />}
        </div>
      </div>
    </motion.div>
  );
}
