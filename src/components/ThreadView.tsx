import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "@/components/icons";
import type { DealRole } from "../../shared/deal";
import { useOnline } from "../hooks/useOnline";
import type { ThreadMessage } from "../pakoThread";
import { motionBehavior } from "../uiMotion";
import type { PakoRequest } from "./AskPakoMenu";
import { isPickupKind, threadNewsText } from "../dealWords";
import {
  ChatComposerField,
  ChatDate,
  ChatEvent,
  ChatMessage,
  ChatStart,
  PakoLabel,
  startsNewDay,
} from "./ChatParts";
import type { ThreadEvent } from "./ThreadDeal";
import { Button } from "./ui/button";

/** Close enough to the bottom of a thread to keep following new messages. */
const FOLLOW_DISTANCE = 72;
/** Far enough back in a thread to offer a way down to the newest message. */
const LATEST_DISTANCE = 240;
/** Room kept above what follows the messages when it is taller than the view. */
const AFTER_MARGIN = 8;
/**
 * Where a thread is short on room, on phones, tablets and in low windows, the
 * deal card scrolls with the conversation instead of standing above it.
 */
export const CARD_IN_CONVERSATION = "(max-width: 1023px), (max-height: 800px)";
/** The way back to the newest message rises like a new bubble. */
const RISE = { type: "spring", stiffness: 460, damping: 34 } as const;

/** What a student can ask Pako about the message they write next; each costs one reading. */
export function threadRequests(role: DealRole): PakoRequest[] {
  return [
    ...(role === "buyer"
      ? [
          {
            label: "Ask if it's still available",
            request: "Suggest a message asking whether it is still available.",
          },
        ]
      : []),
    {
      label: "Suggest a pickup time",
      request:
        "Suggest a message proposing a pickup time and meeting point from the listing or the conversation.",
    },
    { label: "Make my draft friendlier", request: "Make my message friendlier." },
    { label: "Write it in French", request: "Write my message in French." },
  ];
}

/** A failed Send in the student's words: a lost connection says so, the draft always stays. */
export function sendFailure(failure: unknown): string {
  if (failure instanceof TypeError)
    return "Couldn't send: no connection. Your draft is still here. Try again.";
  return failure instanceof Error
    ? failure.message
    : "Couldn't send. Your draft is still here. Try again.";
}

type LogEntry =
  | { kind: "message"; message: ThreadMessage; index: number }
  | { kind: "news"; event: ThreadEvent };

/** Messages in order, with news nobody wrote (such as another buyer's deal) where it happened. */
function logEntries(
  messages: readonly ThreadMessage[],
  events: readonly ThreadEvent[],
): LogEntry[] {
  const news = events.filter((event) => event.messageId === null);
  const entries: LogEntry[] = [];
  let next = 0;
  messages.forEach((message, index) => {
    while (
      next < news.length &&
      Date.parse(news[next].at) <= Date.parse(message.at)
    )
      entries.push({ kind: "news", event: news[next++] });
    entries.push({ kind: "message", message, index });
  });
  return [
    ...entries,
    ...news.slice(next).map((event) => ({ kind: "news" as const, event })),
  ];
}

/**
 * Where following the newest stops: the bottom, or the top of what follows
 * the messages (such as a tall deal card) when that is taller than the view.
 */
function latestTop(pane: HTMLElement, after: HTMLElement | null) {
  const bottom = pane.scrollHeight - pane.clientHeight;
  return after ? Math.min(bottom, after.offsetTop - AFTER_MARGIN) : bottom;
}

/**
 * The messages of one thread and what follows them, such as Pako's tray: the
 * only part of the thread that scrolls, so its header and composer stay put.
 * It follows the newest message unless the student scrolled back, and then
 * offers a way down to it.
 */
export function ThreadLog({
  threadKey,
  messages,
  otherName,
  role,
  loaded,
  error,
  drafted,
  extras,
  disclosure,
  events = [],
  after,
}: {
  /** Another thread starts at its newest message again. */
  threadKey: string;
  messages: readonly ThreadMessage[];
  otherName: string;
  /** The side the thread is read from, so pickup news says "You" or the other's name. */
  role: DealRole;
  loaded: boolean;
  error?: string;
  /** Whether a sent message started as Pako's draft. */
  drafted: (messageId: string) => boolean;
  /** Controls for a message from the other student, such as Report. */
  extras?: (message: ThreadMessage) => ReactNode;
  /** Pako's note on reading this thread. */
  disclosure?: ReactNode;
  /** Deal changes: each under the message that carried it, news on its own. */
  events?: readonly ThreadEvent[];
  /** What comes after the newest message and scrolls with it, such as Pako's tray. */
  after?: ReactNode;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const following = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const lastTop = useRef(0);
  const [away, setAway] = useState(false);
  const newestMine = messages.at(-1)?.from === "me";
  useEffect(() => {
    follow.current = true;
    lastTop.current = 0;
    setAway(false);
  }, [threadKey]);
  useEffect(() => {
    const element = pane.current;
    if (element && (follow.current || newestMine))
      element.scrollTo({
        top: latestTop(element, following.current),
        behavior: motionBehavior(),
      });
  }, [threadKey, messages.length, newestMine]);
  // Pako's tray, the deal card and the composer change what fits; the newest message stays in view.
  useEffect(() => {
    const element = pane.current;
    const inner = content.current;
    if (!element || !inner) return;
    const observer = new ResizeObserver(() => {
      if (follow.current)
        element.scrollTop = latestTop(element, following.current);
    });
    observer.observe(element);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  const reader = { role, other: otherName };
  /** Pickup-day news reads as a quiet row of the timeline, like news nobody wrote. */
  const news = (event: ThreadEvent) => (
    <ChatEvent
      key={event.id}
      text={threadNewsText(event, reader)}
      system={event.messageId === null || isPickupKind(event.kind)}
      pako={event.kind === "pickup_check_due"}
    />
  );
  const toLatest = () => {
    const element = pane.current;
    if (!element) return;
    follow.current = true;
    element.scrollTo({
      top: latestTop(element, following.current),
      behavior: motionBehavior(),
    });
    log.current?.focus({ preventScroll: true });
  };
  return (
    <div className="thread-scroll-frame">
      <div
        className="thread-scroll"
        ref={pane}
        onScroll={(event) => {
          // Only the student scrolling back stops the following; a glide
          // towards the newest message that grows on its way keeps it.
          const element = event.currentTarget;
          const back = element.scrollTop < lastTop.current;
          lastTop.current = element.scrollTop;
          const distance =
            latestTop(element, following.current) - element.scrollTop;
          if (distance < FOLLOW_DISTANCE) follow.current = true;
          else if (back) follow.current = false;
          setAway(!follow.current && distance > LATEST_DISTANCE);
        }}
      >
        <div className="thread-scroll-content" ref={content}>
          <div
            className="seller-chat-messages"
            ref={log}
            role="log"
            aria-live="polite"
            aria-label={`Conversation with ${otherName}`}
            tabIndex={-1}
          >
            {disclosure}
            {loaded && !messages.length && !error && <ChatStart />}
            {loaded && (
              <AnimatePresence key={threadKey} initial={false}>
                {logEntries(messages, events).map((entry) =>
                  entry.kind === "news" ? (
                    <div className="message-entry" key={entry.event.id}>
                      {news(entry.event)}
                    </div>
                  ) : (
                    <div className="message-entry" key={entry.message.id}>
                      {startsNewDay(
                        entry.message.at,
                        messages[entry.index - 1]?.at,
                      ) && <ChatDate createdAt={entry.message.at} />}
                      <ChatMessage
                        mine={entry.message.from === "me"}
                        drafted={
                          entry.message.from === "me" &&
                          drafted(entry.message.id)
                        }
                        author={entry.message.from === "me" ? "You" : otherName}
                        createdAt={entry.message.at}
                        text={entry.message.text}
                      >
                        {entry.message.from === "them" &&
                          extras?.(entry.message)}
                      </ChatMessage>
                      {events
                        .filter((event) => event.messageId === entry.message.id)
                        .map(news)}
                    </div>
                  ),
                )}
              </AnimatePresence>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="thread-after" ref={following}>
            {after}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {away && (
          <motion.div
            key="latest"
            className="thread-latest"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
            transition={RISE}
          >
            <Button
              className="thread-latest-button"
              aria-label="Scroll to the latest messages"
              onClick={toLatest}
            >
              <ChevronDown size={16} aria-hidden="true" />
              Latest
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Pako's note at the start of each thread: what he reads, for whom, and where to change it. */
export function ThreadDisclosure({
  autoRead,
  onOpenSettings,
}: {
  autoRead: boolean;
  onOpenSettings: () => void;
}) {
  return (
    <p className="thread-disclosure">
      <span>
        {autoRead
          ? "Pako reads new replies here and suggests answers only you see."
          : "Pako reads replies here only when you ask, and suggests answers only you see."}
      </span>
      <Button className="chat-listing-link" onClick={onOpenSettings}>
        Pako's reply settings
      </Button>
    </p>
  );
}

/**
 * The composer under a thread: Send is always the student's own tap. A failed
 * Send says so right above the field, where the kept text waits for another tap.
 */
export function ThreadComposer({
  text,
  busy,
  disabled,
  error,
  pakoDrafted,
  tools,
  terms,
  onTextChange,
  onSend,
}: {
  text: string;
  busy: boolean;
  disabled: boolean;
  error: string;
  /** The text is still the draft Pako prepared, so it carries his label. */
  pakoDrafted: boolean;
  /** Asking Pako, at the start of the field's row. */
  tools?: ReactNode;
  /** Terms that travel with the text: they update the deal while the text states them. */
  terms?: { states: boolean; line: string } | null;
  onTextChange: (text: string) => void;
  onSend: () => void;
}) {
  const online = useOnline();
  return (
    <form
      className="conversation-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !disabled && text.trim()) onSend();
      }}
    >
      {pakoDrafted && (
        <PakoLabel>I drafted this. Edit it, then send.</PakoLabel>
      )}
      {error ? (
        <p className="chat-error composer-error" role="alert">
          {error}
        </p>
      ) : (
        !online && (
          <p className="composer-offline" role="status">
            You're offline. Keep writing and send once you're back.
          </p>
        )
      )}
      <div className="composer-row">
        {tools}
        <ChatComposerField
          value={text}
          disabled={disabled}
          busy={busy}
          onValueChange={onTextChange}
        />
      </div>
      {terms && text.trim() && (
        <p
          className="composer-terms"
          data-states={terms.states || undefined}
          role="status"
        >
          {terms.line}
        </p>
      )}
      <div className="seller-message-meta">
        <small className="composer-keyboard-hint">
          Ctrl / ⌘ + Enter to send
        </small>
        {text.length >= 3500 && (
          <small>{text.length.toLocaleString()}/4,000</small>
        )}
      </div>
    </form>
  );
}
