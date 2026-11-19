import { motion, useReducedMotion, type Transition } from "motion/react";
import { Fragment, useState, type ReactNode } from "react";
import Pako, { PAKO_OPENING } from "./Pako";
import type { PakoMood } from "./storyTypes";
import "./pako.css";

export type GuideBubble = { id: string; title?: string; text: string };
type GuideLayout = "hero" | "guide";

const PAKO_SIZE: Record<GuideLayout, number> = { hero: 168, guide: 84 };
const TRAVEL: Transition = { type: "spring", stiffness: 260, damping: 30 };
const POP: Transition = { type: "spring", stiffness: 480, damping: 28 };
const WORD_STEP = 0.03;
const REVEAL_CAP = 0.7;
const REVEAL_DELAY = 0.1;

/** Words appear one by one; words joined by a no-break space appear, and wrap, as one. */
const splitWords = (text: string) => text.split(/[^\S\u00a0]+/).filter(Boolean);

/** Reveals words one after another; the last one reports when Pako has finished speaking. */
function SpokenWords({
  words,
  first,
  step,
  onSpoken,
}: {
  words: string[];
  first: number;
  step: number;
  onSpoken?: () => void;
}) {
  return words.map((word, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <motion.span
        className="ob-bubble-word"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: REVEAL_DELAY + (first + index) * step,
          duration: 0.24,
          ease: [0.16, 1, 0.3, 1],
        }}
        onAnimationComplete={index === words.length - 1 ? onSpoken : undefined}
      >
        {word}
      </motion.span>
    </Fragment>
  ));
}

function BubbleLines({
  bubble,
  onSpoken,
}: {
  bubble: GuideBubble;
  onSpoken: () => void;
}) {
  const titleWords = bubble.title ? splitWords(bubble.title) : [];
  const textWords = splitWords(bubble.text);
  const step = Math.min(
    WORD_STEP,
    REVEAL_CAP / (titleWords.length + textWords.length),
  );
  return (
    <>
      {bubble.title && (
        <p className="ob-bubble-title">
          <SpokenWords words={titleWords} first={0} step={step} />
        </p>
      )}
      <p className="ob-bubble-text">
        <SpokenWords
          words={textWords}
          first={titleWords.length}
          step={step}
          onSpoken={onSpoken}
        />
      </p>
    </>
  );
}

/** Pops in from its tail. The visible words are decoration; the sentence is read once, in full. */
function Bubble({
  bubble,
  reduced,
  onSpoken,
}: {
  bubble: GuideBubble;
  reduced: boolean;
  onSpoken: () => void;
}) {
  return (
    <motion.div
      className="ob-bubble"
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={POP}
      style={{ originX: 0, originY: 0.5 }}
    >
      <p className="sr-only">
        {bubble.title ? `${bubble.title} ${bubble.text}` : bubble.text}
      </p>
      <div aria-hidden="true">
        {reduced ? (
          <>
            {bubble.title && <p className="ob-bubble-title">{bubble.title}</p>}
            <p className="ob-bubble-text">{bubble.text}</p>
          </>
        ) : (
          <BubbleLines bubble={bubble} onSpoken={onSpoken} />
        )}
      </div>
    </motion.div>
  );
}

/**
 * Pako stays on screen for the whole intro: big and centred as the hero,
 * small beside a speech bubble as the guide. It travels between both places.
 */
export default function Guide({
  mood,
  layout,
  bubble,
  burst,
}: {
  mood: PakoMood;
  layout: GuideLayout;
  bubble?: GuideBubble;
  burst?: ReactNode;
}) {
  const reduced = useReducedMotion() === true;
  const [spokenId, setSpokenId] = useState<string>();
  const speech = layout === "guide" ? bubble : undefined;
  const talking = Boolean(speech && !reduced && spokenId !== speech.id);
  return (
    <div className="ob-guide" data-layout={layout}>
      <div className="ob-guide-stage">
        <motion.div
          className="ob-guide-pako"
          layout
          layoutDependency={layout}
          transition={{ layout: TRAVEL }}
        >
          <Pako mood={mood} size={PAKO_SIZE[layout]} talking={talking} />
        </motion.div>
        {layout === "hero" && burst && (
          <div
            className="ob-burst-anchor"
            style={{
              left: `${PAKO_OPENING.x * 100}%`,
              top: `${PAKO_OPENING.y * 100}%`,
            }}
          >
            {burst}
          </div>
        )}
      </div>
      <div className="ob-bubble-live" aria-live="polite">
        {speech && (
          <Bubble
            key={speech.id}
            bubble={speech}
            reduced={reduced}
            onSpoken={() => setSpokenId(speech.id)}
          />
        )}
      </div>
    </div>
  );
}
