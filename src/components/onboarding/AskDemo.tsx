import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Check, MapPin, Send } from "@/components/icons";
import { cn } from "@/lib/utils";
import { money } from "../../../shared/marketplace";
import { StepMark } from "../AgentActivity";
import { Button } from "../ui/button";
import {
  exampleSearch,
  offersFor,
  placeById,
  searchSteps,
  type Offer,
} from "./onboardingContent";
import { itemIcons, type IntroIcon } from "./onboardingIcons";
import type { PakoMood, SceneProps } from "./storyTypes";
import { useRevealOnMount, useTimeline, useTypewriter } from "./useStory";
import "./agent-demos.css";

/** A moment to read Pako's bubble before the request starts typing. */
const INTRO_BEATS = [600] as const;
const SEND_PAUSE_MS = 450;
const STEP_MS = 700;
const REVIEW_MS = 450;
const OFFER_STAGGER_S = 0.08;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** After typing: a pause on the full request, one beat per search step, a last look at the checks. */
function searchBeats(stepCount: number) {
  return [SEND_PAUSE_MS, ...Array<number>(stepCount).fill(STEP_MS), REVIEW_MS];
}

function bestOffer(offers: Offer[]) {
  const best = offers.find((offer) => offer.best);
  if (!best) throw new Error("The search scene needs a best match.");
  return best;
}

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** The "ask" scene: a request in plain words, the search, and the visitor's pick. */
export default function AskDemo({ answers, onMood, onDone }: SceneProps) {
  const [firstItem] = answers.items;
  const request = exampleSearch(answers.items);
  const steps = useMemo(() => searchSteps(answers.place), [answers.place]);
  const offers = useMemo(() => offersFor(firstItem), [firstItem]);
  const beats = useMemo(() => searchBeats(steps.length), [steps.length]);
  const started = useTimeline(INTRO_BEATS) >= INTRO_BEATS.length;
  const { typed, done: typedDone } = useTypewriter(request, started);
  const beat = useTimeline(beats, typedDone);
  const [picked, setPicked] = useState<number | null>(null);

  const sent = beat >= 1;
  const showResults = beat >= beats.length;
  const mood: PakoMood =
    picked !== null ? "happy" : sent && !showResults ? "work" : "idle";
  const announceMood = useEffectEvent(onMood);
  useEffect(() => announceMood(mood), [mood]);

  function pick(index: number) {
    if (picked === null) onDone();
    setPicked(index);
  }

  function status() {
    if (picked !== null) return `You picked ${offers[picked].title}.`;
    if (showResults) {
      const best = bestOffer(offers);
      return `Found ${offers.length} offers. Best match: ${best.title}, ${money(best.price)}, ${best.distanceKm} km away. Pick one to continue.`;
    }
    if (beat > steps.length) return "Search finished.";
    if (beat > 1) return `${steps[beat - 1]}…`;
    if (sent) return `Request sent: ${request}. ${steps[0]}…`;
    return "";
  }

  return (
    <div className="ob-stage ob-ask">
      <span className="ob-demo-tag">Example</span>
      <p className="ob-ask-head">
        <MapPin size={14} aria-hidden="true" />
        Near {placeById(answers.place).name}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.p
            key="request"
            className="ob-ask-request"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
          >
            {request}
          </motion.p>
        ) : (
          <Composer key="composer" typed={typed} ready={typedDone} />
        )}
      </AnimatePresence>
      {sent &&
        (showResults ? (
          <motion.p
            className="ob-ask-step"
            data-done
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <StepMark state="done" />
            Found {offers.length} offers
          </motion.p>
        ) : (
          <SearchSteps
            steps={steps}
            visible={clamp(beat, steps.length)}
            done={clamp(beat - 1, steps.length)}
          />
        ))}
      {showResults && (
        <OfferList
          offers={offers}
          Icon={itemIcons[firstItem]}
          picked={picked}
          onPick={pick}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {status()}
      </p>
    </div>
  );
}

/** The search box typing the request; the scene announces it once it is sent. */
function Composer({ typed, ready }: { typed: string; ready: boolean }) {
  return (
    <motion.div
      className="ob-ask-composer"
      aria-hidden="true"
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
    >
      <p className="ob-ask-typed">
        {typed}
        <span className="ob-ask-caret" />
      </p>
      <motion.span
        className="ob-ask-send"
        data-ready={ready || undefined}
        animate={ready ? { scale: [1, 0.84, 1] } : undefined}
        transition={{ delay: 0.24, duration: 0.24, ease: "easeInOut" }}
      >
        <Send size={16} />
      </motion.span>
    </motion.div>
  );
}

function SearchSteps({
  steps,
  visible,
  done,
}: {
  steps: string[];
  visible: number;
  done: number;
}) {
  return (
    <ol className="ob-ask-steps">
      {steps.slice(0, visible).map((step, index) => (
        <motion.li
          key={step}
          className="ob-ask-step"
          data-done={index < done || undefined}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT }}
        >
          <StepMark state={index < done ? "done" : "running"} />
          {step}
        </motion.li>
      ))}
    </ol>
  );
}

function OfferList({
  offers,
  Icon,
  picked,
  onPick,
}: {
  offers: Offer[];
  Icon: IntroIcon;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const list = useRevealOnMount<HTMLUListElement>();
  return (
    <ul
      ref={list}
      className="ob-ask-offers"
      data-picked={picked !== null || undefined}
    >
      {offers.map((offer, index) => (
        <motion.li
          key={offer.title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: index * OFFER_STAGGER_S,
            type: "spring",
            stiffness: 420,
            damping: 32,
          }}
        >
          <OfferCard
            offer={offer}
            Icon={Icon}
            selected={picked === index}
            hinted={offer.best && picked === null}
            onPick={() => onPick(index)}
          />
        </motion.li>
      ))}
    </ul>
  );
}

function OfferCard({
  offer,
  Icon,
  selected,
  hinted,
  onPick,
}: {
  offer: Offer;
  Icon: IntroIcon;
  selected: boolean;
  hinted: boolean;
  onPick: () => void;
}) {
  return (
    <Button
      className={cn("ob-ask-offer", hinted && "ob-tap-hint")}
      aria-pressed={selected}
      aria-label={`Pick ${offer.title}, ${money(offer.price)}, ${offer.distanceKm} km away`}
      onClick={onPick}
    >
      {offer.best && <span className="ob-ask-best">Best match</span>}
      <span className="ob-ask-tile" aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="ob-ask-offer-text">
        <span className="ob-ask-offer-title">{offer.title}</span>
        <span className="ob-ask-offer-meta">
          {offer.distanceKm} km · {offer.condition} ·{" "}
          <span data-source={offer.source}>{offer.source}</span>
        </span>
      </span>
      <span className="ob-ask-offer-price">{money(offer.price)}</span>
      {selected && (
        <span className="ob-ask-offer-check" aria-hidden="true">
          <Check animate size={13} strokeWidth={3} />
        </span>
      )}
    </Button>
  );
}
