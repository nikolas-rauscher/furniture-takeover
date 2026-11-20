import { useEffect, useRef } from "react";
import type { TourScene } from "../device/sceneMessages";
import type { StudyStep } from "../tourScript";

/** How long a scene takes up to its last key moment when the visitor only watches, measured on a phone. */
const SCENE_LENGTH_MS: Record<TourScene, number> = {
  find: 32_000,
  sell: 44_000,
  deal: 35_000,
};
/** Room for a slow phone, or a round that started over after leaving the screen. */
const MARGIN_MS = 20_000;

/**
 * Continue on a scene step waits for the scene's last key moment. A scene that
 * never reports it, such as one whose rounds keep failing, unlocks Continue
 * after its length and a margin, and the miss is reported in the console.
 */
export function useSceneDeadline(
  step: StudyStep,
  finished: boolean,
  unlock: () => void,
) {
  const latest = useRef(unlock);
  useEffect(() => {
    latest.current = unlock;
  }, [unlock]);
  const scene = step.kind === "scene" ? step.scene : null;
  useEffect(() => {
    if (!scene || finished) return;
    const deadlineMs = SCENE_LENGTH_MS[scene] + MARGIN_MS;
    const timer = window.setTimeout(() => {
      console.error(
        `The "${scene}" scene did not reach its last key moment within ${deadlineMs / 1000} s; Continue is unlocked.`,
      );
      latest.current();
    }, deadlineMs);
    return () => window.clearTimeout(timer);
  }, [step.id, scene, finished]);
}
