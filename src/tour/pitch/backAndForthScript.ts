import type { PakoMood } from "@/components/onboarding/storyTypes";

/** What the stage shows: the tedious part first, then what Pako takes over. */
export type Moment =
  | "scattered"
  | "sorted"
  | "pile"
  | "offer"
  | "sent"
  | "booked"
  | "reminder"
  | "underway"
  | "done";

export type Chapter = "search" | "messages" | "pickup";

export type Step = {
  moment: Moment;
  chapter: Chapter;
  /** How long the step stays before the next one. */
  ms: number;
  mood: PakoMood;
  /** The student taps a control in this step; the change follows the tap. */
  tap?: true;
};

export const CHAPTERS: readonly Chapter[] = ["search", "messages", "pickup"];

export const STEPS: readonly Step[] = [
  {
    moment: "scattered",
    chapter: "search",
    ms: 3600,
    mood: "idle",
  },
  {
    moment: "sorted",
    chapter: "search",
    ms: 4200,
    mood: "search",
  },
  {
    moment: "pile",
    chapter: "messages",
    ms: 3800,
    mood: "listen",
  },
  {
    moment: "offer",
    chapter: "messages",
    ms: 3600,
    mood: "work",
  },
  {
    moment: "sent",
    chapter: "messages",
    ms: 3200,
    mood: "happy",
    tap: true,
  },
  {
    moment: "booked",
    chapter: "pickup",
    ms: 3400,
    mood: "cheer",
  },
  {
    moment: "reminder",
    chapter: "pickup",
    ms: 3000,
    mood: "idle",
  },
  {
    moment: "underway",
    chapter: "pickup",
    ms: 3400,
    mood: "deliver",
    tap: true,
  },
  {
    moment: "done",
    chapter: "pickup",
    ms: 3400,
    mood: "love",
    tap: true,
  },
];

/** When, within a step, the finger taps its control. */
export const TAP_MS = 1100;

export function stepOf(moment: Moment) {
  const index = STEPS.findIndex((step) => step.moment === moment);
  if (index < 0) throw new Error(`No step shows "${moment}".`);
  return index;
}
