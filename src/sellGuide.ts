import type { AgentMetadata } from "../shared/agent";
import { money } from "../shared/marketplace.ts";
import type { GuideBubble } from "./components/onboarding/Guide";
import type { PakoMood } from "./components/onboarding/storyTypes";
import type { PhotoInsight } from "./hooks/useListingAnalysis";

/** The words on the photo step's main button, which Pako's lines invite the student to tap. */
export const WRITE_ACTION = "Write my listing";

export type SellGuide = { mood: PakoMood; bubble: GuideBubble };

/** Lines while Pako is busy share one bubble, so their text changes in place. */
const WORKING = "working";
const MAX_HINT_WORDS = 4;
const OWN_TOPICS =
  /\b(?:price|prices|pricing|cost|pickup|pick up|collect\w*|location|where)\b/i;

/** A phrase as it reads inside a sentence: "Screen size" becomes "screen size", "RAM" stays. */
const inSentence = (phrase: string) =>
  /^[A-Z][a-z]/.test(phrase)
    ? phrase[0].toLowerCase() + phrase.slice(1)
    : phrase;

const both = (words: readonly string[]) =>
  words.length === 2 ? `${words[0]} and ${words[1]}` : words.join("");

/**
 * Up to two details buyers ask about, from what the photo analysis found missing:
 * short phrases only, without the price or pickup Pako asks about himself.
 */
export function buyerQuestions(missingDetails: readonly string[]): string[] {
  return missingDetails
    .map((detail) => detail.trim())
    .filter(
      (detail) =>
        detail &&
        !detail.includes("?") &&
        detail.split(/\s+/).length <= MAX_HINT_WORDS &&
        !OWN_TOPICS.test(detail),
    )
    .slice(0, 2)
    .map(inSentence);
}

/** What Pako recognised, in one sentence: the item, then facts from the note it does not name yet. */
export function recognisedLine(
  metadata: Pick<AgentMetadata, "title" | "dimensions" | "condition" | "price">,
): string {
  const title = metadata.title?.trim() ?? "";
  const named = title.toLowerCase();
  const facts = [metadata.dimensions, metadata.condition]
    .map((fact) => fact?.trim() ?? "")
    .filter((fact) => fact && !named.includes(fact.toLowerCase()))
    .map(inSentence);
  const item = [title, ...facts].join(", ");
  if (metadata.price == null) return item;
  return metadata.price === 0
    ? `${item} for free`
    : `${item} for ${money(metadata.price)}`;
}

function recognised(
  response: Extract<PhotoInsight, { status: "ready" }>["response"],
  note: string,
): SellGuide {
  const { metadata } = response;
  if (!metadata.title?.trim())
    return {
      mood: "think",
      bubble: {
        id: "unrecognised",
        title: "Nice photo!",
        text: "I can't tell what it is yet. Add a note with its name and I'll take it from there.",
      },
    };
  const next =
    metadata.price == null
      ? `Tap ${WRITE_ACTION} and I'll check what similar ones sell for.`
      : `Tap ${WRITE_ACTION} and I'll ask you a couple of quick things.`;
  const hints = buyerQuestions(response.missingDetails);
  const hint = hints.length ? ` Buyers often ask about ${both(hints)}.` : "";
  const text = `${recognisedLine(metadata)}. ${next}${hint}`;
  return {
    mood: "happy",
    bubble: {
      id: `recognised:${text}`,
      title: note.trim() ? "Okay, got it!" : "Oh, nice!",
      text,
    },
  };
}

function insightGuide(insight: PhotoInsight): SellGuide {
  switch (insight.status) {
    case "reading":
      return {
        mood: "think",
        bubble: {
          id: WORKING,
          text: insight.noteOnly ? "Reading your note…" : "Let me have a look…",
        },
      };
    case "ready":
      return recognised(insight.response, insight.note);
    case "failed":
      return {
        mood: "dizzy",
        bubble: {
          id: "failed",
          title: "Hmm, that didn't work",
          text: `I couldn't read your photos. Try again, or tap ${WRITE_ACTION} and I'll look once more.`,
        },
      };
    case "unavailable":
    case "empty":
      return {
        mood: "happy",
        bubble: {
          id: "photos",
          title: "Looking good!",
          text: `Add a note if you like, then tap ${WRITE_ACTION}.`,
        },
      };
  }
}

/**
 * What Pako says beside the photos: what to do next, what he is busy with, or
 * what he recognised. He sleeps once the day's allowance is used and listens
 * while details are written.
 */
export function sellGuide({
  photoCount,
  photoReading,
  preparing,
  allowanceUsed,
  hasPlace,
  typing,
  insight,
}: {
  photoCount: number;
  photoReading: boolean;
  /** The draft is being prepared from step 1. */
  preparing: boolean;
  allowanceUsed: boolean;
  /** A pickup place is set. */
  hasPlace: boolean;
  /** The Details field has focus. */
  typing: boolean;
  insight: PhotoInsight;
}): SellGuide {
  if (preparing)
    return {
      mood: "work",
      bubble: {
        id: "writing",
        title: "Writing your listing…",
        text: "I'm looking at your photos and notes.",
      },
    };
  if (photoReading)
    return {
      mood: "work",
      bubble: { id: WORKING, text: "Loading your photo…" },
    };
  if (allowanceUsed)
    return {
      mood: "sleep",
      bubble: {
        id: "quota",
        title: "That's all for today",
        text: "I've used today's writing allowance. Try again tomorrow.",
      },
    };
  if (photoCount === 0)
    return {
      mood: typing ? "listen" : "wave",
      bubble: {
        id: "empty",
        title: "Snap what's left in your room",
        text: "Add a few photos. I'll write the listing and suggest a price.",
      },
    };
  if (!hasPlace)
    return {
      mood: "listen",
      bubble: {
        id: "place",
        title: "Where can buyers pick it up?",
        text: `Add a place below, then tap ${WRITE_ACTION}.`,
      },
    };
  const guide = insightGuide(insight);
  return typing ? { ...guide, mood: "listen" } : guide;
}
