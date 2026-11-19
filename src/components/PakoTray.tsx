import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import { Check, Search } from "@/components/icons";
import type { DealRole } from "../../shared/deal";
import { askToBeNextMessage, nudgeMessage } from "../../shared/dealMessages";
import type { ThreadOption, ThreadTurn } from "../../shared/threadTurn";
import { useMomentPassed } from "../hooks/useMomentPassed";
import type { PakoTrayState } from "../hooks/usePakoThread";
import {
  threadGuide,
  threadReactionMs,
  type ThreadMoment,
} from "../pakoMoods";
import { theirQuotes, withName, type ThreadNotice } from "../pakoThread";
import Pako from "./onboarding/Pako";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import "./pako-tray.css";

/** The tray's content settles in place of the last one, like the listing tray's. */
const SWAP = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: "spring", stiffness: 420, damping: 34 },
} as const;

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
      return dealMoment;
    case "ready":
      return {
        phase: "ready",
        summary: withName(state.turn.summary, otherName),
      };
    case "paused":
      return { phase: "paused", remaining };
    case "unavailable":
      return { phase: "unavailable", reason: state.reason };
    default:
      return { phase: state.phase };
  }
}

/** What the student can do with Pako's reading: tap a message to put it in the composer. */
function Suggestions({
  turn,
  otherName,
  draft,
  chosen,
  unsaved,
  onWrite,
}: {
  turn: ThreadTurn;
  otherName: string;
  draft: string;
  chosen: string | undefined;
  unsaved: boolean;
  onWrite: Props["onWrite"];
}) {
  const quotes = theirQuotes(turn);
  const chosenHere = turn.options.some((option) => option.id === chosen);
  return (
    <>
      {quotes.length > 0 && (
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
      <div
        className="thread-tray-choices"
        role="group"
        aria-label="Messages Pako suggests"
      >
        {turn.options.map((option, index) => (
          <Button
            key={option.id}
            className="thread-tray-choice"
            data-chosen={chosen === option.id || undefined}
            style={{ "--stagger": index } as CSSProperties}
            onClick={() =>
              onWrite(
                { key: option.id, text: withName(option.message, otherName) },
                option,
              )
            }
          >
            {chosen === option.id && (
              <Check size={15} aria-hidden="true" animate />
            )}
            {withName(option.label, otherName)}
          </Button>
        ))}
      </div>
      <small className="thread-tray-hint">
        {chosenHere
          ? "It's in your message now. Tap another one to swap it."
          : draft.trim()
            ? "Tapping one replaces what you wrote."
            : "Tap one to put it in your message. You can edit it before sending."}
      </small>
      {unsaved && (
        <small className="thread-tray-hint">
          I couldn't keep this reading, so I'll read the reply again next time.
        </small>
      )}
    </>
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
    : moment.phase === "ready"
      ? "listen"
      : "idle";
  const chosenHere = (key: string) => chosen === key || undefined;

  let actions: ReactNode = null;
  if (state.phase === "ready")
    actions = (
      <Suggestions
        turn={state.turn}
        otherName={otherName}
        draft={draft}
        chosen={chosen}
        unsaved={state.unsaved}
        onWrite={onWrite}
      />
    );
  else if (state.phase === "reading" || state.phase === "asking")
    actions = <ReadingChips />;
  else if (state.phase === "paused")
    actions = (
      <div className="thread-tray-actions">
        <Button className="button secondary small" onClick={onRead}>
          Read it
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
        <Button
          animateIcon
          className="button primary small"
          onClick={onFindSimilar}
        >
          <Search size={16} aria-hidden="true" />
          Find similar
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
          Nudge {otherName}
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
            {...SWAP}
          >
            <p className="thread-tray-line" aria-hidden="true">
              {guide.line}
            </p>
            {actions}
          </motion.div>
        </AnimatePresence>
      </AutoHeight>
    </section>
  );
}
