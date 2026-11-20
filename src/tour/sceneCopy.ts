import type { TourScene } from "./device/sceneMessages";

type SceneCopy = {
  /** Pako's line beside the scene in the study. */
  title: string;
  text: string;
  /** What the scene shows, for anyone who cannot see it. */
  label: string;
};

export const SCENE_COPY: Record<TourScene, SceneCopy> = {
  find: {
    title: "Just say what you need",
    text: "Someone near Vortex needs a desk. I check student listings and draft the offer. Nothing is sent without their tap.",
    label:
      "Example in the app: a student types “a desk under CHF 80 near Vortex”, Pako searches student listings and shows two desks, and the student opens the compact study desk and sends Pako's offer of CHF 35 to Léa.",
  },
  sell: {
    title: "Start with a photo",
    text: "Léa takes a photo of her desk. I write the listing and suggest a price. She picks her own and saves it.",
    label:
      "Example in the app: Léa adds a photo of her desk, Pako writes the listing and asks when buyers can pick it up, suggests CHF 35, and Léa sets CHF 40 and saves the listing on her device.",
  },
  deal: {
    title: "Agree and pick up",
    text: "Noah offers CHF 35 and Léa confirms, so the pickup is booked. At pickup time both of them confirm the handover.",
    label:
      "Example in the app: Noah offers CHF 35 for Léa's desk, Léa taps Confirm sale, the pickup is booked and counts down, Noah taps Picked up and Léa marks the desk sold.",
  },
};
