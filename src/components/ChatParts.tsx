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
import type { DealRole } from "../../shared/deal";
import { useEntrance } from "../hooks/useEntrance";
import { useSaved } from "../hooks/useSaved";
import { agreedWords } from "../dealWords";
import { fitTextarea } from "../textarea";
import Confetti from "./onboarding/Confetti";
import Pako, { PAKO_FLIGHT_MS } from "./onboarding/Pako";
import type { PakoMood } from "./onboarding/storyTypes";
import { Button } from "./ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "./ui/input-group";
import { Skeleton } from "./ui/skeleton";
import "./composer.css";
import "./messages.css";

/** New bubbles arrive like in the intro's chat: a short spring from below. */
const ARRIVAL = { type: "spring", stiffness: 460, damping: 34 } as const;
/** Thread cards rise in one after another, capped so long inboxes stay quick. */
const MAX_STAGGERED_THREADS = 8;
/** How long each celebration stays: a sent offer for one delivery flight, a deal a little longer. */
const CELEBRATION_MS: Record<ChatMoment["kind"], number> = {
  sent: PAKO_FLIGHT_MS,
  confirmed: PAKO_FLIGHT_MS,
  agreed: 3600,
};
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
  unread = false,
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
  /** The other student wrote since the student last read this thread. */
  unread?: boolean;
  onSelect?: () => void;
}) {
  // A thread rises in once, when it first appears, not on each return to the inbox.
  const entrance = useEntrance(true);
  return (
    <Button
      className={cn(
        "chat-thread",
        active && "active",
        unread && "unread",
        entrance.entering && "arriving",
      )}
      aria-current={active || undefined}
      disabled={disabled}
      style={
        {
          "--thread-order": Math.min(order, MAX_STAGGERED_THREADS),
        } as CSSProperties
      }
      onClick={onSelect}
      onAnimationEnd={entrance.onAnimationEnd}
    >
      <ChatIdentity image={image} name={name} />
      <span className="chat-thread-copy">
        {unread && <span className="sr-only">New message from </span>}
        <strong>{name}</strong>
        <span>{title}</span>
        {preview && <small className="thread-preview">{preview}</small>}
        {note && <small className="thread-note">{note}</small>}
      </span>
      {unread && <span className="chat-thread-dot" aria-hidden="true" />}
    </Button>
  );
}

/**
 * Who the conversation is with and about which listing: one target the size
 * of the photo and the names beside it, which opens the listing.
 */
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
    <Button className="chat-partner" onClick={onOpenListing}>
      <ChatIdentity image={image} name={name} />
      <span className="chat-header-copy">
        <strong>{name}</strong>
        <span className="chat-partner-listing">
          <span className="sr-only">Open the listing </span>
          {title}
          <span aria-hidden="true"> ↗</span>
        </span>
        {detail && <small>{detail}</small>}
      </span>
    </Button>
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
        {drafted ? "Drafted with Pako" : author} ·{" "}
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

/** Dates read like the rest of the app ("19 Nov"); other years add the year. */
export function ChatDate({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  return (
    <div className="chat-date">
      <span>
        {date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          ...(date.getFullYear() === new Date().getFullYear()
            ? {}
            : { year: "numeric" }),
        })}
      </span>
    </div>
  );
}

/** The inbox while its conversations load: rows the size of the real ones. */
export function InboxLoading() {
  return (
    <div className="inbox-loading" role="status">
      <span className="sr-only">Loading conversations…</span>
      <div aria-hidden="true">
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}

/** An empty thread: Pako suggests how to open the conversation. */
export function ChatStart() {
  return (
    <div className="chat-start">
      <Pako mood="wave" size={56} />
      <p className="chat-start-note">
        Ask about the item or suggest a pickup time.
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

/** Marks text that Pako prepared; the label's Pako stands still, like an icon. */
export function PakoLabel({ children }: { children: ReactNode }) {
  return (
    <span className="pako-label">
      <Pako mood="idle" size={22} still />
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

/** A small joy in a thread: an offer went out, the student confirmed, or both did. */
export type ChatMoment =
  | { kind: "sent"; other: string }
  | { kind: "confirmed"; other: string }
  | { kind: "agreed"; role: DealRole; other: string; title: string };

/** The celebration on screen and the thread it belongs to, if any; it leaves by itself. */
export function useChatCelebration() {
  const [moment, setMoment] = useState<
    (ChatMoment & { threadKey: string }) | null
  >(null);
  useEffect(() => {
    if (moment === null) return;
    const timer = setTimeout(
      () => setMoment(null),
      CELEBRATION_MS[moment.kind],
    );
    return () => clearTimeout(timer);
  }, [moment]);
  return [moment, setMoment] as const;
}

const CELEBRATION_MOODS: Record<ChatMoment["kind"], PakoMood> = {
  sent: "deliver",
  confirmed: "happy",
  agreed: "cheer",
};

function celebrationWords(moment: ChatMoment): ReactNode {
  switch (moment.kind) {
    case "sent":
      return (
        <>
          <strong>Offer sent!</strong> Waiting for {moment.other}.
        </>
      );
    case "confirmed":
      return (
        <>
          <strong>You confirmed!</strong> Waiting for {moment.other}.
        </>
      );
    case "agreed": {
      const { cheer, meaning } = agreedWords(
        moment.role,
        moment.other,
        moment.title,
      );
      return (
        <>
          <strong>{cheer}</strong> {meaning}
        </>
      );
    }
  }
}

/**
 * A short celebration in the thread: Pako flies a sent offer over on beating
 * lids, is happy when the student confirmed and cheers when both did. Paper
 * confetti marks an offer and a deal; with reduced motion Pako stands still
 * and no confetti flies.
 */
export function ChatCelebration({ moment }: { moment: ChatMoment }) {
  return (
    <motion.p
      className="chat-celebration"
      data-kind={moment.kind}
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.16 } }}
      transition={ARRIVAL}
    >
      <span className="chat-celebration-pako" aria-hidden="true">
        <Pako mood={CELEBRATION_MOODS[moment.kind]} size={52} />
        {moment.kind !== "confirmed" && (
          <span className="chat-celebration-burst">
            <Confetti />
          </span>
        )}
      </span>
      <span className="chat-celebration-text">{celebrationWords(moment)}</span>
    </motion.p>
  );
}

/** A centred chip in the thread: what a message changed in the deal, or news from the app. */
export function ChatEvent({
  text,
  system = false,
}: {
  text: string;
  /** Nobody wrote it; the app noted it, such as another buyer's deal. */
  system?: boolean;
}) {
  return (
    <motion.p
      className="chat-event"
      data-system={system || undefined}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={ARRIVAL}
    >
      <span>{text}</span>
    </motion.p>
  );
}

const isEventIds = isMessageIds;
/** Enough celebrated deals to never cheer twice for recent ones. */
const MAX_REMEMBERED_CELEBRATIONS = 300;

/** Remembers which deal moments were already celebrated, so each plays once. */
export function useCelebrated() {
  const [ids, setIds] = useSaved<string[]>(
    "takeover-celebrated",
    [],
    isEventIds,
  );
  return {
    celebrated: (id: string) => ids.includes(id),
    remember: (id: string) =>
      setIds((current) =>
        [...current.filter((item) => item !== id), id].slice(
          -MAX_REMEMBERED_CELEBRATIONS,
        ),
      ),
  };
}

/** The shared composer: the field grows with its text up to a limit; Ctrl/⌘ + Enter sends. */
export function ChatComposerField({
  value,
  disabled,
  sendBlocked,
  busy,
  onValueChange,
}: {
  value: string;
  disabled: boolean;
  /** The text can be written but not sent. */
  sendBlocked: boolean;
  busy: boolean;
  onValueChange: (value: string) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const input = field.current;
    if (!input) return;
    fitTextarea(input);
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth === width) return;
      width = input.clientWidth;
      fitTextarea(input);
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [value]);
  const sendable =
    !disabled && !sendBlocked && !busy && value.trim().length > 0;
  const sendLabel = busy ? "Sending message" : "Send message";
  return (
    <InputGroup className="composer-field">
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
          className="icon-button composer-send"
          aria-label={sendLabel}
          title={sendLabel}
          disabled={!sendable}
        >
          {busy ? (
            <LoaderCircle animate size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
