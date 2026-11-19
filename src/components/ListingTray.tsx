import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import type { AgentQuestionEvent } from "../../shared/actions";
import { Check, LoaderCircle, Sparkles } from "@/components/icons";
import { TODAY } from "../../shared/marketplace";
import type { AgentRunState } from "../hooks/useAgentRun";
import { useMomentPassed } from "../hooks/useMomentPassed";
import {
  asksPrice,
  splitQuestion,
  type PriceSuggestion,
  type TrayPhase,
} from "../listingQuestions";
import { REACTION_MS, trayMood, workingLine } from "../pakoMoods";
import { answerParts } from "./AgentAnswerContent";
import { POLISH_DESCRIPTION } from "./AskPakoMenu";
import PakoReaction from "./PakoReaction";
import PriceCard from "./PriceCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import "./listing-tray.css";

/** The tray's content settles in place of the last one, like the listing card's details. */
const SWAP = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: "spring", stiffness: 420, damping: 34 },
} as const;
/** A tapped answer fills and shows its check this long before the next question comes. */
const CHOSEN_MS = 140;
/** The tray always offers its own Skip, so Pako's skip answers are not repeated. */
const SKIP_ANSWER = /^skip(?: for now)?\.?$/i;

type Props = {
  phase: TrayPhase;
  turn: AgentRunState;
  question?: AgentQuestionEvent;
  /** The questions of this turn in order, answered ones included. */
  queue: readonly AgentQuestionEvent[];
  /** Questions answered or skipped in the listing's earlier turns; the count goes on from them. */
  answeredBefore: number;
  suggestion?: PriceSuggestion;
  closing: { title: string; text: string };
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

/** The most dots the tray shows; the oldest answered questions make room first. */
const MAX_DOTS = 8;

/**
 * One dot per question of the listing, filled once answered: those of earlier
 * turns first, so a new turn's questions carry on from them.
 */
function Progress({
  queue,
  answeredBefore,
  answers,
  current,
}: {
  queue: readonly AgentQuestionEvent[];
  answeredBefore: number;
  answers: Readonly<Record<string, string>>;
  current: string;
}) {
  const total = answeredBefore + queue.length;
  if (total < 2) return null;
  const position =
    answeredBefore + queue.findIndex((item) => item.id === current) + 1;
  const earlierDots = Math.min(
    answeredBefore,
    Math.max(0, MAX_DOTS - queue.length),
  );
  return (
    <span
      className="listing-tray-progress"
      role="img"
      aria-label={`Question ${position} of ${total}`}
    >
      {Array.from({ length: earlierDots }, (_, index) => (
        <span key={`earlier-${index}`} data-state="answered" />
      ))}
      {queue.map((item) => (
        <span
          key={item.id}
          data-state={
            answers[item.id]
              ? "answered"
              : item.id === current
                ? "current"
                : "waiting"
          }
        />
      ))}
    </span>
  );
}

type TitleProps = {
  ref: (node: HTMLElement | null) => void;
  tabIndex: number;
  "data-content": string;
};

/** "Last day to collect…" opens a date field; its date becomes the listing's last pickup day. */
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
        className="listing-tray-choice"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Last day to collect…
      </Button>
    );
  return (
    <span className="listing-tray-date">
      <label htmlFor={fieldId} className="sr-only">
        Last day to collect
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
        Set
      </Button>
    </span>
  );
}

/** While Pako asks his own question, the tray still says what his run is doing. */
function Meanwhile({
  turn,
  onRetry,
}: {
  turn: AgentRunState;
  onRetry: () => void;
}) {
  if (turn.status === "running")
    return (
      <p className="listing-tray-meanwhile">
        <LoaderCircle size={14} animate aria-hidden="true" />
        {workingLine(turn, undefined, "listing")}
      </p>
    );
  if (turn.status !== "error") return null;
  return (
    <p className="listing-tray-meanwhile" role="alert">
      I got stuck checking prices. {turn.error}
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
    <p className="listing-tray-line" {...titleProps}>
      <span key={line} className="listing-tray-line-text">
        {line}
      </span>
      {detail && <small>{detail}</small>}
    </p>
  );
}

/**
 * Pako above the composer: while he works he says what he does, then asks one
 * question at a time with tap answers, and closes with what is left to do. The
 * conversation above keeps the record.
 */
export default function ListingTray({
  phase,
  turn,
  question,
  queue,
  answeredBefore,
  suggestion,
  closing,
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
  const tray = useRef<HTMLElement>(null);
  const titleNode = useRef<HTMLElement | null>(null);
  const focusNext = useRef(false);
  /** The element in the tray that had focus last. */
  const lastFocused = useRef<Element | null>(null);
  const [chosen, setChosen] = useState<string>();
  const answered = queue.filter((item) => turn.answers[item.id]).length;
  const cheering =
    !useMomentPassed(
      answered ? { id: `answered-${answered}`, ms: REACTION_MS.happy } : null,
    ) && answered > 0;
  const mood =
    phase === "asking" && cheering ? "happy" : trayMood(phase, turn.steps);
  const contentKey =
    phase === "asking" && question
      ? `question-${question.id}`
      : phase === "starting"
        ? "working"
        : phase;

  useEffect(() => setChosen(undefined), [contentKey]);
  useEffect(() => {
    if (!focusRequest) return;
    if (titleNode.current?.dataset.content === contentKey)
      titleNode.current.focus({ preventScroll: true });
    else focusNext.current = true;
    // Only a new request moves focus; the content it waits for comes later.
  }, [focusRequest]);

  if (phase === "hidden") return null;
  /** Focus was in the tray, on something that went away with the content before. */
  const focusLost = () =>
    document.activeElement === document.body &&
    lastFocused.current !== null &&
    !lastFocused.current.isConnected;
  /** Each content's title takes focus as it arrives, when focus was in the tray before. */
  const title = (node: HTMLElement | null) => {
    if (!node) return;
    titleNode.current = node;
    if (!focusNext.current && !focusLost()) return;
    focusNext.current = false;
    node.focus({ preventScroll: true });
  };
  const titleProps = { ref: title, tabIndex: -1, "data-content": contentKey };
  /** Keeps keyboard focus in the tray when the control that had it goes away. */
  const answering = (act: () => boolean | void) => {
    focusNext.current = Boolean(tray.current?.contains(document.activeElement));
    if (act() === false) focusNext.current = false;
  };
  const choose = (id: string, label: string) => {
    if (chosen) return;
    setChosen(label);
    window.setTimeout(
      () =>
        answering(() => {
          const applied = onChoose(id, label);
          if (!applied) setChosen(undefined);
          return applied;
        }),
      reduced ? 0 : CHOSEN_MS,
    );
  };

  let content: ReactNode;
  if (phase === "asking" && question) {
    const { ask, aside } = splitQuestion(question.question);
    const priceCard = asksPrice(question);
    // Pako's reasoning after a price question belongs with why he suggests that price.
    const reasoning = priceCard && suggestion ? aside : "";
    content = (
      <>
        <div className="listing-tray-heading">
          <h3 id={headingId} {...titleProps}>
            {answerParts(ask, turn.sources)}
          </h3>
          <Progress
            queue={queue}
            answeredBefore={answeredBefore}
            answers={turn.answers}
            current={question.id}
          />
        </div>
        {aside && !reasoning && (
          <p className="listing-tray-aside">
            {answerParts(aside, turn.sources)}
          </p>
        )}
        {priceCard ? (
          <PriceCard
            key={question.id}
            start={suggestion?.patch.price ?? question.input?.value}
            suggestion={suggestion}
            reasoning={reasoning}
            sources={turn.sources}
            disabled={waiting}
            onPrice={(price) => answering(() => onPrice(question.id, price))}
            onLater={() => answering(() => onLater(question.id))}
          />
        ) : (
          <div className="listing-tray-answers">
            <div
              className="listing-tray-choices"
              role="group"
              aria-labelledby={headingId}
            >
              {question.choices
                ?.filter((choice) => !SKIP_ANSWER.test(choice))
                .map((choice, index) => (
                  <Button
                    key={choice}
                    className="listing-tray-choice"
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
              className="button quiet small listing-tray-skip"
              disabled={waiting || chosen !== undefined}
              onClick={() => answering(() => onSkip(question.id))}
            >
              Skip for now
            </Button>
          </div>
        )}
        {tapError && (
          <p className="listing-tray-error" role="alert">
            {tapError}
          </p>
        )}
        <Meanwhile turn={turn} onRetry={onRetry} />
      </>
    );
  } else if (phase === "error") {
    content = (
      <>
        <p className="listing-tray-title" role="alert" {...titleProps}>
          Sorry, I got stuck there.
          <span>{turn.error}</span>
        </p>
        <div className="listing-tray-actions">
          <Button className="button secondary small" onClick={onRetry}>
            Try again
          </Button>
          <Button className="button quiet small" onClick={onManual}>
            Fill in myself
          </Button>
        </div>
      </>
    );
  } else if (phase === "asleep") {
    content = (
      <>
        <p className="listing-tray-title" {...titleProps}>
          {closing.title}
          <span>{closing.text}</span>
        </p>
        <div className="listing-tray-actions">
          <Button className="button secondary small" onClick={onManual}>
            Fill in details
          </Button>
        </div>
      </>
    );
  } else if (phase === "done") {
    content = (
      <>
        <p className="listing-tray-title" {...titleProps}>
          {closing.title}
          <span>{closing.text}</span>
        </p>
        {onPolish && (
          <div className="listing-tray-choices">
            <Button className="listing-tray-choice" onClick={onPolish}>
              <Sparkles size={15} aria-hidden="true" />
              {POLISH_DESCRIPTION.label}
            </Button>
          </div>
        )}
      </>
    );
  } else content = <WorkingLine turn={turn} titleProps={titleProps} />;

  return (
    <section
      ref={tray}
      className="listing-tray"
      data-phase={phase}
      onFocus={(event) => {
        lastFocused.current = event.target;
      }}
      aria-labelledby={phase === "asking" ? headingId : undefined}
      aria-label={phase === "asking" ? undefined : "Pako"}
    >
      <span className="listing-tray-pako" aria-hidden="true">
        <PakoReaction size={44} mood={mood} />
      </span>
      <AutoHeight className="listing-tray-bubble">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={contentKey}
            className="listing-tray-content"
            {...SWAP}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </AutoHeight>
    </section>
  );
}
