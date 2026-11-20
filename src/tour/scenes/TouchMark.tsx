import type { Touch } from "./useSceneScript";

/** Where the scene's finger touched; each new touch plays the mark again. */
export default function TouchMark({ touch }: { touch: Touch | null }) {
  if (!touch) return null;
  return (
    <span
      key={touch.key}
      className="tour-touch"
      style={{ left: touch.x, top: touch.y }}
    />
  );
}
