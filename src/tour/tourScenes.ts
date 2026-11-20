import AskDemo from "../components/onboarding/AskDemo";
import ChatDemo from "../components/onboarding/ChatDemo";
import SnapDemo from "../components/onboarding/SnapDemo";
import type {
  Act,
  CompleteAnswers,
} from "../components/onboarding/onboardingContent";
import type { SceneProps } from "../components/onboarding/storyTypes";
import type { ComponentType } from "react";

/** The intro's scenes, played with fixed example answers instead of the visitor's. */
export const TOUR_SCENES: Record<Act, ComponentType<SceneProps>> = {
  snap: SnapDemo,
  ask: AskDemo,
  chat: ChatDemo,
};

/** A student in the Atrium residence selling a desk… */
export const SELLER_ANSWERS: CompleteAnswers = {
  intent: "sell",
  place: "atrium",
  items: ["desk"],
};

/** …and one moving in who needs a desk and a lamp. */
export const BUYER_ANSWERS: CompleteAnswers = {
  intent: "find",
  place: "atrium",
  items: ["desk", "lamp"],
};
