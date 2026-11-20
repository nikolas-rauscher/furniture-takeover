import { createPortal } from "react-dom";
import Pako from "@/components/onboarding/Pako";
import type { Cue, Glow, Touch } from "./useSceneScript";

/** The hint's width and height, and its distance from the screen's edges and the control. */
const HINT = { width: 230, height: 50, edge: 12, gap: 14 };
/** The bottom band the tab bar or a camera's controls take. */
const BOTTOM_BAND = 72;

/** Where the scene's finger touched; each new touch plays the mark again. */
function TouchMark({ touch }: { touch: Touch }) {
  return (
    <span
      key={touch.key}
      className="tour-touch"
      style={{ left: touch.x, top: touch.y }}
    />
  );
}

/** A soft ring around the element the last beat brought. */
function GlowMark({ glow }: { glow: Glow }) {
  const { box } = glow;
  return (
    <span
      key={glow.key}
      className="tour-glow"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        borderRadius: glow.radius,
      }}
    />
  );
}

/**
 * Pako's hint below the control, where the app keeps small print, or above it
 * near the bottom of the screen; and a ring pulsing on the control.
 */
function CueMark({ cue }: { cue: Cue }) {
  const { box } = cue;
  const centre = box.left + box.width / 2;
  const left = Math.min(
    Math.max(centre - HINT.width / 2, HINT.edge),
    window.innerWidth - HINT.width - HINT.edge,
  );
  const above =
    box.bottom + HINT.gap + HINT.height > window.innerHeight - BOTTOM_BAND;
  return (
    <>
      <span
        className="tour-cue-ring"
        style={{ left: centre, top: box.top + box.height / 2 }}
      />
      <span
        className="tour-cue"
        data-side={above ? "above" : "below"}
        style={{
          left,
          width: HINT.width,
          ...(above
            ? { bottom: window.innerHeight - box.top + HINT.gap }
            : { top: box.bottom + HINT.gap }),
        }}
      >
        <Pako mood="wave" size={34} />
        {cue.text}
      </span>
    </>
  );
}

/**
 * The marks over a scene: the finger, a new element lit up and the key
 * moment's hint. The scene's root fades as a whole, which caps what is inside
 * it under the app's dialogs, so the marks live beside it.
 */
export default function SceneMarks({
  touch,
  glow,
  cue,
}: {
  touch: Touch | null;
  glow: Glow | null;
  cue: Cue | null;
}) {
  return createPortal(
    <>
      {glow && <GlowMark glow={glow} />}
      {touch && <TouchMark touch={touch} />}
      {cue && <CueMark key={cue.key} cue={cue} />}
    </>,
    document.body,
  );
}
