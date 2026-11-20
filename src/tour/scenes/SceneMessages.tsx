import { threadDealSnapshot, type DealRole } from "../../../shared/deal";
import { cardImageFor } from "../../../shared/listingPhotos";
import Messages from "../../components/Messages";
import { NamedOfferPriceContext } from "../../components/namedOfferPrice";
import type { DealController } from "../../components/ThreadDeal";
import {
  useMessagesState,
  type MessagesModel,
} from "../../components/messagesModel";
import type { MessagesProps } from "../../components/messagesProps";
import type { PakoTurnCache } from "../../pakoTurnCache";
import type { ThreadMessage } from "../../pakoThread";
import { INERT } from "./AppScreen";
import {
  moveDeal,
  movePickup,
  writeMessage,
  type SceneThread,
} from "./sceneThread";
import "../../components/messages.css";

/** The example thread has no earlier readings, and keeps none. */
const NO_READINGS: PakoTurnCache = {
  load: async () => null,
  save: async () => undefined,
};

const asRead = (thread: SceneThread, role: DealRole): ThreadMessage[] =>
  thread.messages.map((message) => ({
    id: message.id,
    from: message.sender === role ? "me" : "them",
    text: message.text,
    at: message.at,
    ...(message.structured ? { structured: true } : {}),
  }));

let sent = 0;
const nextMessageId = () => `scene-message-${(sent += 1)}`;

/** The example search named no price, so the offer card starts from Pako's own. */
const NO_NAMED_PRICE = () => null;

type SceneThreadSetup = {
  thread: SceneThread;
  onThread: (thread: SceneThread) => void;
  role: DealRole;
  otherName: string;
  /** The scene's clock, which the pickup counts down on. */
  now: Date;
  /** Set once the listing's "Draft offer" was tapped: the offer card opens. */
  offerRequest?: number;
};

/**
 * The open thread of the Messages screen, kept in the scene: every tap on the
 * deal card goes through the app's own deal rules, nothing leaves the page.
 */
function useSceneThread({
  thread,
  onThread,
  role,
  otherName,
  now,
  offerRequest,
}: SceneThreadSetup): { app: MessagesProps; model: MessagesModel } {
  const state = useMessagesState({});
  const threadKey = `${thread.conversationId}:${role}`;
  const messages = asRead(thread, role);
  const controller: DealController = {
    deal: thread.deal,
    loaded: true,
    error: "",
    pickupAvailable: true,
    pickupError: "",
    act: async (action, text, messageId = nextMessageId()) => {
      const moved = moveDeal(thread, {
        actor: role,
        action,
        text,
        now,
        messageId,
      });
      onThread(moved.thread);
      return moved.result;
    },
    actPickup: async (action, text, messageId = nextMessageId()) => {
      const moved = movePickup(thread, {
        actor: role,
        action,
        text,
        now,
        messageId,
      });
      onThread(moved.thread);
      return moved.result;
    },
  };
  const { listing } = thread;
  const model: MessagesModel = {
    kind: "demo",
    state,
    selected: thread.conversationId,
    draftKey: threadKey,
    role,
    conversationOpen: true,
    visible: true,
    now,
    rows: [],
    loading: false,
    empty: "none",
    thread: {
      image: cardImageFor(listing),
      title: listing.title,
      onOpenListing: INERT,
      onBack: INERT,
      loaded: true,
      disclosure: true,
      actions: {},
      blocked: false,
      send: {
        listingId: listing.id,
        plain: async (text) => {
          const id = nextMessageId();
          onThread(
            writeMessage(thread, {
              id,
              sender: role,
              text,
              at: now.toISOString(),
            }),
          );
          return id;
        },
      },
    },
    threadKey,
    otherName,
    product: listing,
    messages,
    events: thread.events,
    controller,
    dealEnabled: true,
    nextBuyer: undefined,
    pako: {
      thread: {
        key: threadKey,
        role,
        listing,
        messages,
        loaded: true,
        deal: threadDealSnapshot(thread.deal, role),
        cache: NO_READINGS,
      },
      canNudge: false,
      agreedWith: undefined,
    },
    offerTarget: offerRequest !== undefined,
    termsAllowed: true,
    preparedDrafts: [],
    openingDraft: undefined,
    read: { key: "", newsAt: undefined, mark: INERT },
  };
  const app: MessagesProps = {
    listingId: listing.id,
    listing,
    listings: [listing],
    onOpenListing: INERT,
    onBrowse: INERT,
    offerRequest,
    onListingStatus: async () => undefined,
    pako: {
      // Pako reads only replies written by hand; every reply in the examples comes from the deal card.
      available: "ready",
      autoRead: true,
      remaining: undefined,
      onRemaining: INERT,
      onOpenSettings: INERT,
      onFindSimilar: INERT,
    },
  };
  return { app, model };
}

/** The app's Messages screen with the example thread open. */
export default function SceneMessages(setup: SceneThreadSetup) {
  const { app, model } = useSceneThread(setup);
  return (
    <NamedOfferPriceContext value={NO_NAMED_PRICE}>
      <Messages app={app} model={model} />
    </NamedOfferPriceContext>
  );
}
