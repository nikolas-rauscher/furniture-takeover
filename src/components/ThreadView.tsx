import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import type { DealRole } from "../../shared/deal";
import type { ThreadMessage } from "../pakoThread";
import { motionBehavior } from "../uiMotion";
import type { PakoRequest } from "./AskPakoMenu";
import {
  ChatComposerField,
  ChatDate,
  ChatMessage,
  ChatStart,
  PakoLabel,
  startsNewDay,
} from "./ChatParts";
import { Button } from "./ui/button";

/** Close enough to the bottom of a thread to keep following new messages. */
const FOLLOW_DISTANCE = 72;

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
    { label: "Make it friendlier", request: "Make my message friendlier." },
    { label: "Write it in French", request: "Write my message in French." },
  ];
}

/** The messages of one thread, following the newest one unless the student scrolled back. */
export function ThreadLog({
  threadKey,
  messages,
  otherName,
  loaded,
  error,
  drafted,
  extras,
  disclosure,
}: {
  /** Another thread starts at its newest message again. */
  threadKey: string;
  messages: readonly ThreadMessage[];
  otherName: string;
  loaded: boolean;
  error?: string;
  /** Whether a sent message started as Pako's draft. */
  drafted: (messageId: string) => boolean;
  /** Controls for a message from the other student, such as Report. */
  extras?: (message: ThreadMessage) => ReactNode;
  /** Pako's note on reading this thread. */
  disclosure?: ReactNode;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const newestMine = messages.at(-1)?.from === "me";
  useEffect(() => {
    follow.current = true;
  }, [threadKey]);
  useEffect(() => {
    const element = pane.current;
    if (element && (follow.current || newestMine))
      element.scrollTo({
        top: element.scrollHeight,
        behavior: motionBehavior(),
      });
  }, [threadKey, messages.length, newestMine]);
  // Pako's tray grows and shrinks below the thread; the newest message stays in view.
  useEffect(() => {
    const element = pane.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (follow.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className="seller-chat-messages"
      ref={pane}
      onScroll={(event) => {
        const element = event.currentTarget;
        follow.current =
          element.scrollHeight - element.clientHeight - element.scrollTop <
          FOLLOW_DISTANCE;
      }}
      role="log"
      aria-live="polite"
    >
      {disclosure}
      {loaded && !messages.length && !error && <ChatStart />}
      {loaded && (
        <AnimatePresence key={threadKey} initial={false}>
          {messages.map((message, index) => (
            <div className="message-entry" key={message.id}>
              {startsNewDay(message.at, messages[index - 1]?.at) && (
                <ChatDate createdAt={message.at} />
              )}
              <ChatMessage
                mine={message.from === "me"}
                drafted={message.from === "me" && drafted(message.id)}
                author={message.from === "me" ? "You" : otherName}
                createdAt={message.at}
                text={message.text}
              >
                {message.from === "them" && extras?.(message)}
              </ChatMessage>
            </div>
          ))}
        </AnimatePresence>
      )}
      {error && <p role="alert">{error}</p>}
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
        Settings
      </Button>
    </p>
  );
}

/** The composer under a thread: Send is always the student's own tap. */
export function ThreadComposer({
  text,
  busy,
  disabled,
  sendBlocked,
  error,
  pakoDrafted,
  tools,
  onTextChange,
  onSend,
}: {
  text: string;
  busy: boolean;
  disabled: boolean;
  /** The text can be written but not sent, such as to a sample seller. */
  sendBlocked: boolean;
  error: string;
  /** The text is still the draft Pako prepared, so it carries his label. */
  pakoDrafted: boolean;
  /** Asking Pako, beside the keyboard hint. */
  tools?: ReactNode;
  onTextChange: (text: string) => void;
  onSend: () => void;
}) {
  return (
    <form
      className="conversation-composer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !disabled && !sendBlocked && text.trim()) onSend();
      }}
    >
      {pakoDrafted && (
        <PakoLabel>Pako drafted this for you. Check it, then send.</PakoLabel>
      )}
      <ChatComposerField
        value={text}
        disabled={disabled}
        sendBlocked={sendBlocked}
        busy={busy}
        onValueChange={onTextChange}
      />
      <div className="seller-message-meta">
        {tools}
        <small className="composer-keyboard-hint">
          Ctrl / ⌘ + Enter to send
        </small>
        {text.length >= 3500 && (
          <small>{text.length.toLocaleString()}/4,000</small>
        )}
      </div>
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
