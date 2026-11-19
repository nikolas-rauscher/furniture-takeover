import { useState } from "react";
import type { ThreadOption } from "../../shared/threadTurn";
import {
  usePakoThread,
  type PakoAvailability,
  type PakoThread,
} from "../hooks/usePakoThread";
import { threadNotice } from "../pakoThread";
import AskPakoMenu from "./AskPakoMenu";
import PakoTray, { type PakoWriting } from "./PakoTray";
import { threadRequests } from "./ThreadView";

/** How Pako may read replies, as set for the whole app. */
export type PakoReading = {
  available: PakoAvailability;
  autoRead: boolean;
  /** Readings left today, when known. */
  remaining: number | undefined;
  onRemaining: (remaining: number) => void;
  onOpenSettings: () => void;
  onFindSimilar: (title: string) => void;
};

type Writing = PakoWriting & {
  threadKey: string;
  kind?: ThreadOption["kind"];
};

/**
 * Pako beside the open thread of either inbox: his tray above the composer,
 * Ask Pako beside it, and whether the composer still holds his words, which
 * then carry his label once sent.
 */
export function useThreadPako({
  reading,
  thread,
  otherName,
  visible,
  text,
  onText,
  canNudge,
}: {
  reading: PakoReading;
  thread: PakoThread | null;
  otherName: string;
  /** The thread is on screen. */
  visible: boolean;
  text: string;
  onText: (text: string) => void;
  /** Sample sellers never reply, so they are never nudged. */
  canNudge: boolean;
}) {
  const pako = usePakoThread({
    thread,
    available: reading.available,
    autoRead: reading.autoRead,
    remaining: reading.remaining,
    visible,
    onRemaining: reading.onRemaining,
  });
  const [writing, setWriting] = useState<Writing>();
  const current =
    writing &&
    thread &&
    writing.threadKey === thread.key &&
    writing.text === text
      ? writing
      : undefined;
  const notice = thread
    ? threadNotice({
        role: thread.role,
        listingStatus: thread.listing.status,
        messages: thread.messages,
        now: new Date(),
        canNudge,
      })
    : null;
  return {
    tray: thread && (
      <PakoTray
        state={pako.tray}
        notice={notice}
        role={thread.role}
        otherName={otherName}
        title={thread.listing.title}
        remaining={reading.remaining}
        draft={text}
        chosen={current?.key}
        onRead={pako.read}
        onWrite={(written, option) => {
          onText(written.text);
          setWriting({ ...written, threadKey: thread.key, kind: option?.kind });
        }}
        onFindSimilar={() => reading.onFindSimilar(thread.listing.title)}
      />
    ),
    askMenu: thread && reading.available === "ready" && (
      <AskPakoMenu
        requests={threadRequests(thread.role)}
        disabled={!pako.canAsk}
        onAsk={(request) => pako.ask(request, text)}
      />
    ),
    /** The composer holds Pako's words exactly as he wrote them. */
    draftedByPako: Boolean(current),
    /** Pako's offer or acceptance is going out: worth a small celebration. */
    celebrates: current?.kind === "accept" || current?.kind === "counter",
    /** The message went out, so Pako's words are no longer in the composer. */
    sent: () => setWriting(undefined),
  };
}
