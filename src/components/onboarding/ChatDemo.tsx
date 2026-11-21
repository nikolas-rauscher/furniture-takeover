import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useState, type Ref } from "react";
import { Clock, MapPin } from "@/components/icons";
import { money } from "../../../shared/marketplace";
import BookedBanner from "../BookedBanner";
import { Button } from "../ui/button";
import {
  chatScene,
  GUIDE_NAME,
  type ChatLine,
  type ChatScene,
} from "./onboardingContent";
import { itemIcons, type IntroIcon } from "./onboardingIcons";
import type { PakoMood, SceneProps } from "./storyTypes";
import { useRevealOnMount, useTimeline } from "./useStory";
import "./agent-demos.css";

/** A moment to read Pako's bubble before the first message. */
const INTRO_MS = 400;
const TYPING_MS = 400;
const READ_BASE_MS = 200;
const READ_MS_PER_CHAR = 8;
const READ_MAX_MS = 900;
const MESSAGE_SPRING = { type: "spring", stiffness: 500, damping: 38 } as const;

/** Every line takes two beats: its sender types, then it stays long enough to read. */
function conversationBeats(lines: ChatLine[]) {
  return [
    INTRO_MS,
    ...lines.flatMap((line) => [
      TYPING_MS,
      Math.min(READ_MAX_MS, READ_BASE_MS + line.text.length * READ_MS_PER_CHAR),
    ]),
  ];
}

/** How long the other student takes to confirm the example terms. */
const PARTNER_CONFIRM_MS = 1100;

type Confirmation = "open" | "waiting" | "booked";

/**
 * The "chat" scene teaches consent in order: Pako drafts, the visitor sends,
 * the visitor sends the terms for confirmation and the other student confirms.
 */
export default function ChatDemo({ answers, onMood, onDone }: SceneProps) {
  const [firstItem] = answers.items;
  const scene = useMemo(
    () => chatScene(answers.intent, firstItem, answers.place),
    [answers.intent, firstItem, answers.place],
  );
  const beats = useMemo(() => conversationBeats(scene.lines), [scene]);
  const beat = useTimeline(beats);
  const [confirmation, setConfirmation] = useState<Confirmation>("open");
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    if (confirmation !== "waiting") return;
    const timer = window.setTimeout(() => {
      setConfirmation("booked");
      finish();
    }, PARTNER_CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmation]);

  const exchange = beat - 1;
  const shown = exchange < 0 ? 0 : Math.ceil(exchange / 2);
  const typing =
    exchange >= 0 && exchange % 2 === 0 && shown < scene.lines.length
      ? scene.lines[shown].from
      : null;
  const talked = beat >= beats.length;
  const mood: PakoMood =
    confirmation === "booked" ? "cheer" : talked ? "happy" : "work";
  const announceMood = useEffectEvent(onMood);
  useEffect(() => announceMood(mood), [mood]);

  function status() {
    const { deal, partner } = scene;
    if (confirmation === "booked")
      return `${partner.name} confirmed. Example pickup booked.`;
    if (confirmation === "waiting")
      return `Waiting for ${partner.name} to confirm.`;
    if (!talked) return "";
    return `Example terms: ${deal.title} for ${money(deal.price)}, ${deal.time} at ${deal.meetingPoint}. Send them for confirmation.`;
  }

  return (
    <div className="ob-stage ob-chat">
      <span className="ob-demo-tag">Example</span>
      <div className="ob-chat-head">
        <span className="ob-chat-avatar" aria-hidden="true">
          {scene.partner.initial}
        </span>
        <span className="ob-chat-who">
          <strong>{scene.partner.name}</strong>
          <span>{scene.partner.detail}</span>
        </span>
      </div>
      <div
        className="ob-chat-thread"
        role="log"
        aria-label={`Conversation with ${scene.partner.name}`}
      >
        {scene.lines.slice(0, shown).map((line, index) => (
          <ChatMessage
            key={index}
            line={line}
            partnerName={scene.partner.name}
          />
        ))}
        <AnimatePresence mode="popLayout">
          {typing && <TypingIndicator key={exchange} from={typing} />}
        </AnimatePresence>
      </div>
      {talked && (
        <DealCard
          scene={scene}
          Icon={itemIcons[firstItem]}
          confirmation={confirmation}
          onSend={() => setConfirmation("waiting")}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {status()}
      </p>
    </div>
  );
}

function ChatMessage({
  line,
  partnerName,
}: {
  line: ChatLine;
  partnerName: string;
}) {
  return (
    <motion.div
      layout
      className="ob-chat-message"
      data-from={line.from}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MESSAGE_SPRING}
    >
      {line.from === "pako" ? (
        <span className="ob-chat-label">You · drafted with {GUIDE_NAME}</span>
      ) : (
        <span className="sr-only">{partnerName}: </span>
      )}
      <p className="ob-chat-bubble">{line.text}</p>
    </motion.div>
  );
}

/** Takes the ref AnimatePresence uses to pop it out while the message replaces it. */
function TypingIndicator({
  from,
  ref,
}: {
  from: ChatLine["from"];
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <motion.div
      ref={ref}
      layout
      className="ob-chat-typing"
      data-from={from}
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      transition={MESSAGE_SPRING}
    >
      <span />
      <span />
      <span />
    </motion.div>
  );
}

function DealCard({
  scene,
  Icon,
  confirmation,
  onSend,
}: {
  scene: ChatScene;
  Icon: IntroIcon;
  confirmation: Confirmation;
  onSend: () => void;
}) {
  const { deal, partner } = scene;
  const card = useRevealOnMount<HTMLElement>();
  return (
    <motion.section
      ref={card}
      className="ob-chat-deal"
      aria-label="Example terms"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      <div className="ob-chat-deal-item">
        <span className="ob-chat-tile" aria-hidden="true">
          <Icon size={20} />
        </span>
        <span className="ob-chat-deal-title">{deal.title}</span>
        <span className="ob-chat-deal-price">{money(deal.price)}</span>
      </div>
      <p className="ob-chat-deal-terms">
        <span>
          <Clock size={14} aria-hidden="true" />
          {deal.time}
        </span>
        <span>
          <MapPin size={14} aria-hidden="true" />
          {deal.meetingPoint}
        </span>
      </p>
      {confirmation === "booked" ? (
        <BookedBanner detail={`${partner.name} confirmed too`}>
          Example pickup booked
        </BookedBanner>
      ) : (
        <Button
          className="button primary large ob-chat-confirm ob-tap-hint"
          aria-disabled={confirmation === "waiting"}
          onClick={confirmation === "open" ? onSend : undefined}
        >
          {confirmation === "waiting"
            ? `Waiting for ${partner.name}…`
            : "Send for confirmation"}
        </Button>
      )}
    </motion.section>
  );
}
