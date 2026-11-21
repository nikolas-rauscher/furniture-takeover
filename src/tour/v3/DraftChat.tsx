import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import TextAnswer from "../study/TextAnswer";
import { resumeDraft, sentResult, type DraftPhase } from "./draftResume";
import type { Given, StepContext } from "./stepContext";
import {
  DRAFT_DAY_STEP,
  DRAFT_DAYS,
  DRAFT_PRICE,
  type DraftAction,
  type DraftDay,
  type DraftResult,
  type DraftWriting,
} from "./v3Script";

const PAUSE_MS = { "lea-typing": 1100, "pako-typing": 1000 } as const;
const REDUCED_PAUSE_MS = 250;
/** The sent message stays in view this long before the next step. */
const DECIDED_MS = 1100;

function Bubble({
  from,
  name,
  children,
}: {
  from: "lea" | "you" | "pako";
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="tour-chat-row" data-from={from}>
      <p className="tour-chat-bubble">
        <span className="sr-only">{name}: </span>
        {children}
      </p>
    </div>
  );
}

/** Task: Léa's chat, the day agreed, and what to do with Pako's offer for that day. */
export default function DraftChat({ context }: { context: StepContext }) {
  const { draft } = useTourText().v3;
  const reduced = useReducedMotion() === true;
  const { answers } = context.progress;
  const [start] = useState(() =>
    resumeDraft(answers[DRAFT_DAY_STEP]?.chosen[0], answers.draft),
  );
  const [day, setDay] = useState<DraftDay | undefined>(start.day);
  const [phase, setPhase] = useState<DraftPhase>(start.phase);
  const [writing, setWriting] = useState<DraftWriting | undefined>(
    start.writing,
  );
  const offer = day ? draft.offer(draft.days[day], DRAFT_PRICE) : "";
  const [message, setMessage] = useState(
    context.progress.unsentDraft ?? (start.writing === "change" ? offer : ""),
  );
  const [decision, setDecision] = useState<Given | undefined>(start.decision);
  const moveOn = useRef(context.moveOn);
  const log = useRef<HTMLDivElement>(null);
  const offerCard = useRef<HTMLDivElement>(null);
  const agreement = useRef<HTMLDivElement>(null);
  const questionId = useId();

  useEffect(() => {
    if (phase !== "lea-typing" && phase !== "pako-typing") return;
    const next: DraftPhase = phase === "lea-typing" ? "pako-typing" : "decide";
    const timer = window.setTimeout(
      () => setPhase(next),
      reduced ? REDUCED_PAUSE_MS : PAUSE_MS[phase],
    );
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);

  useEffect(() => {
    moveOn.current = context.moveOn;
  }, [context.moveOn]);

  // The decision is saved already; it stays in view briefly, then the next step follows.
  useEffect(() => {
    if (phase !== "decided") return;
    const timer = window.setTimeout(
      () => moveOn.current(),
      reduced ? REDUCED_PAUSE_MS : DECIDED_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);

  // The decision is seen whole: Léa's agreement scrolls to the top, so her terms, Pako's
  // draft and the four choices stand together. The draft takes focus, so it is read first.
  useEffect(() => {
    if (phase !== "decide") return;
    agreement.current?.scrollIntoView({ block: "start" });
    offerCard.current?.focus({ preventScroll: true });
  }, [phase]);

  function pickDay(picked: DraftDay) {
    setDay(picked);
    setPhase("lea-typing");
    context.saveNow({ [DRAFT_DAY_STEP]: { chosen: [picked], text: "" } });
    log.current?.focus();
  }

  /** The final answer, saved at once; a decision straight from the choices names that choice as the first. */
  function decide(result: DraftResult, text: string, first?: DraftAction) {
    const decided: Given = {
      chosen: [result],
      text,
      firstChosen: first ? [first] : undefined,
    };
    context.saveNow({ draft: decided });
    context.keepUnsentDraft(null);
    setDecision(decided);
    setPhase("decided");
    log.current?.focus();
  }

  /** Opens the message for writing; the choice is saved as the first answer at once. */
  function write(choice: DraftWriting) {
    setWriting(choice);
    const opening = choice === "change" ? offer : "";
    setMessage(opening);
    context.keepUnsentDraft(opening);
    setPhase("write");
    context.saveNow({ draft: { chosen: [choice], text: "" } });
  }

  const after = (shown: DraftPhase[]) => shown.includes(phase);
  const dayWords = day ? draft.days[day] : "";

  return (
    <div
      className="tour-inworld tour-chat"
      role="group"
      aria-label={draft.chatLabel}
    >
      <div className="tour-chat-listing" aria-label={draft.listing.title}>
        <span className="tour-chat-thumb" aria-hidden="true" />
        <div>
          <p className="tour-chat-listing-title">{draft.listing.title}</p>
          <p className="tour-chat-listing-detail">{draft.listing.size}</p>
          <p className="tour-chat-listing-detail">
            {draft.listing.price} · {draft.listing.pickup} ·{" "}
            {draft.listing.seller}
          </p>
        </div>
      </div>
      <div
        ref={log}
        className="tour-chat-log"
        role="log"
        aria-live="polite"
        tabIndex={-1}
      >
        <Bubble from="lea" name={draft.lea}>
          {draft.askDay}
        </Bubble>
        {day && (
          <Bubble from="you" name={draft.you}>
            {draft.yourDay(dayWords)}
          </Bubble>
        )}
        {phase === "lea-typing" && (
          <p className="tour-chat-typing">{draft.typing(draft.lea)}</p>
        )}
        {after(["pako-typing", "decide", "write", "decided"]) && (
          <div ref={agreement} className="tour-chat-anchor">
            <Bubble from="lea" name={draft.lea}>
              {draft.confirm(dayWords, DRAFT_PRICE)}
            </Bubble>
          </div>
        )}
        {phase === "pako-typing" && (
          <p className="tour-chat-typing">{draft.typing(draft.pako)}</p>
        )}
        {after(["decide", "write", "decided"]) && (
          <Bubble from="pako" name={draft.pako}>
            {draft.offerReady}
          </Bubble>
        )}
        {decision &&
          (decision.text ? (
            <Bubble from="you" name={draft.you}>
              {decision.text}
            </Bubble>
          ) : (
            <p className="tour-chat-note">{draft.notSent}</p>
          ))}
      </div>
      {phase === "ask" && (
        <div
          className="tour-chat-chips"
          role="group"
          aria-label={draft.pickDay}
        >
          {DRAFT_DAYS.map((id) => (
            <Button
              key={id}
              className="button secondary"
              onClick={() => pickDay(id)}
            >
              {draft.days[id]}
            </Button>
          ))}
        </div>
      )}
      {phase === "decide" && (
        <>
          <div
            ref={offerCard}
            className="tour-card tour-draft"
            tabIndex={-1}
            aria-label={draft.offerTitle}
          >
            <p className="tour-eyebrow">{draft.offerTitle}</p>
            <p className="tour-message">{offer}</p>
          </div>
          <p id={questionId} className="tour-draft-question">
            {draft.question}
          </p>
          <div
            className="tour-draft-choices"
            role="group"
            aria-labelledby={questionId}
          >
            <Button
              className="button secondary"
              onClick={() => decide("sent-unchanged", offer, "send")}
            >
              {draft.sendAsIs}
            </Button>
            <Button
              className="button secondary"
              onClick={() => write("change")}
            >
              {draft.change}
            </Button>
            <Button className="button secondary" onClick={() => write("own")}>
              {draft.own}
            </Button>
            <Button
              className="button secondary"
              onClick={() => decide("not-sent", "", "dont-send")}
            >
              {draft.dontSend}
            </Button>
          </div>
        </>
      )}
      {phase === "write" && writing && (
        <>
          <TextAnswer
            label={writing === "change" ? draft.editLabel : draft.ownLabel}
            value={message}
            onChange={(words) => {
              setMessage(words);
              context.keepUnsentDraft(words);
            }}
            autoFocus
          />
          <div className="tour-draft-actions">
            <Button
              className="button primary"
              disabled={message.trim() === ""}
              onClick={() =>
                decide(
                  sentResult(writing, message.trim(), offer),
                  message.trim(),
                )
              }
            >
              {draft.send}
            </Button>
            <Button
              className="button quiet"
              onClick={() => decide("not-sent", "")}
            >
              {draft.dontSend}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
