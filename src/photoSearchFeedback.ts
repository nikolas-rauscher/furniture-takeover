import type { PakoMood } from "./components/onboarding/storyTypes";

/** What Pako tells the student on home when a photo search needs them. */
export type PhotoSearchNotice = {
  kind: "clarification" | "error";
  mood: PakoMood;
  line: string;
};

export function photoSearchClarification(): PhotoSearchNotice {
  return {
    kind: "clarification",
    mood: "think",
    line: "I can't tell which item you mean. Describe it in the search box, or try a clearer photo.",
  };
}

/** A failure keeps its own actionable sentence, such as a photo that is too large. */
export function photoSearchFailure(error: unknown): PhotoSearchNotice {
  return {
    kind: "error",
    mood: "dizzy",
    line:
      error instanceof Error && error.message.trim()
        ? error.message
        : "That photo didn't work for me. Try it again, or describe the item in the search box.",
  };
}
