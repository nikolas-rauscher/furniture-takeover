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

/** What a visitor might tap, which a hint should not cover. */
const CONTROLS = "button, a[href], input, textarea, [role=slider]";

type Side = "above" | "below";

function hintTop(side: Side, area: DOMRect) {
  return side === "below"
    ? area.bottom + HINT.gap
    : area.top - HINT.gap - HINT.height;
}

function within(inner: DOMRect, outer: DOMRect) {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  );
}

/** How many controls outside the control's group a hint at this place would cover. */
function coveredControls(top: number, left: number, area: DOMRect) {
  return [...document.querySelectorAll(CONTROLS)].filter((element) => {
    const box = element.getBoundingClientRect();
    return (
      box.width > 0 &&
      !within(box, area) &&
      box.left < left + HINT.width &&
      box.right > left &&
      box.top < top + HINT.height &&
      box.bottom > top
    );
  }).length;
}

/**
 * Below the control's group, where the app keeps small print, unless it does
 * not fit there or covers more controls than above it.
 */
function hintSide(area: DOMRect, left: number): Side {
  const fitsBelow =
    hintTop("below", area) + HINT.height <= window.innerHeight - BOTTOM_BAND;
  const fitsAbove = hintTop("above", area) >= HINT.edge;
  if (!fitsBelow) return "above";
  if (!fitsAbove) return "below";
  const covered = (side: Side) =>
    coveredControls(hintTop(side, area), left, area);
  return covered("below") > covered("above") ? "above" : "below";
}

/**
 * Pako's hint beside the control's group, never over it, and a ring pulsing
 * on the control.
 */
function CueMark({ cue }: { cue: Cue }) {
  const { box, area } = cue;
  const centre = box.left + box.width / 2;
  const left = Math.min(
    Math.max(centre - HINT.width / 2, HINT.edge),
    window.innerWidth - HINT.width - HINT.edge,
  );
  const side = hintSide(area, left);
  return (
    <>
      <span
        className="tour-cue-ring"
        style={{ left: centre, top: box.top + box.height / 2 }}
      />
      <span
        className="tour-cue"
        data-side={side}
        style={{
          left,
          width: HINT.width,
          ...(side === "above"
            ? { bottom: window.innerHeight - area.top + HINT.gap }
            : { top: area.bottom + HINT.gap }),
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
