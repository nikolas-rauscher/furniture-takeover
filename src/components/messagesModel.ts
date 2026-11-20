import { useState, type ReactNode } from "react";
import type { DealRole } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { PakoThread } from "../hooks/usePakoThread";
import type { ThreadMessage } from "../pakoThread";
import type { NextBuyer } from "./DealCard";
import type { OfferAgain } from "./messagesProps";
import type { DealController, ThreadEvent } from "./ThreadDeal";

/** One conversation in the inbox list; without `onSelect` it is only shown. */
export type ThreadRow = {
  id: string;
  active: boolean;
  image?: string;
  name: string;
  title: string;
  preview?: string;
  note?: string;
  unread?: boolean;
  onSelect?: () => void;
};

export type InboxFilter = "all" | "buying" | "selling";

/** Search and filters over the account's conversations. */
type InboxSearch = {
  query: string;
  onQuery: (query: string) => void;
  filter: InboxFilter;
  onFilter: (filter: InboxFilter) => void;
};

/** How the conversation list ends when it lists nothing. */
type InboxEmptiness = "none" | "inbox" | { note: string };

/** The open thread's header actions: a local delete, or the account's menu. */
type ThreadActions = {
  delete?: { held: boolean; onDelete: () => void };
  archive?: { archived: boolean; onToggle: () => void };
  block?: { blocked: boolean; onToggle: () => void };
};

/** The ordinary send path of the open thread. */
type ThreadSend = {
  listingId: string;
  /** Makes sure the conversation exists before anything is written to it. */
  prepare?: () => Promise<unknown>;
  /** Writes the composed text without terms and returns the message ID. */
  plain: (text: string) => Promise<string>;
  /** Brings the inbox up to date once the message is out. */
  after?: () => Promise<void>;
};

export type OpenThread = {
  image?: string;
  title: string;
  detail?: string;
  onOpenListing: () => void;
  onBack: () => void;
  /** The messages have loaded, so the log shows them. */
  loaded: boolean;
  error?: string;
  /** The note on Pako's reading shows above the log. */
  disclosure: boolean;
  actions: ThreadActions;
  blocked: boolean;
  /** Why the deal can't change here right now. */
  dealNote?: string;
  banner?: ReactNode;
  send: ThreadSend;
};

/** One mode's inbox as the shared Messages screen renders it. */
export type MessagesModel = {
  kind: "demo" | "account";
  state: MessagesState;
  /** The open conversation's selection key; an offer again goes by it. */
  selected: string;
  /** Where the composer's text is kept. */
  draftKey: string;
  role: DealRole;
  conversationOpen: boolean;
  /** The thread is on screen. */
  visible: boolean;
  now: Date;
  caption?: string;
  notice?: string;
  archiveView?: { showing: boolean; onToggle: () => void };
  search?: InboxSearch;
  refreshError?: string;
  rows: ThreadRow[];
  newRow?: ThreadRow;
  loading: boolean;
  empty: InboxEmptiness;
  loadError?: { message: string; onRetry: () => void };
  readError?: string;
  undo?: { onUndo: () => void; onDismiss: () => void };
  rolePreview?: (role: DealRole) => void;
  /** The booked pickup the developer's demo clock jumps around. */
  pickupClock?: string;
  thread?: OpenThread;
  threadKey: string;
  otherName: string;
  product: Product | undefined;
  messages: ThreadMessage[];
  events: ThreadEvent[];
  messageExtras?: (message: ThreadMessage) => ReactNode;
  controller: DealController;
  /** The student can change the deal and use Pako here. */
  dealEnabled: boolean;
  nextBuyer: NextBuyer | undefined;
  pako: {
    thread: PakoThread | null;
    canNudge: boolean;
    agreedWith: string | undefined;
  };
  /** A listing's "Draft an offer" opens the offer card here. */
  offerTarget: boolean;
  /** Terms can travel with the composed text. */
  termsAllowed: boolean;
  /** Messages the app prepared for this thread, labelled as Pako's until edited. */
  preparedDrafts: string[];
  /** The prepared opening offer, which carries the app's terms. */
  openingDraft: string | undefined;
  read: {
    key: string;
    newsAt: string | undefined;
    mark: (key: string, seenUpTo: string) => unknown;
  };
};

/** What both modes keep the same way: drafts, the request in flight, its error and an offer again. */
export function useMessagesState(initialDrafts: Record<string, string>) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offerAgain, setOfferAgain] = useState<OfferAgain>();
  /** Opens the next buyer's thread with Pako's offer of the released item. */
  const offerAgainIn = (draftKey: string, offer: OfferAgain) => {
    setOfferAgain(offer);
    setDrafts((items) => ({ ...items, [draftKey]: offer.draft }));
  };
  return {
    drafts,
    setDrafts,
    busy,
    setBusy,
    error,
    setError,
    offerAgain,
    setOfferAgain,
    offerAgainIn,
  };
}
type MessagesState = ReturnType<typeof useMessagesState>;
