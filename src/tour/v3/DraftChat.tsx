import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import TextAnswer from "../study/TextAnswer";
import type { Given, StepContext } from "./stepContext";
import {
  DRAFT_DAY_STEP,
  DRAFT_DAYS,
  type DraftAction,
  type DraftDay,
  type DraftResult,
} from "./v3Script";

/**
 * How the chat unfolds after the day is picked: Mia answers, Pako drafts the offer,
 * the participant decides, and the decision shows before the next step.
 */
type Phase =
  "ask" | "mia-typing" | "pako-typing" | "decide" | "edit" | "decided";

const PAUSE_MS = { "mia-typing": 1100, "pako-typing": 1000 } as const;
const REDUCED_PAUSE_MS = 250;
/** The sent message stays in view this long before the reveal. */
const DECIDED_MS = 1100;

function isDay(value: string | undefined): value is DraftDay {
  return DRAFT_DAYS.some((day) => day === value);
}

function Bubble({
  from,
  name,
  children,
}: {
  from: "mia" | "you" | "pako";
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

/** Where a participant who reloaded mid-task picks up again. */
function resumed(
  day: string | undefined,
  action: string | undefined,
): { day?: DraftDay; phase: Phase } {
  if (!isDay(day)) return { phase: "ask" };
  return { day, phase: action === "edit" ? "edit" : "decide" };
}

/** Task: Mia's chat, the day agreed, and Pako's offer draft with Friday planted in it. */
export default function DraftChat({ context }: { context: StepContext }) {
  const { draft } = useTourText().v3;
  const reduced = useReducedMotion() === true;
  const { answers, orders } = context.progress;
  const [start] = useState(() =>
    resumed(answers[DRAFT_DAY_STEP]?.chosen[0], answers.draft?.chosen[0]),
  );
  const [day, setDay] = useState<DraftDay | undefined>(start.day);
  const [phase, setPhase] = useState<Phase>(start.phase);
  const [message, setMessage] = useState(draft.offer);
  const [decision, setDecision] = useState<Given | null>(null);
  const done = useRef(context.draftDone);
  const log = useRef<HTMLDivElement>(null);
  const offer = useRef<HTMLDivElement>(null);
  const order = orders[DRAFT_DAY_STEP] ?? DRAFT_DAYS;

  useEffect(() => {
    if (phase !== "mia-typing" && phase !== "pako-typing") return;
    const next: Phase = phase === "mia-typing" ? "pako-typing" : "decide";
    const timer = window.setTimeout(
      () => setPhase(next),
      reduced ? REDUCED_PAUSE_MS : PAUSE_MS[phase],
    );
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);

  useEffect(() => {
    done.current = context.draftDone;
  }, [context.draftDone]);

  // The decision stays in view briefly, then the reveal follows.
  useEffect(() => {
    if (!decision) return;
    const timer = window.setTimeout(
      () => done.current(decision),
      reduced ? REDUCED_PAUSE_MS : DECIDED_MS,
    );
    return () => window.clearTimeout(timer);
  }, [decision, reduced]);

  // The offer takes focus once it appears, so it is read before the buttons.
  useEffect(() => {
    if (phase === "decide") offer.current?.focus();
  }, [phase]);

  function pickDay(picked: DraftDay) {
    setDay(picked);
    setPhase("mia-typing");
    context.saveNow(DRAFT_DAY_STEP, { chosen: [picked], text: "" });
    log.current?.focus();
  }

  /** The final answer; a decision on the untouched draft names its button as the first. */
  function decide(result: DraftResult, text: string, first?: DraftAction) {
    setPhase("decided");
    log.current?.focus();
    setDecision({
      chosen: [result],
      text,
      firstChosen: first ? [first] : undefined,
    });
  }

  function edit() {
    setPhase("edit");
    context.saveNow("draft", { chosen: ["edit"], text: "" });
  }

  const after = (shown: Phase[]) => shown.includes(phase);
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
          <p className="tour-chat-listing-title">
            {draft.listing.title} · {draft.listing.size}
          </p>
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
        <Bubble from="mia" name={draft.mia}>
          {draft.askDay}
        </Bubble>
        {day && (
          <Bubble from="you" name={draft.you}>
            {draft.yourDay(dayWords)}
          </Bubble>
        )}
        {phase === "mia-typing" && (
          <p className="tour-chat-typing">{draft.typing(draft.mia)}</p>
        )}
        {after(["pako-typing", "decide", "edit", "decided"]) && (
          <Bubble from="mia" name={draft.mia}>
            {draft.confirm}
          </Bubble>
        )}
        {phase === "pako-typing" && (
          <p className="tour-chat-typing">{draft.typing(draft.pako)}</p>
        )}
        {after(["decide", "edit", "decided"]) && (
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
          {order.map((id) => (
            <Button
              key={id}
              className="button secondary"
              onClick={() => pickDay(id as DraftDay)}
            >
              {draft.days[id as DraftDay]}
            </Button>
          ))}
        </div>
      )}
      {phase === "decide" && (
        <>
          <div
            ref={offer}
            className="tour-card tour-draft"
            tabIndex={-1}
            aria-label={draft.offerTitle}
          >
            <p className="tour-eyebrow">{draft.offerTitle}</p>
            <p className="tour-message">{draft.offer}</p>
          </div>
          <div className="tour-draft-actions tour-draft-actions-equal">
            <Button
              className="button secondary"
              onClick={() => decide("sent-unchanged", draft.offer, "send")}
            >
              {draft.send}
            </Button>
            <Button className="button secondary" onClick={edit}>
              {draft.edit}
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
      {phase === "edit" && (
        <>
          <TextAnswer
            label={draft.editLabel}
            value={message}
            onChange={setMessage}
            autoFocus
          />
          <div className="tour-draft-actions">
            <Button
              className="button primary"
              disabled={message.trim() === ""}
              onClick={() => decide("sent-edited", message.trim())}
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
