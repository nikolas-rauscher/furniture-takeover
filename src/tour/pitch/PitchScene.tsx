import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Pako from "@/components/onboarding/Pako";
import type {
  Act,
  CompleteAnswers,
} from "@/components/onboarding/onboardingContent";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import PhoneFrame from "../PhoneFrame";
import { TOUR_SCENES } from "../tourScenes";

/** Share of the frame that has to be on screen before its scene starts. */
const START_VISIBLE = 0.3;

/** Becomes true once the element has been on screen, and stays true. */
function useSeen<T extends HTMLElement>() {
  const element = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const target = element.current;
    if (!target || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: START_VISIBLE },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [seen]);
  return { element, seen };
}

export type PitchSceneProps = {
  id: string;
  title: string;
  sentences: [string, string];
  act: Act;
  answers: CompleteAnswers;
};

/** One part of the tour: two sentences beside the scene that shows them. */
export default function PitchScene({
  id,
  title,
  sentences,
  act,
  answers,
}: PitchSceneProps) {
  const { element, seen } = useSeen<HTMLDivElement>();
  const [round, setRound] = useState(0);
  const [mood, setMood] = useState<PakoMood>("idle");
  const [finished, setFinished] = useState(false);
  const Scene = TOUR_SCENES[act];
  const titleId = `${id}-title`;

  function replay() {
    setFinished(false);
    setMood("idle");
    setRound((current) => current + 1);
  }

  return (
    <section id={id} className="tour-section" aria-labelledby={titleId}>
      <div className="tour-section-text">
        <div className="tour-section-head">
          <Pako mood={mood} size={64} />
          <h2 id={titleId} className="tour-section-title">
            {title}
          </h2>
        </div>
        {sentences.map((sentence) => (
          <p key={sentence} className="ob-lead">
            {sentence}
          </p>
        ))}
        <Button
          className="button secondary small tour-replay"
          disabled={!seen}
          onClick={replay}
        >
          <RotateCcw size={16} aria-hidden="true" />
          Replay
        </Button>
        <p className="sr-only" role="status">
          {finished ? `${title}: the example has finished.` : ""}
        </p>
      </div>
      <div
        ref={element}
        className="tour-section-frame"
        data-seen={seen || undefined}
      >
        <PhoneFrame label={`${title}, example screen`}>
          {seen ? (
            <Scene
              key={round}
              answers={answers}
              onMood={setMood}
              onDone={() => setFinished(true)}
            />
          ) : (
            <div className="tour-phone-waiting" />
          )}
        </PhoneFrame>
      </div>
    </section>
  );
}
