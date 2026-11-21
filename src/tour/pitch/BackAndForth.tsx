import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarCheck,
  Check,
  LampDesk,
  MapPin,
  Send,
} from "@/components/icons";
import Guide from "@/components/onboarding/Guide";
import {
  CHAPTERS,
  STEPS,
  TAP_MS,
  stepOf,
  type Chapter,
  type Moment,
} from "./backAndForthScript";
import { useTourText } from "../i18n/TourLanguage";
import "./back-and-forth.css";

const SPRING = { type: "spring", stiffness: 300, damping: 28 } as const;
const CALM = { type: "spring", stiffness: 180, damping: 26 } as const;

/** Desks posted in many places, scattered over the stage before Pako sorts them. */
const POSTS = [
  { title: "Desk, 120 cm", price: 90, x: 6, y: 4, turn: -6 },
  { title: "Study desk", price: 40, x: 52, y: 2, turn: 4 },
  { title: "Office desk", price: 150, x: 30, y: 24, turn: -2 },
  { title: "Small desk", price: 65, x: 62, y: 30, turn: 7 },
  { title: "Desk + chair", price: 120, x: 4, y: 44, turn: 3 },
  { title: "Corner desk", price: 85, x: 44, y: 54, turn: -5 },
] as const;

/** The same questions every seller gets. */
const SEARCH_QUESTIONS = [
  { text: "Still available?", x: 18, y: 72 },
  { text: "Sold, sorry.", x: 58, y: 80 },
] as const;

const FITS = [
  { title: "Compact study desk", detail: "CHF 40 · FMEL Triaudes · 2.8 km" },
  { title: "White work desk", detail: "CHF 65 · Vortex · 0.4 km" },
] as const;

const PILE = [
  { text: "Is it still available?", side: "them" },
  { text: "Can you go lower?", side: "them" },
  { text: "When can you pick it up?", side: "me" },
  { text: "Where do we meet?", side: "them" },
  { text: "Sorry, I'm running late.", side: "me" },
] as const;

const OFFER_TERMS = [
  { label: "Price", value: "CHF 35" },
  { label: "Pickup", value: "Fri, 18:30" },
  { label: "Meeting point", value: "FMEL Triaudes, outside entrance" },
] as const;

/** Where the play is: the step on screen and whether its tap has happened. */
type Progress = { index: number; tapped: boolean };

/** The step's result is on screen: it has passed, or it is on and needs no tap or was tapped. */
function shows({ index, tapped }: Progress, moment: Moment) {
  const at = stepOf(moment);
  return at < index || (at === index && (!STEPS[at].tap || tapped));
}

/** The step has started: its controls are on screen. */
const started = ({ index }: Progress, moment: Moment) =>
  stepOf(moment) <= index;

/** The script's last step with its tap done: what the illustration settles on. */
const SETTLED: Progress = { index: STEPS.length - 1, tapped: true };

/**
 * Steps through the script once; each tap lands a moment into its step. While it
 * may not play, it shows the settled end and starts no timer.
 */
function usePlay(onEnd: () => void, playing: boolean): Progress {
  const [index, setIndex] = useState(0);
  const [tappedStep, setTappedStep] = useState(-1);
  const ended = useRef(onEnd);
  useEffect(() => {
    ended.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    if (!playing) return;
    const step = STEPS[index];
    const tap = step.tap
      ? window.setTimeout(() => setTappedStep(index), TAP_MS)
      : undefined;
    const next = window.setTimeout(() => {
      if (index === STEPS.length - 1) ended.current();
      else setIndex(index + 1);
    }, step.ms);
    return () => {
      window.clearTimeout(tap);
      window.clearTimeout(next);
    };
  }, [index, playing]);
  if (!playing) return SETTLED;
  return { index, tapped: tappedStep === index };
}

/** The student's finger on a control: it presses in and stays as a soft ring. */
function Finger() {
  return <span className="baf-finger" aria-hidden="true" />;
}

function ChapterTabs({ current }: { current: Chapter }) {
  const { chapters } = useTourText().pitch.backAndForth;
  return (
    <ol className="baf-chapters">
      {CHAPTERS.map((chapter, order) => (
        <li key={chapter} data-current={chapter === current || undefined}>
          <span className="baf-chapter-number">{order + 1}</span>
          {chapters[chapter]}
        </li>
      ))}
    </ol>
  );
}

function SearchView({ progress }: { progress: Progress }) {
  const sorted = shows(progress, "sorted");
  return (
    <div className="baf-view">
      {POSTS.map((post, order) => (
        <motion.div
          key={post.title}
          className="baf-post"
          style={{ left: `${post.x}%`, top: `${post.y}%` }}
          initial={{ opacity: 0, scale: 0.9, rotate: post.turn }}
          animate={
            sorted
              ? { opacity: 0, scale: 0.3, rotate: 0, x: -40, y: 160 }
              : { opacity: 1, scale: 1, rotate: post.turn }
          }
          transition={{ ...CALM, delay: sorted ? order * 0.06 : order * 0.12 }}
        >
          <LampDesk size={18} aria-hidden="true" />
          <span>{post.title}</span>
          <strong>CHF {post.price}</strong>
        </motion.div>
      ))}
      <AnimatePresence>
        {!sorted &&
          SEARCH_QUESTIONS.map((question, order) => (
            <motion.p
              key={question.text}
              className="baf-bubble"
              data-side={order % 2 ? "them" : "me"}
              style={{ left: `${question.x}%`, top: `${question.y}%` }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...SPRING, delay: 0.9 + order * 0.5 }}
            >
              {question.text}
            </motion.p>
          ))}
      </AnimatePresence>
      {sorted && (
        <div className="baf-list">
          {FITS.map((fit, order) => (
            <motion.div
              key={fit.title}
              className="baf-fit"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.5 + order * 0.25 }}
            >
              <span className="baf-tile">
                <LampDesk size={22} aria-hidden="true" />
              </span>
              <span className="baf-fit-words">
                <strong>{fit.title}</strong>
                {fit.detail}
              </span>
              <Check size={18} strokeWidth={3} aria-hidden="true" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function OfferCard({ progress }: { progress: Progress }) {
  const sending = started(progress, "sent");
  const sent = shows(progress, "sent");
  return (
    <motion.div
      className="baf-card"
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.35 }}
    >
      <p className="baf-card-head">
        Offer to Léa · Compact study desk
        <span className="baf-label">Drafted by Pako</span>
      </p>
      <dl className="baf-terms">
        {OFFER_TERMS.map((term) => (
          <div key={term.label}>
            <dt>{term.label}</dt>
            <dd>{term.value}</dd>
          </div>
        ))}
      </dl>
      {sent ? (
        <motion.p
          className="baf-sent"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
        >
          <Check size={16} strokeWidth={3} aria-hidden="true" />
          Sent · waiting for Léa to confirm
        </motion.p>
      ) : (
        <span className="baf-button" data-pressed={sending || undefined}>
          <Send size={16} aria-hidden="true" />
          Send offer
          {sending && <Finger />}
        </span>
      )}
    </motion.div>
  );
}

function MessagesView({ progress }: { progress: Progress }) {
  const gathered = shows(progress, "offer");
  return (
    <div className="baf-view">
      <div className="baf-pile">
        {PILE.map((message, order) => (
          <motion.p
            key={message.text}
            className="baf-bubble"
            data-side={message.side}
            initial={{ opacity: 0, y: -18 }}
            animate={
              gathered
                ? { opacity: 0, scale: 0.4, y: 40 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            transition={{
              ...CALM,
              delay: gathered ? order * 0.05 : 0.2 + order * 0.45,
            }}
          >
            {message.text}
          </motion.p>
        ))}
      </div>
      {gathered && <OfferCard progress={progress} />}
    </div>
  );
}

/** Appears with a calm spring, once its moment has come. */
function Arrive({ when, children }: { when: boolean; children: ReactNode }) {
  if (!when) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
    >
      {children}
    </motion.div>
  );
}

function PickupView({ progress }: { progress: Progress }) {
  const underway = started(progress, "underway");
  const onMyWay = shows(progress, "underway");
  const handing = started(progress, "done");
  const done = shows(progress, "done");
  return (
    <div className="baf-view baf-pickup">
      <p className="baf-seats">
        <span className="baf-seat">
          <Check size={14} strokeWidth={3} aria-hidden="true" />
          You
        </span>
        <motion.span
          className="baf-seat"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Check size={14} strokeWidth={3} aria-hidden="true" />
          Léa
        </motion.span>
      </p>
      <motion.div
        className="baf-card baf-booked"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.9 }}
      >
        <CalendarCheck size={22} aria-hidden="true" />
        <span>
          <strong>Pickup booked</strong>
          Fri, 18:30 · FMEL Triaudes
        </span>
      </motion.div>
      <AnimatePresence>
        {started(progress, "reminder") && !underway && (
          <motion.p
            className="baf-reminder"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={SPRING}
          >
            <Bell size={18} aria-hidden="true" />
            Pickup in 30 min at FMEL Triaudes
          </motion.p>
        )}
      </AnimatePresence>
      <Arrive when={underway}>
        <div className="baf-updates">
          <span className="baf-chip" data-pressed={underway || undefined}>
            <MapPin size={15} aria-hidden="true" />
            On my way
            {underway && !onMyWay && <Finger />}
          </span>
          <span className="baf-chip">Running late</span>
        </div>
      </Arrive>
      <Arrive when={onMyWay}>
        <p className="baf-bubble baf-static" data-side="me">
          On my way. See you at 18:30.
        </p>
      </Arrive>
      <Arrive when={handing}>
        {done ? (
          <motion.p
            className="baf-done"
            initial={{ opacity: 0, scale: 1.3, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            transition={{ type: "spring", stiffness: 520, damping: 18 }}
          >
            <Check size={18} strokeWidth={3} aria-hidden="true" />
            Done · the desk has a new home
          </motion.p>
        ) : (
          <span className="baf-button" data-pressed>
            Picked up
            <Finger />
          </span>
        )}
      </Arrive>
    </div>
  );
}

function ChapterView({ progress }: { progress: Progress }) {
  const { chapter } = STEPS[progress.index];
  if (chapter === "search") return <SearchView progress={progress} />;
  if (chapter === "messages") return <MessagesView progress={progress} />;
  return <PickupView progress={progress} />;
}

/**
 * "Pako handles the back-and-forth": in the intro's drawn style, what a desk
 * takes without takeover and what Pako takes over. Pako drafts and sorts; the
 * student's own tap sends, and both students confirm the pickup.
 */
export default function BackAndForth({
  playing,
  onEnd,
}: {
  /** False until the visitor asks for it with reduced motion: the settled end shows. */
  playing: boolean;
  onEnd: () => void;
}) {
  const progress = usePlay(onEnd, playing);
  const step = STEPS[progress.index];
  const { lines } = useTourText().pitch.backAndForth;
  return (
    <div className="ob-stage baf-stage" aria-hidden="true">
      <ChapterTabs current={step.chapter} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step.chapter}
          className="baf-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChapterView progress={progress} />
        </motion.div>
      </AnimatePresence>
      <div className="baf-guide">
        <Guide
          mood={step.mood}
          layout="guide"
          bubble={{ id: step.moment, text: lines[step.moment] }}
        />
      </div>
    </div>
  );
}
