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

export type Chapter = "Search" | "Messages" | "Pickup";

export type Step = {
  moment: Moment;
  chapter: Chapter;
  /** How long the step stays before the next one. */
  ms: number;
  mood: PakoMood;
  /** Pako's line in his bubble. */
  line: string;
  /** The student taps a control in this step; the change follows the tap. */
  tap?: true;
};

export const CHAPTERS: readonly Chapter[] = ["Search", "Messages", "Pickup"];

export const STEPS: readonly Step[] = [
  {
    moment: "scattered",
    chapter: "Search",
    ms: 3600,
    mood: "idle",
    line: "Desks are posted in many places, and every seller gets the same questions.",
  },
  {
    moment: "sorted",
    chapter: "Search",
    ms: 4200,
    mood: "search",
    line: "I check student listings and keep what fits: two desks under CHF 80 near Vortex.",
  },
  {
    moment: "pile",
    chapter: "Messages",
    ms: 3800,
    mood: "listen",
    line: "Then the messages start: the price, the time, the place, and someone running late.",
  },
  {
    moment: "offer",
    chapter: "Messages",
    ms: 3600,
    mood: "work",
    line: "I put the price, the time and the meeting point into one offer. You check it.",
  },
  {
    moment: "sent",
    chapter: "Messages",
    ms: 3200,
    mood: "happy",
    line: "Only your tap sends it. I never send anything myself.",
    tap: true,
  },
  {
    moment: "booked",
    chapter: "Pickup",
    ms: 3400,
    mood: "cheer",
    line: "Léa confirms on her side, so the pickup is booked.",
  },
  {
    moment: "reminder",
    chapter: "Pickup",
    ms: 3000,
    mood: "idle",
    line: "Before the pickup, a reminder.",
  },
  {
    moment: "underway",
    chapter: "Pickup",
    ms: 3400,
    mood: "deliver",
    line: "On the way, one tap tells Léa: On my way, or Running late.",
    tap: true,
  },
  {
    moment: "done",
    chapter: "Pickup",
    ms: 3400,
    mood: "love",
    line: "After the handover you tap Picked up. Done.",
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

/** For screen readers: the whole animation in a few sentences. */
export const BACK_AND_FORTH_LABEL =
  "Animation in three parts. Search: desks posted in many places shrink into Pako's short list of two that fit. Messages: a pile of questions becomes one offer with price, time and meeting point, which the student sends with a tap. Pickup: Léa confirms, the pickup is booked, a reminder arrives, the student taps On my way and, after the handover, Picked up.";
