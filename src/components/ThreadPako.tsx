import { useState } from "react";
import type { DealTerms } from "../../shared/deal";
import type { ThreadOption } from "../../shared/threadTurn";
import {
  usePakoThread,
  type PakoAvailability,
  type PakoThread,
} from "../hooks/usePakoThread";
import type { ThreadMoment } from "../pakoMoods";
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
  /** The terms Pako's option proposes or accepts, which travel with it while the text states them. */
  terms: DealTerms | null;
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
  agreedWith,
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
  /** The buyer a seller agreed with in another thread about the same listing. */
  agreedWith: string | undefined;
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
        title: thread.listing.title,
        listingStatus: thread.listing.status,
        dealStatus: thread.deal?.status,
        agreedWith,
        messages: thread.messages,
        now: new Date(),
        canNudge,
      })
    : null;
  return {
    /** The tray, saying where the deal stands while Pako has no reply to read. */
    tray: (dealMoment: ThreadMoment | null) =>
      thread && (
        <PakoTray
          state={pako.tray}
          notice={notice}
          dealMoment={dealMoment}
          role={thread.role}
          otherName={otherName}
          title={thread.listing.title}
          remaining={reading.remaining}
          draft={text}
          chosen={current?.key}
          onRead={pako.read}
          onWrite={(written, option) => {
            onText(written.text);
            setWriting({
              ...written,
              threadKey: thread.key,
              kind: option?.kind,
              terms: option?.terms ?? null,
            });
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
    /** Pako's reading of the other student's latest reply, not of a request the student made. */
    turn:
      pako.tray.phase === "ready" && !pako.tray.asked ? pako.tray.turn : null,
    /** The terms of the option the student picked, still in the composer. */
    terms: writing?.threadKey === thread?.key ? (writing?.terms ?? null) : null,
    /** The composer holds Pako's words exactly as he wrote them. */
    draftedByPako: Boolean(current),
    /** Pako's offer or acceptance is going out: worth a small celebration. */
    celebrates: current?.kind === "accept" || current?.kind === "counter",
    /** The message went out, so Pako's words are no longer in the composer. */
    sent: () => setWriting(undefined),
  };
}
