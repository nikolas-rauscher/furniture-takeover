import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { CalendarCheck, Check, Clock, MapPin } from "@/components/icons";
import { money } from "../../../shared/marketplace";
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
const INTRO_MS = 500;
const TYPING_MS = 550;
const READ_BASE_MS = 300;
const READ_MS_PER_CHAR = 10;
const READ_MAX_MS = 1100;
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

/** The "chat" scene: Pako agrees on price and pickup, the visitor confirms. */
export default function ChatDemo({ answers, onMood, onDone }: SceneProps) {
  const [firstItem] = answers.items;
  const scene = useMemo(
    () => chatScene(answers.intent, firstItem, answers.place),
    [answers.intent, firstItem, answers.place],
  );
  const beats = useMemo(() => conversationBeats(scene.lines), [scene]);
  const beat = useTimeline(beats);
  const [booked, setBooked] = useState(false);

  const exchange = beat - 1;
  const shown = exchange < 0 ? 0 : Math.ceil(exchange / 2);
  const typing =
    exchange >= 0 && exchange % 2 === 0 && shown < scene.lines.length
      ? scene.lines[shown].from
      : null;
  const agreed = beat >= beats.length;
  const mood: PakoMood = booked ? "cheer" : agreed ? "happy" : "work";
  const announceMood = useEffectEvent(onMood);
  useEffect(() => announceMood(mood), [mood]);

  function confirm() {
    setBooked(true);
    onDone();
  }

  function status() {
    if (booked) return "Pickup booked.";
    if (!agreed) return "";
    const { deal } = scene;
    return `Agreed: ${deal.title} for ${money(deal.price)}, ${deal.time} at ${deal.meetingPoint}. Confirm to book the pickup.`;
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
      {agreed && (
        <DealCard
          scene={scene}
          Icon={itemIcons[firstItem]}
          booked={booked}
          onConfirm={confirm}
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
        <span className="ob-chat-label">{GUIDE_NAME} for you</span>
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
  booked,
  onConfirm,
}: {
  scene: ChatScene;
  Icon: IntroIcon;
  booked: boolean;
  onConfirm: () => void;
}) {
  const { deal } = scene;
  const card = useRevealOnMount<HTMLElement>();
  return (
    <motion.section
      ref={card}
      className="ob-chat-deal"
      aria-label="Agreed deal"
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
      {booked ? (
        <BookedBanner />
      ) : (
        <Button
          className="ob-button ob-chat-confirm ob-tap-hint"
          onClick={onConfirm}
        >
          {scene.role === "buyer" ? "Confirm pickup" : "Confirm sale"}
        </Button>
      )}
    </motion.section>
  );
}

/** Replaces the confirm button, so it takes over keyboard focus from it. */
function BookedBanner() {
  const banner = useRef<HTMLParagraphElement>(null);
  useEffect(() => banner.current?.focus(), []);
  return (
    <motion.p
      ref={banner}
      tabIndex={-1}
      className="ob-chat-booked"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <span className="ob-chat-booked-icon" aria-hidden="true">
        <CalendarCheck size={18} />
      </span>
      Pickup booked
      <Check
        animate
        size={20}
        strokeWidth={3}
        className="ob-chat-booked-check"
      />
    </motion.p>
  );
}
