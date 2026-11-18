import type { CompleteAnswers } from "./onboardingContent";

export type PakoMood = "idle" | "wave" | "happy" | "work" | "cheer";

/** What every story scene receives from the intro flow. */
export type SceneProps = {
  answers: CompleteAnswers;
  /** Sets Pako's mood while the scene plays. */
  onMood: (mood: PakoMood) => void;
  /** Called once, when the visitor has finished the scene's interaction. */
  onDone: () => void;
};
