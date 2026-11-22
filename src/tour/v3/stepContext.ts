import type { PakoMood } from "@/components/onboarding/storyTypes";
import type { StudyEventKind, StudyPilot } from "../../../shared/study.ts";
import type { SaveState } from "../saveQueue.ts";
import type { V3Progress } from "./v3Progress.ts";
import type { V3Step } from "./v3Script.ts";

/** What a participant has given on a screen, before it is stored. */
export type Given = {
  chosen: string[];
  text: string;
  /** Set when the first answer differs from the final one given at the same time. */
  firstChosen?: string[];
};

/** A tour scene on screen: its replays and whether it played through. */
export type SceneState = {
  replay: number;
  finished: boolean;
};

/** Everything a step's content and its buttons need from the survey. */
export type StepContext = {
  step: V3Step;
  progress: V3Progress;
  /** What is given on this screen, by answer id. */
  given: Record<string, Given>;
  save: SaveState;
  contact: string;
  scene: SceneState;
  /** `moved`: the arrow keys moved the selection, which records it without moving on. */
  answer: (id: string, answer: Given, moved?: boolean) => void;
  /** Stores what is given and goes to the next step. */
  proceed: (answers?: Record<string, Given>) => void;
  /** Goes to the next step without storing anything. */
  moveOn: () => void;
  replayScene: () => void;
  sceneDone: () => void;
  /** Keeps the draft's unsent words for this tab, or forgets them once decided. */
  keepUnsentDraft: (text: string | null) => void;
  /** Stores answers at once, by answer id, without leaving the step. */
  saveNow: (answers: Record<string, Given>) => void;
  /** Sends the form at the end; the end screen stays. */
  sendPilot: (pilot: StudyPilot) => void;
  retry: () => void;
  log: (kind: StudyEventKind, detail?: string) => void;
  onMood: (mood: PakoMood) => void;
  onShowPitch: () => void;
  onEdit: () => void;
};
