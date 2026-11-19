import { Dialog } from "@base-ui/react/dialog";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Variants,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, Clock } from "@/components/icons";
import { Button } from "../ui/button";
import AskDemo from "./AskDemo";
import Celebration from "./Celebration";
import ChatDemo from "./ChatDemo";
import ChoiceList, {
  type ChoiceListProps,
  type ChoiceOption,
  type ChoiceTint,
} from "./ChoiceList";
import Confetti from "./Confetti";
import Guide from "./Guide";
import SnapDemo from "./SnapDemo";
import WelcomeBurst from "./WelcomeBurst";
import {
  intentOptions,
  isComplete,
  items,
  places,
  type Act,
  type Answers,
  type CompleteAnswers,
  type Intent,
  type ItemId,
  type Place,
  type PlaceId,
} from "./onboardingContent";
import {
  STEP_COUNT,
  canContinue,
  exploreOutcome,
  finalAction,
  heroStep,
  isAct,
  isQuestion,
  itemsQuestion,
  questions,
  stepAt,
  stepBubble,
  stepMood,
  type OnboardingOutcome,
  type QuestionStep,
  type StepId,
} from "./onboardingFlow";
import { intentIcons, itemIcons, placeIcons } from "./onboardingIcons";
import type { PakoMood, SceneProps } from "./storyTypes";
import "./onboarding.css";
import "./onboarding-shell.css";

export type { OnboardingOutcome } from "./onboardingFlow";

type OnboardingProps = {
  /** Accounts are configured and the visitor is not signed in yet. */
  accountAction: boolean;
  /** Called as soon as the visitor decides how the intro ends. */
  onComplete: (outcome: OnboardingOutcome) => void;
  /** Called once the closing animation has finished. */
  onClosed: () => void;
};

const WELCOME_HEADING = "ob-welcome-title";
const DONE_HEADING = "ob-done-title";
/** How long Pako stays happy about an answer before settling again. */
const PICK_MOOD_MS = 1400;

const INTENT_TINTS: Record<Intent, ChoiceTint> = {
  sell: "sand",
  find: "sky",
  both: "butter",
};
const PLACE_TINTS: Record<Place["kind"], ChoiceTint> = {
  campus: "sky",
  residence: "sand",
  city: "butter",
};
const intentChoices: ChoiceOption<Intent>[] = intentOptions.map(
  ({ id, title, detail }) => ({
    id,
    title,
    detail,
    icon: intentIcons[id],
    tint: INTENT_TINTS[id],
  }),
);
const placeChoices: ChoiceOption<PlaceId>[] = places.map(
  ({ id, name, area, kind }) => ({
    id,
    title: name,
    detail: area,
    icon: placeIcons[kind],
    tint: PLACE_TINTS[kind],
  }),
);
const itemChoices: ChoiceOption<ItemId>[] = items.map(({ id, label }) => ({
  id,
  title: label,
  icon: itemIcons[id],
  tint: "sand",
}));

const scenes: Record<Act, ComponentType<SceneProps>> = {
  snap: SnapDemo,
  ask: AskDemo,
  chat: ChatDemo,
};

/** Steps slide in the direction of travel; the very first one rises in. */
const stepMotion: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 48,
    y: direction === 0 ? 16 : 0,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -32,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
  }),
};

type QuestionView = {
  count: number;
  pickAt: (index: number) => void;
  element: ReactNode;
};

function questionView<Id extends string>(
  props: ChoiceListProps<Id>,
): QuestionView {
  return {
    count: props.options.length,
    pickAt: (index) => props.onToggle(props.options[index].id),
    element: <ChoiceList {...props} />,
  };
}

function requireComplete(answers: Answers): CompleteAnswers {
  if (!isComplete(answers))
    throw new Error("The story needs all three answers.");
  return answers;
}

function WelcomeContent() {
  return (
    <div className="ob-welcome">
      <p className="ob-wordmark">takeover</p>
      <h2 id={WELCOME_HEADING} className="ob-title">
        Furniture from students, for students.
      </h2>
      <p className="ob-lead">
        Pass on what you don't need and find what you do, around EPFL, UNIL and
        the FMEL houses.
      </p>
      <p className="ob-caption">
        <Clock size={15} aria-hidden="true" />
        Takes about a minute
      </p>
    </div>
  );
}

type FooterProps = {
  step: StepId;
  ready: boolean;
  accountAction: boolean;
  answers: Answers;
  onNext: () => void;
  onFinish: (outcome: OnboardingOutcome) => void;
};

function StepFooter({
  step,
  ready,
  accountAction,
  answers,
  onNext,
  onFinish,
}: FooterProps) {
  if (step === "welcome")
    return (
      <>
        <Button className="button primary large" onClick={onNext}>
          Get started
        </Button>
        <Button
          className="button quiet large"
          onClick={() =>
            onFinish(accountAction ? { next: "sign-in" } : { next: "dismiss" })
          }
        >
          {accountAction ? "I already have an account" : "Skip intro"}
        </Button>
      </>
    );
  if (step === "done") {
    const complete = requireComplete(answers);
    const action = finalAction(complete, accountAction);
    return (
      <>
        <Button
          className="button primary large"
          onClick={() => onFinish(action.outcome)}
        >
          {action.label}
        </Button>
        <Button
          className="button quiet large"
          onClick={() => onFinish(exploreOutcome(complete))}
        >
          Look around first
        </Button>
      </>
    );
  }
  return (
    <Button className="button primary large" disabled={!ready} onClick={onNext}>
      Continue
    </Button>
  );
}

/** The first-run story: three questions, three scenes and a send-off into the app. */
export default function Onboarding({
  accountAction,
  onComplete,
  onClosed,
}: OnboardingProps) {
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ items: [] });
  const [finishedActs, setFinishedActs] = useState<Act[]>([]);
  const [mood, setMood] = useState<PakoMood>(stepMood("welcome"));
  const settled = useRef(false);
  const navigated = useRef(false);
  const moodTimer = useRef(0);
  const body = useRef<HTMLDivElement>(null);
  // The dialog itself takes focus on open, so no button greets the visitor with a focus ring.
  const popup = useRef<HTMLDivElement>(null);
  const step = stepAt(index, answers.intent);
  const hero = heroStep(step);
  const bubble = stepBubble(step, answers);
  const ready = canContinue(step, answers, finishedActs);
  const question = isQuestion(step) ? questionFor(step) : null;

  useEffect(() => () => window.clearTimeout(moodTimer.current), []);

  /** A new step takes focus once it has slid in, so it is announced and Enter works. */
  const arrive = useCallback((element: HTMLDivElement | null) => {
    if (!element || !navigated.current) return;
    body.current?.scrollTo({ top: 0 });
    element.focus({ preventScroll: true });
  }, []);

  const markSceneDone = useCallback(() => {
    if (!isAct(step)) throw new Error(`Step ${step} has no scene.`);
    setFinishedActs((done) => (done.includes(step) ? done : [...done, step]));
  }, [step]);

  function finish(outcome: OnboardingOutcome) {
    if (settled.current) return;
    settled.current = true;
    onComplete(outcome);
    setOpen(false);
  }

  function goTo(next: number) {
    window.clearTimeout(moodTimer.current);
    navigated.current = true;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    setMood(stepMood(stepAt(next, answers.intent)));
  }

  function reactToPick() {
    window.clearTimeout(moodTimer.current);
    setMood("happy");
    moodTimer.current = window.setTimeout(() => setMood("idle"), PICK_MOOD_MS);
  }

  function pickIntent(intent: Intent) {
    // The scenes change with the intent, so they have to be watched again.
    if (intent !== answers.intent) setFinishedActs([]);
    setAnswers((current) => ({ ...current, intent }));
    reactToPick();
  }

  function pickPlace(place: PlaceId) {
    setAnswers((current) => ({ ...current, place }));
    reactToPick();
  }

  function toggleItem(item: ItemId) {
    if (!answers.items.includes(item)) reactToPick();
    setAnswers((current) => ({
      ...current,
      items: current.items.includes(item)
        ? current.items.filter((id) => id !== item)
        : [...current.items, item],
    }));
  }

  function questionFor(step: QuestionStep): QuestionView {
    if (step === "intent")
      return questionView({
        label: questions.intent.title,
        options: intentChoices,
        selected: answers.intent ? [answers.intent] : [],
        multiple: false,
        layout: "list",
        onToggle: pickIntent,
      });
    if (step === "place")
      return questionView({
        label: questions.place.title,
        options: placeChoices,
        selected: answers.place ? [answers.place] : [],
        multiple: false,
        layout: "grid",
        onToggle: pickPlace,
      });
    return questionView({
      label: itemsQuestion(answers.intent).title,
      options: itemChoices,
      selected: answers.items,
      multiple: true,
      layout: "grid",
      onToggle: toggleItem,
    });
  }

  function storyContent(step: StepId): ReactNode {
    switch (step) {
      case "welcome":
        return <WelcomeContent />;
      case "intro":
        return (
          <p className="ob-note">
            Three quick questions, then I'll show you how it works.
          </p>
        );
      case "done":
        return (
          <Celebration
            answers={requireComplete(answers)}
            headingId={DONE_HEADING}
          />
        );
      case "snap":
      case "ask":
      case "chat": {
        const Scene = scenes[step];
        return (
          <Scene
            answers={requireComplete(answers)}
            onMood={setMood}
            onDone={markSceneDone}
          />
        );
      }
      default:
        throw new Error(`Step ${step} is a question.`);
    }
  }

  // Number keys pick answers and Enter moves on, as long as no control has the key.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    const number = Number(event.key);
    if (
      question &&
      Number.isInteger(number) &&
      number >= 1 &&
      number <= question.count
    ) {
      event.preventDefault();
      question.pickAt(number - 1);
      return;
    }
    if (
      event.key === "Enter" &&
      ready &&
      step !== "done" &&
      !target?.closest("button, a")
    ) {
      event.preventDefault();
      goTo(index + 1);
    }
  }

  // Story steps are named by Pako's line; the welcome and done steps by their heading.
  const stepLabel = bubble
    ? { "aria-label": bubble.title ?? bubble.text }
    : {
        "aria-labelledby": step === "welcome" ? WELCOME_HEADING : DONE_HEADING,
      };

  return (
    <Dialog.Root
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next) finish({ next: "dismiss" });
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClosed();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="ob-backdrop" />
        <Dialog.Popup
          ref={popup}
          initialFocus={popup}
          className="ob"
          data-step={step}
          data-layout={hero ? "hero" : "guide"}
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">Welcome to takeover</Dialog.Title>
          <MotionConfig reducedMotion="user">
            <header
              className="ob-header"
              data-hidden={step === "welcome" || undefined}
              inert={step === "welcome"}
            >
              <Button
                className="ob-back"
                aria-label="Back"
                onClick={() => goTo(index - 1)}
              >
                <ArrowLeft size={22} aria-hidden="true" />
              </Button>
              <div
                className="ob-progress"
                role="progressbar"
                aria-label="Intro progress"
                aria-valuemin={0}
                aria-valuemax={STEP_COUNT - 1}
                aria-valuenow={index}
                aria-valuetext={`Step ${index} of ${STEP_COUNT - 1}`}
              >
                <motion.span
                  className="ob-progress-fill"
                  initial={false}
                  animate={{ width: `${(index / (STEP_COUNT - 1)) * 100}%` }}
                  transition={{ type: "spring", stiffness: 170, damping: 24 }}
                />
              </div>
              <Button
                className="ob-skip"
                data-hidden={step === "done" || undefined}
                inert={step === "done"}
                onClick={() => finish({ next: "dismiss" })}
              >
                Skip
              </Button>
            </header>
            <div className="ob-body" ref={body}>
              <div className="ob-body-inner">
                <Guide
                  mood={mood}
                  layout={hero ? "hero" : "guide"}
                  bubble={bubble}
                  burst={
                    step === "welcome" ? (
                      <WelcomeBurst />
                    ) : step === "done" ? (
                      <Confetti />
                    ) : undefined
                  }
                />
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    ref={arrive}
                    className="ob-step"
                    role="group"
                    tabIndex={-1}
                    {...stepLabel}
                    custom={direction}
                    variants={stepMotion}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {question ? question.element : storyContent(step)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <footer className="ob-footer">
              <StepFooter
                step={step}
                ready={ready}
                accountAction={accountAction}
                answers={answers}
                onNext={() => goTo(index + 1)}
                onFinish={finish}
              />
            </footer>
          </MotionConfig>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
