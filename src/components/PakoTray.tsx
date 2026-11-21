import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import { Check, Search } from "@/components/icons";
import { SETTLE_IN_PLACE } from "../uiMotion";
import type { DealRole } from "../../shared/deal";
import {
  askToBeNextMessage,
  nudgeMessage,
  reservedElsewhereMessage,
} from "../../shared/dealMessages";
import type { ThreadOption, ThreadTurn } from "../../shared/threadTurn";
import { useMomentPassed } from "../hooks/useMomentPassed";
import type { PakoTrayState } from "../hooks/usePakoThread";
import { threadGuide, threadReactionMs, type ThreadMoment } from "../pakoMoods";
import { theirQuotes, withName, type ThreadNotice } from "../pakoThread";
import Pako from "./onboarding/Pako";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import "./pako-tray.css";

/** The terms an acceptance can still leave open, as the tray names them. */
const OPEN_WORDS: Record<ThreadTurn["agreement"]["missing"][number], string> = {
  amount: "the price",
  fulfillment: "the handover",
  pickupTime: "the time",
  pickupPoint: "the meeting point",
};

/** A message Pako put in the composer: one of his options, a nudge or a request to be next. */
export type PakoWriting = { key: string; text: string };

type Props = {
  state: PakoTrayState;
  /** What Pako points out while he has nothing to read. */
  notice: ThreadNotice | null;
  /** Where the deal stands, which Pako says when there is no reply to read. */
  dealMoment: ThreadMoment | null;
  role: DealRole;
  otherName: string;
  title: string;
  /** Readings left today, when known. */
  remaining: number | undefined;
  /** The composer's text: tapping a suggestion replaces it. */
  draft: string;
  /** The suggestion now in the composer. */
  chosen: string | undefined;
  onRead: () => void;
  onWrite: (writing: PakoWriting, option?: ThreadOption) => void;
  onFindSimilar: () => void;
};

function trayMoment(
  state: PakoTrayState,
  notice: ThreadNotice | null,
  dealMoment: ThreadMoment | null,
  otherName: string,
  remaining: number | undefined,
): ThreadMoment | null {
  switch (state.phase) {
    case "idle":
      if (notice?.kind === "gone")
        return { phase: "gone", status: notice.status };
      if (notice?.kind === "no_answer")
        return { phase: "no_answer", hoursWaiting: notice.hoursWaiting };
      if (notice?.kind === "agreed_elsewhere")
        return { phase: "agreed_elsewhere", agreedWith: notice.agreedWith };
      return dealMoment;
    case "ready":
      // Terms that look agreed are on the deal card with the words behind them,
      // so Pako says what the card does not instead of reading them out again.
      return dealMoment?.phase === "deal_looks_agreed"
        ? dealMoment
        : { phase: "ready", summary: withName(state.turn.summary, otherName) };
    case "paused":
      return { phase: "paused", remaining };
    case "unavailable":
      return { phase: "unavailable", reason: state.reason };
    case "busy":
      return { phase: "busy", retrying: false };
    case "reading":
    case "asking":
      return state.retrying
        ? { phase: "busy", retrying: true }
        : { phase: state.phase };
    default:
      return { phase: state.phase };
  }
}

/** A list in words: "the time and the meeting point". */
const listed = (words: string[]) =>
  words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

/**
 * What Pako says under a reading that suggests nothing to send, as for an
 * acceptance: the deal card confirms it, or the terms still open need words.
 */
function noReplyHint(turn: ThreadTurn, looksAgreed: boolean) {
  if (looksAgreed)
    return "Confirm on the deal card if that's right, or write to change something.";
  const open = turn.agreement.missing.map((field) => OPEN_WORDS[field]);
  return open.length
    ? `Still open: ${listed(open)}. Write to settle ${open.length === 1 ? "it" : "them"}.`
    : "No reply needed. You can still write if you like.";
}

/** How the tray invites a tap, for one suggestion or a few. */
function choiceHint(count: number, chosenHere: boolean, draft: string) {
  if (chosenHere)
    return count === 1
      ? "Reply added to your draft."
      : "Reply added to your draft. Tap another to swap it.";
  if (draft.trim())
    return count === 1
      ? "Choosing it replaces your draft."
      : "Choosing a reply replaces your draft.";
  return count === 1
    ? "Tap it to add it to your draft. You can edit it before sending."
    : "Tap one to add it to your draft. You can edit it before sending.";
}

/**
 * What the student can do with Pako's reading: tap a message to put it in the
 * composer. Each suggestion shows its whole label, however many there are.
 * Where the deal card shows terms that look agreed, it also quotes the words
 * behind them, so the tray leaves the quotes to the card.
 */
function Suggestions({
  turn,
  turnKey,
  looksAgreed,
  otherName,
  draft,
  chosen,
  unsaved,
  onWrite,
}: {
  turn: ThreadTurn;
  /** Tells this reading's suggestions from another reading's with the same ids. */
  turnKey: string;
  looksAgreed: boolean;
  otherName: string;
  draft: string;
  chosen: string | undefined;
  unsaved: boolean;
  onWrite: Props["onWrite"];
}) {
  const quotes = theirQuotes(turn);
  const keyOf = (option: ThreadOption) => `${turnKey}:${option.id}`;
  const chosenHere = turn.options.some((option) => keyOf(option) === chosen);
  return (
    <>
      {quotes.length > 0 && !looksAgreed && (
        <p className="thread-tray-quotes">
          What {otherName} said:{" "}
          {quotes.map((quote, index) => (
            <span key={quote}>
              {index > 0 && " · "}
              <q>{quote}</q>
            </span>
          ))}
        </p>
      )}
      {turn.options.length > 0 && (
        <div
          className="thread-tray-choices"
          role="group"
          aria-label="Suggested replies"
        >
          {turn.options.map((option, index) => (
            <Button
              key={option.id}
              className="thread-tray-choice"
              data-chosen={chosen === keyOf(option) || undefined}
              style={{ "--stagger": index } as CSSProperties}
              onClick={() =>
                onWrite(
                  {
                    key: keyOf(option),
                    text: withName(option.message, otherName),
                  },
                  option,
                )
              }
            >
              {chosen === keyOf(option) && (
                <Check size={15} aria-hidden="true" animate />
              )}
              {withName(option.label, otherName)}
            </Button>
          ))}
        </div>
      )}
      <small className="thread-tray-hint">
        {turn.options.length
          ? choiceHint(turn.options.length, chosenHere, draft)
          : noReplyHint(turn, looksAgreed)}
      </small>
      {unsaved && (
        <small className="thread-tray-hint">
          I couldn't save these suggestions.
        </small>
      )}
    </>
  );
}

/**
 * Pako's line. A long reading folds to two lines on phones, where a tap shows
 * the rest; the whole line is always announced.
 */
function TrayLine({ text, folds }: { text: string; folds: boolean }) {
  const line = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const element = line.current;
    if (!element || !folds) return;
    const measure = () =>
      setCut(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [folds, text]);
  return (
    <>
      <p
        ref={line}
        className="thread-tray-line"
        data-folds={(folds && !open) || undefined}
        aria-hidden="true"
      >
        {text}
      </p>
      {folds && (cut || open) && (
        <Button
          className="thread-tray-more"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Show less" : "Show more"}
        </Button>
      )}
    </>
  );
}

/** The one automatic retry, waiting its second: a calm moving dot, not an error. */
function BusyWait() {
  return (
    <p className="thread-tray-busy" role="status">
      <span className="thread-tray-busy-dot" aria-hidden="true" />
      Trying again…
    </p>
  );
}

function ReadingChips() {
  return (
    <div className="thread-tray-skeletons" aria-hidden="true">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  );
}

/**
 * Pako above the composer of a thread: he reads the other student's latest
 * reply, sums it up in one line, quotes what they said and suggests messages
 * to send. A tap only puts a message in the composer; sending stays the
 * student's own tap. Without a reply to read he points out an item that is
 * gone or a message that has waited a day.
 */
export default function PakoTray({
  state,
  notice,
  dealMoment,
  role,
  otherName,
  title,
  remaining,
  draft,
  chosen,
  onRead,
  onWrite,
  onFindSimilar,
}: Props) {
  const moment = trayMoment(state, notice, dealMoment, otherName, remaining);
  const guide = moment && threadGuide(moment, { other: otherName, title });
  const contentKey =
    state.phase === "ready"
      ? `ready-${state.turn.forMessageId}-${state.turn.summary}`
      : (moment?.phase ?? "none");
  const reactionMs = moment && guide && threadReactionMs(moment, guide.mood);
  const reacted = useMomentPassed(
    reactionMs ? { id: contentKey, ms: reactionMs } : null,
  );
  if (!moment || !guide) return null;
  const mood = !reacted
    ? guide.mood
    : moment.phase === "ready" || moment.phase === "deal_looks_agreed"
      ? "listen"
      : "idle";
  const chosenHere = (key: string) => chosen === key || undefined;

  let actions: ReactNode = null;
  if (state.phase === "ready")
    actions = (
      <Suggestions
        turn={state.turn}
        turnKey={contentKey}
        looksAgreed={moment.phase === "deal_looks_agreed"}
        otherName={otherName}
        draft={draft}
        chosen={chosen}
        unsaved={state.unsaved}
        onWrite={onWrite}
      />
    );
  else if (state.phase === "reading" || state.phase === "asking")
    actions = state.retrying ? <BusyWait /> : <ReadingChips />;
  else if (state.phase === "busy")
    actions = (
      <div className="thread-tray-actions">
        <Button className="button secondary small" onClick={onRead}>
          Try again
        </Button>
      </div>
    );
  else if (state.phase === "paused")
    actions = (
      <div className="thread-tray-actions">
        <Button className="button secondary small" onClick={onRead}>
          Read reply
        </Button>
      </div>
    );
  else if (state.phase === "error")
    actions = (
      <>
        <small className="thread-tray-hint">{state.message}</small>
        <div className="thread-tray-actions">
          <Button className="button secondary small" onClick={onRead}>
            Try again
          </Button>
        </div>
      </>
    );
  else if (moment.phase === "gone")
    actions = (
      <div className="thread-tray-actions">
        <Button
          animateIcon
          className="button primary small"
          onClick={onFindSimilar}
        >
          <Search size={16} aria-hidden="true" />
          Find similar
        </Button>
        {moment.status === "reserved" && (
          <Button
            className="thread-tray-choice"
            data-chosen={chosenHere("next")}
            onClick={() =>
              onWrite({ key: "next", text: askToBeNextMessage(title) })
            }
          >
            Ask to be next
          </Button>
        )}
      </div>
    );
  else if (moment.phase === "deal_cancelled" && role === "buyer")
    actions = (
      <div className="thread-tray-actions">
        {/* The deal strip keeps the main action, such as a new offer; Pako's way on stays quieter. */}
        <Button
          animateIcon
          className="button secondary small"
          onClick={onFindSimilar}
        >
          <Search size={16} aria-hidden="true" />
          Find similar
        </Button>
      </div>
    );
  else if (moment.phase === "agreed_elsewhere")
    actions = (
      <div className="thread-tray-actions">
        <Button
          className="thread-tray-choice"
          data-chosen={chosenHere("let-know")}
          onClick={() =>
            onWrite({ key: "let-know", text: reservedElsewhereMessage(title) })
          }
        >
          Let {otherName} know
        </Button>
      </div>
    );
  else if (moment.phase === "no_answer")
    actions = (
      <div className="thread-tray-actions">
        <Button
          className="thread-tray-choice"
          data-chosen={chosenHere("nudge")}
          onClick={() =>
            onWrite({ key: "nudge", text: nudgeMessage(role, title) })
          }
        >
          Draft a follow-up
        </Button>
        {role === "buyer" && (
          <Button className="button quiet small" onClick={onFindSimilar}>
            Find similar
          </Button>
        )}
      </div>
    );

  return (
    <section
      className="thread-tray"
      data-phase={moment.phase}
      aria-label="Pako"
    >
      <p className="sr-only" role="status">
        Pako: {guide.line}
      </p>
      <span className="thread-tray-pako" aria-hidden="true">
        <Pako mood={mood} size={44} />
      </span>
      <AutoHeight className="thread-tray-bubble">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={contentKey}
            className="thread-tray-content"
            {...SETTLE_IN_PLACE}
          >
            <TrayLine text={guide.line} folds={moment.phase === "ready"} />
            {actions}
          </motion.div>
        </AnimatePresence>
      </AutoHeight>
    </section>
  );
}
