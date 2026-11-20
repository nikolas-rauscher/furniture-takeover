import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AgentQuestionEvent } from "../../shared/actions";
import { Check, LoaderCircle, Sparkles } from "@/components/icons";
import { TODAY } from "../../shared/marketplace";
import type { AgentRunState } from "../hooks/useAgentRun";
import { useMomentPassed } from "../hooks/useMomentPassed";
import {
  asksPrice,
  splitQuestion,
  type PriceSuggestion,
  type ListingPhase,
} from "../listingQuestions";
import { REACTION_MS, listingMood, workingLine } from "../pakoMoods";
import { answerParts } from "./AgentAnswerContent";
import { POLISH_DESCRIPTION } from "./AskPakoMenu";
import { usePakoPlace } from "./ListingChat";
import PakoReaction from "./PakoReaction";
import PriceCard from "./PriceCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import "./listing-pako.css";

/** Pako's bubble pops in from its tail, like his bubbles in the intro. */
const POP = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { type: "spring", stiffness: 480, damping: 28 },
} as const;
/** Each new line settles in place of the last one, like the listing card's details. */
const SETTLE = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 30 },
} as const;
/** What Pako says before the listing has a conversation, or after one was stopped. */
const IDLE_LINES = {
  empty: "Tell Pako what you’d like to change.",
  stopped: "Stopped. You can run this request again when you are ready.",
};
/** A tapped answer fills and shows its check this long before the next question comes. */
const CHOSEN_MS = 140;
/** The bubble always offers its own Skip, so Pako's skip answers are not repeated. */
const SKIP_ANSWER = /^skip(?: for now)?\.?$/i;
/**
 * When the student asks to decide the price, the bubble lights up and Pako hops, so
 * the tap visibly lands even while the question is already on screen.
 */
const NUDGE_BUBBLE: Keyframe[] = [
  {
    backgroundColor: "var(--selected)",
    boxShadow: "0 4px 0 var(--lip), inset 0 0 0 2px var(--blue)",
  },
  {
    backgroundColor: "var(--surface)",
    boxShadow: "0 4px 0 var(--lip), inset 0 0 0 0 var(--blue)",
  },
];
const PAKO_HOP: Keyframe[] = [
  { translate: "0 0" },
  { translate: "0 -4px", offset: 0.35 },
  { translate: "0 0" },
];
const NUDGE_TIMING: KeyframeAnimationOptions = {
  duration: 560,
  easing: "ease-out",
};

type Props = {
  phase: ListingPhase;
  turn: AgentRunState;
  question?: AgentQuestionEvent;
  /** The questions of this turn in order, answered ones included. */
  queue: readonly AgentQuestionEvent[];
  /** Questions answered or skipped in the listing's earlier turns; the count goes on from them. */
  answeredBefore: number;
  suggestion?: PriceSuggestion;
  closing: { title: string; text: string };
  /** What Pako answered, said before his first question or with his closing line. */
  reply: string;
  /** Why the last tap could not apply. */
  tapError?: string;
  /** Grows when the student asks to decide the price, which then takes focus. */
  focusRequest: number;
  /** The answers wait for Pako's run to end; his own questions can be answered meanwhile. */
  waiting: boolean;
  /** Offered with Pako's pickup question: the last day buyers can collect the item. */
  onPickupDate?: (questionId: string, date: string) => boolean;
  /** Whether the tap applied; one that could not keeps its question. */
  onChoose: (questionId: string, label: string) => boolean;
  onPrice: (questionId: string, price: number) => void;
  onSkip: (questionId: string) => void;
  onLater: (questionId: string) => void;
  onRetry: () => void;
  /** Goes on without Pako: the student fills in the details. */
  onManual: () => void;
  /** Asks Pako to polish the description once he has asked everything; absent while he cannot help. */
  onPolish?: () => void;
};

/**
 * Where this question stands among the listing's questions, as a short count that
 * goes on from the questions of earlier turns.
 */
function Progress({
  queue,
  answeredBefore,
  current,
}: {
  queue: readonly AgentQuestionEvent[];
  answeredBefore: number;
  current: string;
}) {
  const total = answeredBefore + queue.length;
  if (total < 2) return null;
  const position =
    answeredBefore + queue.findIndex((item) => item.id === current) + 1;
  return (
    <span className="listing-pako-progress">
      <span className="sr-only">Question </span>
      {position} of {total}
    </span>
  );
}

type TitleProps = {
  ref: (node: HTMLElement | null) => void;
  tabIndex: number;
  "data-content": string;
};

/** "Until a date…" opens a date field; its date becomes the listing's last pickup day. */
function PickupDate({
  disabled,
  onSet,
}: {
  disabled: boolean;
  onSet: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const fieldId = useId();
  if (!open)
    return (
      <Button
        className="listing-pako-choice"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Until a date…
      </Button>
    );
  return (
    <span className="listing-pako-date">
      <label htmlFor={fieldId} className="sr-only">
        Pickup deadline
      </label>
      <Input
        id={fieldId}
        type="date"
        min={TODAY}
        value={date}
        autoFocus
        onChange={(event) => setDate(event.target.value)}
      />
      <Button
        className="button primary small"
        disabled={disabled || !date}
        onClick={() => onSet(date)}
      >
        Set date
      </Button>
    </span>
  );
}

/** While Pako asks his own question, his bubble still says what his run is doing. */
function Meanwhile({
  turn,
  onRetry,
}: {
  turn: AgentRunState;
  onRetry: () => void;
}) {
  if (turn.status === "running")
    return (
      <p className="listing-pako-meanwhile">
        <LoaderCircle size={14} animate aria-hidden="true" />
        {workingLine(turn, undefined, "listing")}
      </p>
    );
  if (turn.status !== "error") return null;
  return (
    <p className="listing-pako-meanwhile" role="alert">
      I couldn't check asking prices. {turn.error}
      <Button className="button quiet small" onClick={onRetry}>
        Try again
      </Button>
    </p>
  );
}

/** The live step line, with what the step looks at on a quieter line below it. */
function WorkingLine({
  turn,
  titleProps,
}: {
  turn: AgentRunState;
  titleProps: TitleProps;
}) {
  const line = workingLine(turn, undefined, "listing");
  const detail = turn.steps
    .filter((step) => step.state === "running" && step.detail)
    .at(-1)?.detail;
  return (
    <p className="listing-pako-line" {...titleProps}>
      <span key={line} className="listing-pako-line-text">
        {line}
      </span>
      {detail && <small>{detail}</small>}
    </p>
  );
}

/**
 * Pako in the listing column, once: beside his bubble he says what he does while
 * he works, then asks one question at a time with tap answers, and closes with
 * what is left to do. Each new line brings him into view.
 */
export default function ListingPako({
  phase,
  turn,
  question,
  queue,
  answeredBefore,
  suggestion,
  closing,
  reply,
  tapError,
  focusRequest,
  waiting,
  onPickupDate,
  onChoose,
  onPrice,
  onSkip,
  onLater,
  onRetry,
  onManual,
  onPolish,
}: Props) {
  const reduced = useReducedMotion() === true;
  const headingId = useId();
  const place = usePakoPlace();
  const pako = useRef<HTMLElement>(null);
  const markPako = useCallback(
    (node: HTMLElement | null) => {
      pako.current = node;
      place.mark(node);
    },
    [place],
  );
  const titleNode = useRef<HTMLElement | null>(null);
  const focusNext = useRef(false);
  /** The element in the bubble that had focus last. */
  const lastFocused = useRef<Element | null>(null);
  /** The choice tapped on the content that shows now; a new question or step starts unchosen. */
  const [choice, setChoice] = useState<{ content: string; label: string }>();
  const answered = queue.filter((item) => turn.answers[item.id]).length;
  const cheering =
    !useMomentPassed(
      answered ? { id: `answered-${answered}`, ms: REACTION_MS.happy } : null,
    ) && answered > 0;
  const mood =
    phase === "asking" && cheering ? "happy" : listingMood(phase, turn.steps);
  const contentKey =
    phase === "asking" && question
      ? `question-${question.id}`
      : phase === "starting"
        ? "working"
        : phase;
  useEffect(() => {
    const frame = requestAnimationFrame(place.reveal);
    return () => cancelAnimationFrame(frame);
  }, [contentKey, place]);

  const chosen = choice?.content === contentKey ? choice.label : undefined;
  const nudge = useEffectEvent(() => {
    const node = pako.current;
    node
      ?.querySelector(".listing-pako-bubble")
      ?.animate(NUDGE_BUBBLE, NUDGE_TIMING);
    if (!reduced)
      node
        ?.querySelector(".listing-pako-avatar")
        ?.animate(PAKO_HOP, NUDGE_TIMING);
    place.reveal();
    if (titleNode.current?.dataset.content === contentKey)
      titleNode.current.focus({ preventScroll: true });
    else focusNext.current = true;
  });
  // Only a new request moves focus; the content it waits for comes later.
  useEffect(() => {
    if (focusRequest) nudge();
  }, [focusRequest]);

  /** Focus was in the bubble, on something that went away with the content before. */
  const focusLost = () =>
    document.activeElement === document.body &&
    lastFocused.current !== null &&
    !lastFocused.current.isConnected;
  /** Each content's title takes focus as it arrives, when focus was in the bubble before. */
  const title = (node: HTMLElement | null) => {
    if (!node) return;
    titleNode.current = node;
    if (!focusNext.current && !focusLost()) return;
    focusNext.current = false;
    node.focus({ preventScroll: true });
  };
  const titleProps = { ref: title, tabIndex: -1, "data-content": contentKey };
  const replyLine = reply && (
    <p className="listing-pako-reply">{answerParts(reply, turn.sources)}</p>
  );
  /** Keeps keyboard focus in the bubble when the control that had it goes away. */
  const answering = (act: () => boolean | void) => {
    focusNext.current = Boolean(pako.current?.contains(document.activeElement));
    if (act() === false) focusNext.current = false;
  };
  const choose = (id: string, label: string) => {
    if (chosen) return;
    setChoice({ content: contentKey, label });
    window.setTimeout(
      () =>
        answering(() => {
          const applied = onChoose(id, label);
          if (!applied) setChoice(undefined);
          return applied;
        }),
      reduced ? 0 : CHOSEN_MS,
    );
  };

  let content: ReactNode;
  if (phase === "asking" && question) {
    const { lead, ask, aside } = splitQuestion(question.question);
    const priceCard = asksPrice(question);
    const context = [lead, priceCard && suggestion ? "" : aside]
      .filter(Boolean)
      .join(" ");
    content = (
      <>
        {replyLine}
        <div className="listing-pako-heading">
          <h3 id={headingId} {...titleProps}>
            {answerParts(ask, turn.sources)}
          </h3>
          <Progress
            queue={queue}
            answeredBefore={answeredBefore}
            current={question.id}
          />
        </div>
        {context && (
          <p className="listing-pako-aside">
            {answerParts(context, turn.sources)}
          </p>
        )}
        {priceCard ? (
          <PriceCard
            key={question.id}
            start={suggestion?.patch.price ?? question.input?.value}
            rangeMax={question.input?.max}
            suggestion={suggestion}
            sources={turn.sources}
            disabled={waiting}
            onPrice={(price) => answering(() => onPrice(question.id, price))}
            onLater={() => answering(() => onLater(question.id))}
          />
        ) : (
          <div className="listing-pako-answers">
            <div
              className="listing-pako-choices"
              role="group"
              aria-labelledby={headingId}
            >
              {question.choices
                ?.filter((choice) => !SKIP_ANSWER.test(choice))
                .map((choice, index) => (
                  <Button
                    key={choice}
                    className="listing-pako-choice"
                    data-chosen={chosen === choice || undefined}
                    style={{ "--stagger": Math.min(index, 3) } as CSSProperties}
                    disabled={
                      waiting || (chosen !== undefined && chosen !== choice)
                    }
                    onClick={() => choose(question.id, choice)}
                  >
                    {chosen === choice && (
                      <Check size={15} aria-hidden="true" animate />
                    )}
                    {choice}
                  </Button>
                ))}
              {onPickupDate && (
                <PickupDate
                  disabled={waiting}
                  onSet={(date) =>
                    answering(() => onPickupDate(question.id, date))
                  }
                />
              )}
            </div>
            <Button
              className="button quiet small listing-pako-skip"
              disabled={waiting || chosen !== undefined}
              onClick={() => answering(() => onSkip(question.id))}
            >
              Skip for now
            </Button>
          </div>
        )}
        {tapError && (
          <p className="listing-pako-error" role="alert">
            {tapError}
          </p>
        )}
        <Meanwhile turn={turn} onRetry={onRetry} />
      </>
    );
  } else if (phase === "error") {
    content = (
      <>
        <p className="listing-pako-title" role="alert" {...titleProps}>
          I couldn't finish that
          <span>{turn.error}</span>
        </p>
        <div className="listing-pako-actions">
          <Button className="button secondary small" onClick={onRetry}>
            Try again
          </Button>
          <Button className="button quiet small" onClick={onManual}>
            Fill in details
          </Button>
        </div>
      </>
    );
  } else if (phase === "asleep") {
    content = (
      <>
        <p className="listing-pako-title" {...titleProps}>
          {closing.title}
          <span>{closing.text}</span>
        </p>
        <div className="listing-pako-actions">
          <Button className="button secondary small" onClick={onManual}>
            Fill in details
          </Button>
        </div>
      </>
    );
  } else if (phase === "done") {
    content = (
      <>
        {replyLine}
        <p className="listing-pako-title" {...titleProps}>
          {closing.title}
          <span>{closing.text}</span>
        </p>
        {onPolish && (
          <div className="listing-pako-choices">
            <Button className="listing-pako-choice" onClick={onPolish}>
              <Sparkles size={15} aria-hidden="true" />
              {POLISH_DESCRIPTION.label}
            </Button>
          </div>
        )}
      </>
    );
  } else if (phase === "hidden") {
    content = (
      <p className="listing-pako-line" {...titleProps}>
        {turn.id ? IDLE_LINES.stopped : IDLE_LINES.empty}
      </p>
    );
  } else content = <WorkingLine turn={turn} titleProps={titleProps} />;

  return (
    <section
      ref={markPako}
      className="listing-pako"
      data-phase={phase}
      onFocus={(event) => {
        lastFocused.current = event.target;
      }}
      aria-labelledby={phase === "asking" ? headingId : undefined}
      aria-label={phase === "asking" ? undefined : "Pako"}
    >
      <span className="listing-pako-avatar" aria-hidden="true">
        <PakoReaction size={44} mood={mood} />
      </span>
      <motion.div
        className="listing-pako-bubble"
        style={{ originX: 0, originY: 0 }}
        {...POP}
      >
        <motion.div
          key={contentKey}
          className="listing-pako-content"
          {...SETTLE}
        >
          {content}
        </motion.div>
      </motion.div>
    </section>
  );
}
