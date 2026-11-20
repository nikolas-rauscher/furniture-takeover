import type { ComponentType } from "react";
import AskDemo from "@/components/onboarding/AskDemo";
import ChatDemo from "@/components/onboarding/ChatDemo";
import SnapDemo from "@/components/onboarding/SnapDemo";
import type { CompleteAnswers } from "@/components/onboarding/onboardingContent";
import type { SceneProps } from "@/components/onboarding/storyTypes";
import type { TourScene } from "../device/sceneMessages";

type IllustratedScene = {
  Scene: ComponentType<SceneProps>;
  /** Fixed example answers in place of a visitor's. */
  answers: CompleteAnswers;
};

/** Someone moving into the Atrium residence who needs a desk and a lamp. */
const BUYER_ANSWERS: CompleteAnswers = {
  intent: "find",
  place: "atrium",
  items: ["desk", "lamp"],
};

/** The intro's drawn scenes for each part of the tour, as the pitch first showed them. */
export const ILLUSTRATED_SCENES: Record<TourScene, IllustratedScene> = {
  find: { Scene: AskDemo, answers: BUYER_ANSWERS },
  sell: {
    Scene: SnapDemo,
    answers: { intent: "sell", place: "atrium", items: ["desk"] },
  },
  deal: { Scene: ChatDemo, answers: BUYER_ANSWERS },
};

/** The pitch's opening search: someone at EPFL looking for a chair. */
export const HERO_ANSWERS: CompleteAnswers = {
  intent: "find",
  place: "epfl",
  items: ["chair"],
};
