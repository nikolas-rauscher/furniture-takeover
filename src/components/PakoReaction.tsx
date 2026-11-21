import type { ComponentProps } from "react";
import { useMomentPassed } from "../hooks/useMomentPassed";
import { isReaction, REACTION_MS } from "../pakoMoods";
import Pako from "./onboarding/Pako";

/**
 * Pako reacting to a moment, such as results coming in or a listing that is
 * gone: the reaction plays once, then he rests, also when the same reaction
 * comes back. Moods that are not reactions pass through.
 */
export default function PakoReaction({
  mood,
  ...props
}: ComponentProps<typeof Pako>) {
  const passed = useMomentPassed(
    isReaction(mood) ? { id: mood, ms: REACTION_MS[mood] } : null,
  );
  return <Pako mood={passed ? "idle" : mood} {...props} />;
}
