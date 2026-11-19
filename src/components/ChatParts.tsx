import { motion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Image as ImageIcon, LoaderCircle, Send } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useSaved } from "../hooks/useSaved";
import Confetti from "./onboarding/Confetti";
import Pako from "./onboarding/Pako";
import type { PakoMood } from "./onboarding/storyTypes";
import { Button } from "./ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "./ui/input-group";
import "./messages.css";

/** New bubbles arrive like in the intro's chat: a short spring from below. */
const ARRIVAL = { type: "spring", stiffness: 460, damping: 34 } as const;
/** Thread cards rise in one after another, capped so long inboxes stay quick. */
const MAX_STAGGERED_THREADS = 8;
/** How long the thread celebrates a sent offer before it settles again. */
const CELEBRATION_MS = 4200;
/** Enough history to label recent threads; older messages lose the label. */
const MAX_REMEMBERED_DRAFTS = 300;

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

/** The listing photo with the other student's initial on it, recognisable at a glance. */
export function ChatIdentity({
  image,
  name,
}: {
  image?: string;
  name: string;
}) {
  return (
    <span className="chat-identity" aria-hidden="true">
      {image ? (
        <img className="chat-item-thumbnail" src={image} alt="" />
      ) : (
        <span className="chat-item-thumbnail chat-item-placeholder">
          <ImageIcon size={20} />
        </span>
      )}
      <span className="chat-avatar">{initialOf(name)}</span>
    </span>
  );
}

export function ChatThreadCard({
  active,
  disabled = false,
  order,
  image,
  name,
  title,
  preview,
  note,
  onSelect,
}: {
  active: boolean;
  disabled?: boolean;
  /** Position in the inbox, for the entrance stagger. */
  order: number;
  image?: string;
  name: string;
  title: string;
  preview?: ReactNode;
  note?: string;
  onSelect?: () => void;
}) {
  return (
    <Button
      className={cn("chat-thread", active && "active")}
      aria-current={active || undefined}
      disabled={disabled}
      style={
        {
          "--thread-order": Math.min(order, MAX_STAGGERED_THREADS),
        } as CSSProperties
      }
      onClick={onSelect}
    >
      <ChatIdentity image={image} name={name} />
      <span className="chat-thread-copy">
        <strong>{name}</strong>
        <span>{title}</span>
        {preview && <small className="thread-preview">{preview}</small>}
        {note && <small className="thread-note">{note}</small>}
      </span>
    </Button>
  );
}

/** Who the conversation is with and about which listing. */
export function ChatPartner({
  name,
  image,
  title,
  detail,
  onOpenListing,
}: {
  name: string;
  image?: string;
  title: string;
  detail?: ReactNode;
  onOpenListing: () => void;
}) {
  return (
    <>
      <ChatIdentity image={image} name={name} />
      <div className="chat-header-copy">
        <strong>{name}</strong>
        <Button className="chat-listing-link" onClick={onOpenListing}>
          {title} ↗
        </Button>
        {detail && <small>{detail}</small>}
      </div>
    </>
  );
}

function clock(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({
  mine,
  author,
  drafted = false,
  createdAt,
  text,
  children,
}: {
  mine: boolean;
  author: string;
  /** Sent from a draft Pako prepared, so it carries his label like in the intro. */
  drafted?: boolean;
  createdAt: string;
  text: string;
  /** Extra controls for this message, such as Report. */
  children?: ReactNode;
}) {
  return (
    <motion.div
      className="chat-message"
      data-mine={mine || undefined}
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={ARRIVAL}
    >
      <span className="chat-message-meta" data-drafted={drafted || undefined}>
        {drafted ? "Pako for you" : author} ·{" "}
        <time dateTime={createdAt}>{clock(createdAt)}</time>
      </span>
      <p className="chat-bubble">{text}</p>
      {children}
    </motion.div>
  );
}

/** A message shows its date once, above the first message of each day. */
export function startsNewDay(createdAt: string, previous?: string) {
  return (
    !previous ||
    new Date(previous).toDateString() !== new Date(createdAt).toDateString()
  );
}

export function ChatDate({ createdAt }: { createdAt: string }) {
  return (
    <div className="chat-date">
      <span>
        {new Date(createdAt).toLocaleDateString([], {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>
  );
}

/** An empty thread: Pako suggests how to open the conversation. */
export function ChatStart() {
  return (
    <div className="chat-start">
      <Pako mood="wave" size={56} />
      <p className="chat-start-note">
        Ask about this item or propose a pickup time. Your message will appear
        here once sent.
      </p>
    </div>
  );
}

/** A few mutually exclusive views; the highlight glides to the chosen one. */
export function ChatSegment<Value extends string>({
  label,
  options,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  options: readonly (readonly [Value, string])[];
  value: Value;
  disabled?: boolean;
  onChange: (value: Value) => void;
}) {
  return (
    <div className="chat-segment" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <Button
          key={id}
          aria-pressed={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
        >
          {value === id && (
            <motion.span
              layoutId={`chat-segment-${label}`}
              className="chat-segment-highlight"
              transition={ARRIVAL}
            />
          )}
          <span className="chat-segment-label">{text}</span>
        </Button>
      ))}
    </div>
  );
}

/** Marks text that Pako prepared, the way the intro labels Pako's messages. */
export function PakoLabel({
  mood = "idle",
  children,
}: {
  mood?: PakoMood;
  children: ReactNode;
}) {
  return (
    <span className="pako-label">
      <Pako mood={mood} size={22} />
      {children}
    </span>
  );
}

const isMessageIds = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export type PakoDrafts = ReturnType<typeof usePakoDrafts>;

/** Remembers which sent messages started as Pako's drafts, to label them in the thread. */
export function usePakoDrafts() {
  const [ids, setIds] = useSaved<string[]>(
    "takeover-pako-messages",
    [],
    isMessageIds,
  );
  return {
    drafted: (messageId: string) => ids.includes(messageId),
    remember: (messageId: string) =>
      setIds((current) =>
        [...current.filter((id) => id !== messageId), messageId].slice(
          -MAX_REMEMBERED_DRAFTS,
        ),
      ),
  };
}

/** The other student whose turn it is after an offer went out; null while calm. */
export function useSentCelebration() {
  const [recipient, setRecipient] = useState<string | null>(null);
  useEffect(() => {
    if (recipient === null) return;
    const timer = setTimeout(() => setRecipient(null), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [recipient]);
  return [recipient, setRecipient] as const;
}

/** A short cheer once an offer Pako drafted is sent, like the intro's booked pickup. */
export function SentCelebration({ recipient }: { recipient: string }) {
  return (
    <motion.p
      className="chat-celebration"
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.16 } }}
      transition={ARRIVAL}
    >
      <span className="chat-celebration-pako" aria-hidden="true">
        <Pako mood="cheer" size={40} />
        <span className="chat-celebration-burst">
          <Confetti />
        </span>
      </span>
      <span>
        <strong>Offer sent to {recipient}!</strong> Now it's their turn.
      </span>
    </motion.p>
  );
}

/** The message field grows with its text up to a limit; Ctrl/⌘ + Enter sends. */
export function ChatComposerField({
  value,
  disabled,
  busy,
  onValueChange,
}: {
  value: string;
  disabled: boolean;
  busy: boolean;
  onValueChange: (value: string) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const input = field.current;
    if (!input) return;
    const fit = () => {
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    };
    fit();
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth === width) return;
      width = input.clientWidth;
      fit();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [value]);
  const sendable = !disabled && !busy && value.trim().length > 0;
  return (
    <InputGroup className="seller-message-input">
      <InputGroupTextarea
        ref={field}
        aria-label="Message"
        placeholder="Write a message…"
        maxLength={4000}
        rows={1}
        value={value}
        disabled={disabled || busy}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey) &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <InputGroupAddon align="inline-end">
        <Button
          animateIcon
          type="submit"
          className="button primary seller-message-send"
          aria-label={busy ? "Sending message" : "Send message"}
          disabled={!sendable}
        >
          {busy ? (
            <LoaderCircle animate size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          <span>{busy ? "Sending…" : "Send"}</span>
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
