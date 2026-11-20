import { AnimatePresence } from "motion/react";
import { useEffect, useEffectEvent, useRef } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ellipsis,
  Trash2,
  X,
} from "@/components/icons";
import { NO_TERMS } from "../dealOptions";
import { attachedTermsNote } from "../dealWords";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePageVisible } from "../hooks/usePageVisible";
import { newestAt } from "../inboxDeals";
import {
  ChatPartner,
  ChatSegment,
  ChatThreadCard,
  InboxLoading,
  usePakoDrafts,
} from "./ChatParts";
import DemoPickupClock from "./DemoPickupClock";
import InboxEmpty from "./InboxEmpty";
import type { MessagesProps } from "./messagesProps";
import type { MessagesModel, OpenThread, ThreadRow } from "./messagesModel";
import Pako from "./onboarding/Pako";
import { useThreadDeal } from "./ThreadDeal";
import { useThreadPako } from "./ThreadPako";
import {
  CARD_IN_CONVERSATION,
  sendFailure,
  ThreadComposer,
  ThreadDisclosure,
  ThreadLog,
} from "./ThreadView";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";

const DEMO_ROLES = [
  ["buyer", "Buyer"],
  ["seller", "Seller"],
] as const;
const FILTERS = [
  ["all", "All"],
  ["buying", "Buying"],
  ["selling", "Selling"],
] as const;

/** The Messages screen of either mode: the inbox list, the open thread with its deal, Pako and composer. */
export default function Messages({
  app,
  model,
}: {
  app: MessagesProps;
  model: MessagesModel;
}) {
  const { state, thread, role, otherName, messages } = model;
  const { busy, error, setError } = state;
  const text = state.drafts[model.draftKey] ?? "";
  const setText = (value: string) =>
    state.setDrafts((current) => ({ ...current, [model.draftKey]: value }));
  const pakoDrafts = usePakoDrafts();
  const cardInConversation = useMediaQuery(CARD_IN_CONVERSATION);
  const assistant = useThreadPako({
    reading: app.pako,
    thread: model.pako.thread,
    otherName,
    visible: model.visible,
    text,
    onText: setText,
    canNudge: model.pako.canNudge,
    agreedWith: model.pako.agreedWith,
  });
  const threadDeal = useThreadDeal({
    threadKey: model.threadKey,
    controller: model.controller,
    role,
    otherName,
    listing: model.product,
    messages,
    events: model.events,
    turn: assistant.turn,
    enabled: model.dealEnabled,
    visible: model.visible,
    homePoint: app.homePoint,
    now: model.now,
    nextBuyer: model.nextBuyer,
    onStatusChange: app.onListingStatus,
    onWrite: setText,
  });
  useOfferRequest(app.offerRequest, model.offerTarget && threadDeal.open, () =>
    threadDeal.openOffer({ mode: "offer", terms: NO_TERMS }),
  );
  useReadMarker(model);
  /** The composer holds the offer of a released item to this thread's buyer. */
  const offeringAgain =
    state.offerAgain?.threadKey === model.selected && role === "seller"
      ? state.offerAgain
      : undefined;
  // A message the app prepared, the opening offer or a follow-up, stays labelled as Pako's until the student edits it.
  const appDraft = model.preparedDrafts.includes(text);
  /** Pako's offer of a released item to this buyer, still as he wrote it. */
  const offerAgainDraft = offeringAgain?.draft === text;
  const pakoDrafted = appDraft || offerAgainDraft || assistant.draftedByPako;
  /** Only the opening offer from the search chat carries terms. */
  const openingTerms =
    model.openingDraft !== undefined && text === model.openingDraft
      ? app.initialTerms
      : undefined;
  // Terms travel with the text from Pako's option or the opening offer while the deal can take them.
  const attached = assistant.terms ?? openingTerms ?? null;
  const termsNote =
    attached && threadDeal.open && model.termsAllowed
      ? attachedTermsNote(text, attached)
      : null;
  const withTerms = attached && termsNote?.states ? attached : null;
  /** The thread's own path for the composed text: offered again, with terms, or plain. */
  function sendComposed({ send }: OpenThread) {
    if (offeringAgain)
      return threadDeal.sendPickup(
        {
          type: "offer_again",
          releasedConversationId: offeringAgain.releasedConversationId,
        },
        text.trim(),
      );
    return withTerms
      ? threadDeal.sendTerms(withTerms, text.trim())
      : send.plain(text);
  }
  async function send(open: OpenThread) {
    const celebrates = Boolean(openingTerms) || assistant.celebrates;
    const { draftKey } = model;
    const { listingId } = open.send;
    state.setBusy(true);
    setError("");
    try {
      app.onBeforeSend?.(listingId, role);
      await open.send.prepare?.();
      const messageId = await sendComposed(open);
      if (offeringAgain) state.setOfferAgain(undefined);
      app.onSent?.(listingId, role, text.trim());
      if (pakoDrafted) pakoDrafts.remember(messageId);
      if (celebrates && !withTerms)
        threadDeal.celebrate({ kind: "sent", other: otherName });
      assistant.sent();
      state.setDrafts((items) => ({ ...items, [draftKey]: "" }));
      await open.send.after?.();
    } catch (failure) {
      setError(sendFailure(failure));
    } finally {
      state.setBusy(false);
    }
  }
  return (
    <section
      className={`messages-page ${model.kind}-messages${model.conversationOpen ? " has-conversation" : ""}`}
      aria-label="Messages page"
    >
      <PageTitle model={model} />
      <div className="seller-chat-layout">
        <nav aria-label="Conversations">
          <InboxList model={model} busy={busy} onBrowse={app.onBrowse} />
        </nav>
        <section
          className="seller-chat"
          aria-label={
            thread ? `Conversation with ${otherName}` : "Conversation"
          }
        >
          {thread ? (
            <>
              <ThreadHeader model={model} thread={thread} busy={busy} />
              {thread.banner}
              {!cardInConversation && threadDeal.card}
              <ThreadLog
                threadKey={model.threadKey}
                messages={messages}
                otherName={otherName}
                role={role}
                loaded={thread.loaded}
                error={thread.error}
                drafted={pakoDrafts.drafted}
                events={model.events}
                extras={model.messageExtras}
                disclosure={
                  thread.disclosure &&
                  app.pako.available === "ready" && (
                    <ThreadDisclosure
                      autoRead={app.pako.autoRead}
                      onOpenSettings={app.pako.onOpenSettings}
                    />
                  )
                }
                after={
                  <>
                    {cardInConversation && threadDeal.card}
                    <AnimatePresence>{threadDeal.celebration}</AnimatePresence>
                    {model.dealEnabled &&
                      !threadDeal.celebrating &&
                      assistant.tray(threadDeal.trayMoment)}
                  </>
                }
              />
              {thread.blocked && (
                <p className="inbox-blocked-note" role="status">
                  You blocked this user. Unblock them to send a message.
                </p>
              )}
              {thread.dealNote && (
                <p className="chat-note" role="status">
                  {thread.dealNote}
                </p>
              )}
              <ThreadComposer
                text={text}
                busy={busy}
                disabled={thread.blocked}
                error={error}
                pakoDrafted={pakoDrafted}
                tools={model.dealEnabled && assistant.askMenu}
                terms={termsNote}
                onTextChange={setText}
                onSend={() => void send(thread)}
              />
              {threadDeal.editor}
            </>
          ) : (
            <IdlePane kind={model.kind} />
          )}
        </section>
      </div>
      <PageAlerts model={model} />
    </section>
  );
}

/** A listing's "Draft an offer" opens the offer card in its thread, once per tap. */
function useOfferRequest(
  offerRequest: number | undefined,
  ready: boolean,
  openOffer: () => void,
) {
  const opened = useRef<number>(undefined);
  const open = useEffectEvent(openOffer);
  useEffect(() => {
    if (!offerRequest || opened.current === offerRequest || !ready) return;
    opened.current = offerRequest;
    open();
  }, [offerRequest, ready]);
}

/** Reading a thread covers the other side's newest message and news nobody wrote, such as another buyer's deal. */
function useReadMarker({ messages, read, visible }: MessagesModel) {
  const pageVisible = usePageVisible();
  const seenUpTo = newestAt([
    [...messages].reverse().find((message) => message.from === "them")?.at,
    read.newsAt,
  ]);
  const { key, mark } = read;
  useEffect(() => {
    if (visible && pageVisible && key && seenUpTo) void mark(key, seenUpTo);
  }, [visible, pageVisible, key, seenUpTo, mark]);
}

function PageTitle({ model }: { model: MessagesModel }) {
  const { archiveView } = model;
  return (
    <>
      <div
        className={archiveView ? "page-title title-with-action" : "page-title"}
      >
        <h1>Messages</h1>
        {model.kind === "demo" && (
          <p>
            Chat with buyers and sellers. Pako reads replies and drafts your
            answers.
          </p>
        )}
        {archiveView && (
          <Button className="text-button" onClick={archiveView.onToggle}>
            {archiveView.showing ? "Back to Messages" : "Archived"}
          </Button>
        )}
      </div>
      {model.caption && <p className="quiet-caption">{model.caption}</p>}
      {model.notice && (
        <p className="account-notice" role="status">
          {model.notice}
        </p>
      )}
    </>
  );
}

function InboxList({
  model,
  busy,
  onBrowse,
}: {
  model: MessagesModel;
  busy: boolean;
  onBrowse: () => void;
}) {
  const { search, rows, newRow, empty } = model;
  return (
    <>
      {model.refreshError && (
        <p className="inbox-error" role="alert">
          {model.refreshError}
        </p>
      )}
      {search && (
        <div className="inbox-controls">
          <Input
            type="search"
            placeholder="Search conversations"
            aria-label="Search conversations"
            value={search.query}
            onChange={(event) => search.onQuery(event.target.value)}
          />
          <ChatSegment
            label="Conversation filters"
            options={FILTERS}
            value={search.filter}
            onChange={search.onFilter}
          />
        </div>
      )}
      {rows.map((row, order) => (
        <ThreadCard key={row.id} row={row} order={order} busy={busy} />
      ))}
      {newRow && <ThreadCard row={newRow} order={rows.length} busy={busy} />}
      {model.loading && <InboxLoading />}
      {empty === "inbox" && <InboxEmpty onBrowse={onBrowse} />}
      {typeof empty === "object" && <p>{empty.note}</p>}
    </>
  );
}

/** A row that can be opened waits while a request is in flight. */
function ThreadCard({
  row,
  order,
  busy,
}: {
  row: ThreadRow;
  order: number;
  busy: boolean;
}) {
  return (
    <ChatThreadCard
      order={order}
      active={row.active}
      disabled={row.onSelect && busy}
      image={row.image}
      name={row.name}
      title={row.title}
      preview={row.preview}
      note={row.note}
      unread={row.unread}
      onSelect={row.onSelect}
    />
  );
}

function ThreadHeader({
  model,
  thread,
  busy,
}: {
  model: MessagesModel;
  thread: OpenThread;
  busy: boolean;
}) {
  const { rolePreview, pickupClock } = model;
  return (
    <header>
      <div className="chat-header-item">
        <Button
          className="icon-button inbox-back"
          aria-label="Back to conversations"
          onClick={thread.onBack}
        >
          <ArrowLeft size={20} />
        </Button>
        <ChatPartner
          name={model.otherName}
          image={thread.image}
          title={thread.title}
          detail={thread.detail}
          onOpenListing={thread.onOpenListing}
        />
        <ThreadActionsMenu
          thread={thread}
          otherName={model.otherName}
          busy={busy}
        />
      </div>
      {rolePreview && (
        <ChatSegment
          label="Demo role"
          options={DEMO_ROLES}
          value={model.role}
          disabled={busy}
          onChange={rolePreview}
        />
      )}
      {pickupClock && (
        <DemoPickupClock pickupAt={pickupClock} now={model.now} />
      )}
    </header>
  );
}

function ThreadActionsMenu({
  thread,
  otherName,
  busy,
}: {
  thread: OpenThread;
  otherName: string;
  busy: boolean;
}) {
  const { delete: remove, archive, block } = thread.actions;
  if (remove)
    return (
      <Button
        className="icon-button chat-delete-button"
        aria-label="Delete conversation"
        aria-disabled={remove.held || undefined}
        disabled={busy}
        onClick={remove.onDelete}
      >
        <Trash2 size={18} />
      </Button>
    );
  if (!archive && !block) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
        aria-label="Conversation options"
        disabled={busy}
      >
        <Ellipsis size={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {archive && (
          <DropdownMenuItem onClick={archive.onToggle}>
            {archive.archived ? (
              <ArchiveRestore size={16} />
            ) : (
              <Archive size={16} />
            )}
            {archive.archived ? "Restore conversation" : "Archive conversation"}
          </DropdownMenuItem>
        )}
        {archive && block && <DropdownMenuSeparator />}
        {block && (
          <DropdownMenuItem disabled={busy} onClick={block.onToggle}>
            {block.blocked ? `Unblock ${otherName}` : `Block ${otherName}`}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IdlePane({ kind }: { kind: MessagesModel["kind"] }) {
  if (kind === "demo")
    return <p className="chat-select-note">Select a conversation.</p>;
  return (
    <div className="inbox-empty">
      <Pako mood="idle" size={88} />
      <h2>Your conversations</h2>
      <p>Choose a conversation.</p>
    </div>
  );
}

function PageAlerts({ model }: { model: MessagesModel }) {
  const { undo, loadError, readError, state } = model;
  return (
    <>
      {undo && (
        <div className="chat-delete-notice" role="status">
          <span>Conversation deleted.</span>
          <Button
            className="chat-listing-link"
            disabled={state.busy}
            onClick={undo.onUndo}
          >
            Undo
          </Button>
          <Button
            className="icon-button"
            aria-label="Dismiss deletion notice"
            onClick={undo.onDismiss}
          >
            <X size={16} />
          </Button>
        </div>
      )}
      {loadError && (
        <p role="alert">
          {loadError.message}{" "}
          <Button className="text-button" onClick={loadError.onRetry}>
            Retry
          </Button>
        </p>
      )}
      {readError && <p role="alert">{readError}</p>}
      {state.error && !model.thread && <p role="alert">{state.error}</p>}
    </>
  );
}
